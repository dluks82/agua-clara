import { db } from "@/db";
import { readings, Reading } from "@/db/schema";
import { desc, gte, lte, and, lt, gt, asc } from "drizzle-orm";
import { calculateIntervals, calculateKPIs } from "@/lib/calculations";
import { detectAlerts, calculateBaseline } from "@/lib/alerts";
import { getBillingCycleDay } from "@/app/actions";

export type PeriodFilter = {
  type: "1d" | "7d" | "30d" | "custom";
  from?: Date;
  to?: Date;
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
  };
}

export async function getDashboardData(filter?: PeriodFilter) {
  try {
    let startDate: Date;
    let endDate: Date = new Date();
    
    // 1. Determine Period
    if (filter?.type && filter.type !== "custom") {
      switch (filter.type) {
        case "1d":
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    } else if (filter?.type === "custom" && filter.from && filter.to) {
      startDate = filter.from;
      endDate = filter.to;
    } else {
      // Default: Current Billing Cycle
      const cycleDay = await getBillingCycleDay();
      const now = new Date();
      const currentDay = now.getDate();
      
      let endMonth = now.getMonth();
      let endYear = now.getFullYear();
      
      // If today is AFTER the cycle day, we are in a new cycle that ends next month.
      // If today is BEFORE or EQUAL to cycle day, we are in the cycle that ends this month.
      
      // BUT, the requirement is: "Closing Day is the LAST day of the period".
      // Example: Closing=7. Today=3.
      // Cycle ends on 7th of THIS month. (Nov 08 - Dec 07).
      
      // Example: Closing=7. Today=8.
      // Cycle ends on 7th of NEXT month. (Dec 08 - Jan 07).
      
      if (currentDay > cycleDay) {
        endMonth++;
        if (endMonth > 11) {
          endMonth = 0;
          endYear++;
        }
      }
      
      // End Date = Closing Day of the calculated end month
      endDate = new Date(endYear, endMonth, cycleDay);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      // Start Date = (End Date - 1 month) + 1 day
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0); // Start of day
    }

    // 2. Fetch Readings in Range
    const readingsInRange = await db
      .select()
      .from(readings)
      .where(and(gte(readings.ts, startDate), lte(readings.ts, endDate)))
      .orderBy(asc(readings.ts)); // Ascending for easier processing

    // 3. Fetch Boundary Readings
    const readingBefore = await db.query.readings.findFirst({
      where: lt(readings.ts, startDate),
      orderBy: [desc(readings.ts)],
    });

    const readingAfter = await db.query.readings.findFirst({
      where: gt(readings.ts, endDate),
      orderBy: [asc(readings.ts)],
    });

    // 4. Construct Final List with Virtual Readings
    let finalReadings = [...readingsInRange];

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

    const intervals = calculateIntervals(finalReadings);
    const kpis = calculateKPIs(intervals);
    const baseline = calculateBaseline(intervals);
    const alerts = detectAlerts(intervals, baseline || undefined);
    
    return {
      readings: finalReadings,
      intervals,
      kpis,
      alerts,
      baseline,
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
      period: {
        from: new Date(),
        to: new Date()
      }
    };
  }
}
