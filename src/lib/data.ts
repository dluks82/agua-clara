import { db } from "@/db";
import { readings, settings, Reading } from "@/db/schema";
import { sql, desc, gte, lte, and, lt, gt, eq } from "drizzle-orm";
import { calculateIntervals, calculateKPIs } from "@/lib/calculations";
import { detectAlerts, calculateBaseline } from "@/lib/alerts";
import { calculateDataQuality } from "@/lib/data-quality";

export type PeriodFilter = {
  type: "1d" | "7d" | "30d" | "custom";
  from?: Date;
  to?: Date;
};

export type DashboardPeriod = {
  from: Date;
  to: Date;
};

function interpolateReading(targetDate: Date, prev: Reading, next: Reading): Reading {
  const prevTime = prev.ts.getTime();
  const nextTime = next.ts.getTime();
  const targetTime = targetDate.getTime();
  
  const fraction = (targetTime - prevTime) / (nextTime - prevTime);
  
  const hydrometer_m3 = parseFloat(prev.hydrometer_m3) + (parseFloat(next.hydrometer_m3) - parseFloat(prev.hydrometer_m3)) * fraction;
  const horimeter_h = parseFloat(prev.horimeter_h) + (parseFloat(next.horimeter_h) - parseFloat(prev.horimeter_h)) * fraction;
  
  return {
    ...prev,
    id: -1, // Virtual ID
    ts: targetDate,
    hydrometer_m3: hydrometer_m3.toFixed(3),
    horimeter_h: horimeter_h.toFixed(3),
    notes: "Leitura Virtual (Pro-Rata)",
    hydrometer_status: "regular",
    horimeter_status: "regular",
    hydrometer_final_old: null,
    hydrometer_initial_new: null,
    horimeter_final_old: null,
    horimeter_initial_new: null,
  };
}

export function resolveDashboardPeriod({
  searchFrom,
  searchTo,
  billingCycleDay,
  now = new Date(),
}: {
  searchFrom?: string;
  searchTo?: string;
  billingCycleDay: number;
  now?: Date;
}): DashboardPeriod {
  if (searchFrom && searchTo) {
    const from = new Date(searchFrom);
    const to = new Date(searchTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return { from, to };
    }
  }

  return billingCycleRange(now, billingCycleDay);
}

export function billingCycleRange(now: Date, cycleDay: number): DashboardPeriod {
  // Ajusta o 'now' para o tempo local BRT (-3h ou -10800000ms) para extração correta dos dias
  const brtTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  const currentDay = brtTime.getUTCDate();
  let endMonth = brtTime.getUTCMonth();
  let endYear = brtTime.getUTCFullYear();

  // Avança o mês de fechamento se já passamos do dia
  if (currentDay > cycleDay) {
    endMonth++;
    if (endMonth > 11) {
      endMonth = 0;
      endYear++;
    }
  }

  // Define os limites exatamente em BRT (adicionando +3 horas para compensar UTC)
  // Fim: dia do ciclo, 23:59:59 BRT == dia do ciclo, 26:59:59 UTC (vaza pro dia seguinte)
  const endDate = new Date(Date.UTC(endYear, endMonth, cycleDay, 23 + 3, 59, 59, 999));
  
  // Início: mês anterior, dia do ciclo + 1, 00:00:00 BRT == 03:00:00 UTC
  const startDate = new Date(Date.UTC(endYear, endMonth - 1, cycleDay + 1, 3, 0, 0, 0));

  return { from: startDate, to: endDate };
}

export async function getDashboardData(tenantId: string, period: DashboardPeriod) {
  try {
    const startDate = period.from;
    const endDate = period.to;

    const readingColumns = [
      readings.id,
      readings.tenant_id,
      readings.ts,
      readings.hydrometer_m3,
      readings.horimeter_h,
      readings.notes,
      readings.hydrometer_status,
      readings.horimeter_status,
      readings.hydrometer_final_old,
      readings.hydrometer_initial_new,
      readings.horimeter_final_old,
      readings.horimeter_initial_new,
    ];

    // 2. Fetch Readings + Boundaries (single query)
    const readingsQuery = await db.execute(sql`
      (
        select ${sql.join(readingColumns, sql`, `)}
        from ${readings}
        where ${and(eq(readings.tenant_id, tenantId), gte(readings.ts, startDate), lte(readings.ts, endDate))}
      )
      union all
      (
        select ${sql.join(readingColumns, sql`, `)}
        from ${readings}
        where ${and(eq(readings.tenant_id, tenantId), lt(readings.ts, startDate))}
        order by ${desc(readings.ts)}
        limit 1
      )
      union all
      (
        select ${sql.join(readingColumns, sql`, `)}
        from ${readings}
        where ${and(eq(readings.tenant_id, tenantId), gt(readings.ts, endDate))}
        order by ${readings.ts} asc
        limit 1
      )
      order by ts asc
    `);

    type DbReadingRow = Omit<Reading, "ts"> & { ts: Date | string };
    const allReadings = (readingsQuery as unknown as DbReadingRow[]).map((row) => ({
      ...row,
      ts: row.ts instanceof Date ? row.ts : new Date(row.ts),
    })) as Reading[];
    const readingsInRange = allReadings.filter((r) => r.ts >= startDate && r.ts <= endDate);
    const readingBefore = allReadings.find((r) => r.ts < startDate);
    const readingAfter = allReadings.find((r) => r.ts > endDate);

    // 4. Construct Final List with Virtual Readings
    const finalReadings = [...readingsInRange];

    // Add Virtual Start if needed
    if (readingBefore) {
      // If we have a reading in range, interpolate between 'before' and 'first in range'
      // If no reading in range, interpolate between 'before' and 'after' (if exists)
      const nextForStart = readingsInRange.length > 0 ? readingsInRange[0] : readingAfter;
      
      if (nextForStart) {
        const virtualStart = interpolateReading(startDate, readingBefore, nextForStart);
        finalReadings.unshift(virtualStart);
      }
    }

    // Add Virtual End if needed
    if (readingAfter) {
      // If we have a reading in range, interpolate between 'last in range' and 'after'
      // If no reading in range, interpolate between 'before' and 'after' (handled above, but we need the end point too)
      
      const prevForEnd = readingsInRange.length > 0 ? readingsInRange[readingsInRange.length - 1] : (finalReadings.length > 0 ? finalReadings[0] : readingBefore);
      
      if (prevForEnd && prevForEnd.ts.getTime() < endDate.getTime()) {
         // Ensure we don't duplicate if virtual start == virtual end (empty range case)
         const virtualEnd = interpolateReading(endDate, prevForEnd, readingAfter);
         finalReadings.push(virtualEnd);
      }
    }
    
    // Sort descending for UI/Calculations as expected by other functions
    finalReadings.sort((a, b) => b.ts.getTime() - a.ts.getTime());

    const settingsData = await db
      .select()
      .from(settings)
      .where(eq(settings.tenant_id, tenantId));
    const settingsObject = settingsData.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    const intervals = calculateIntervals(finalReadings);
    const kpis = calculateKPIs(intervals);
    const baseline = calculateBaseline(intervals, 30, settingsObject, endDate);
    // For gap alerts, use the effective reference date:
    // - Current period: min(endDate, now) — don't compare against a future date
    // - Past period: endDate — the period is closed
    const now = new Date();
    const alertsAsOf = endDate > now ? now : endDate;
    const alerts = detectAlerts(intervals, baseline || undefined, settingsObject, alertsAsOf);
    const dataQuality = calculateDataQuality(intervals, startDate, endDate, parseInt(settingsObject.alert_gap_days || "7"));

    return {
      readings: finalReadings,
      intervals,
      kpis,
      alerts,
      baseline,
      dataQuality,
      period: {
        from: startDate,
        to: endDate
      }
    };
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return {
      readings: [],
      intervals: [],
      kpis: {
        producao_total_m3: 0,
        horas_total_h: 0,
        q_avg_m3h: null,
        q_avg_lmin: null,
        q_avg_ls: null,
        cov_q_pct: null,
        utilization_rate_pct: null,
      },
      alerts: [],
      baseline: null,
      dataQuality: null,
      period: {
        from: new Date(),
        to: new Date()
      }
    };
  }
}
