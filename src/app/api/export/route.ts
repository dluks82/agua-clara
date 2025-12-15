import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readings } from "@/db/schema";
import { and, desc, eq, gte, lte, lt, gt, asc } from "drizzle-orm";
import { calculateIntervals, calculateKPIs } from "@/lib/calculations";
import { detectAlerts, calculateBaseline } from "@/lib/alerts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireTenantRole } from "@/lib/api-rbac";
import { getDashboardData } from "@/lib/data";

export async function GET(request: NextRequest) {
  const ctx = await requireTenantRole(request, "viewer");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    
    const hasExplicitPeriod = Boolean(from && to);

    const period = await (async () => {
      if (!hasExplicitPeriod) return null;
      const fromDate = new Date(from!);
      const toDate = new Date(to!);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) return null;
      return { from: fromDate, to: toDate } as const;
    })();

    const dashboardData = period ? await getDashboardData(ctx.tenantId, period) : null;

    const readingsData = dashboardData
      ? dashboardData.readings
      : await (async () => {
          const whereConditions = [eq(readings.tenant_id, ctx.tenantId)];
          if (from) whereConditions.push(gte(readings.ts, new Date(from)));
          if (to) whereConditions.push(lte(readings.ts, new Date(to)));
          return db.select().from(readings).where(and(...whereConditions)).orderBy(desc(readings.ts));
        })();

    const intervals = dashboardData ? dashboardData.intervals : calculateIntervals(readingsData);
    const kpis = dashboardData ? dashboardData.kpis : calculateKPIs(intervals);
    const baselineAsOf = to ? new Date(to) : new Date();
    const baseline = dashboardData ? dashboardData.baseline : calculateBaseline(intervals, 7, undefined, baselineAsOf);
    const alerts = dashboardData ? dashboardData.alerts : detectAlerts(intervals, baseline || undefined);
    
    // Gerar CSV
    const csvLines = [];

    const csvCell = (raw: unknown) => {
      const value = raw === null || raw === undefined ? "" : String(raw);
      return `"${value.replaceAll('"', '""')}"`;
    };
    const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
    const formatPtBrDateTime = (date: Date) => {
      try {
        return new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        }).format(date);
      } catch {
        return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
      }
    };

    if (period) {
      csvLines.push(csvRow(["PERÍODO", formatPtBrDateTime(period.from), formatPtBrDateTime(period.to)]));
      csvLines.push(csvRow(["GERADO_EM", formatPtBrDateTime(new Date())]));
      csvLines.push(
        csvRow([
          "OBS",
          "KPIs e intervalos incluem pró-rata quando não há leitura exatamente no início/fim do período.",
        ])
      );
      csvLines.push("");
    }

    const realReadings = dashboardData
      ? dashboardData.readings.filter((r) => r.id !== -1).sort((a, b) => a.ts.getTime() - b.ts.getTime())
      : readingsData.slice().sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

    csvLines.push("LEITURAS (REAIS)");
    csvLines.push("Data/Hora,Hidrômetro (m³),Horímetro (h),Tipo Hid.,Tipo Hor.,Observações");
    realReadings.forEach((reading) => {
      const ts = reading.ts instanceof Date ? reading.ts : new Date(reading.ts);
      const notes = reading.notes ?? "";
      csvLines.push(
        csvRow([
          formatPtBrDateTime(ts),
          Number.parseFloat(String(reading.hydrometer_m3)).toFixed(3),
          Number.parseFloat(String(reading.horimeter_h)).toFixed(3),
          reading.hydrometer_status ?? "regular",
          reading.horimeter_status ?? "regular",
          notes,
        ])
      );
    });

    if (dashboardData) {
      const virtualReadings = dashboardData.readings.filter((r) => r.id === -1);
      if (virtualReadings.length > 0) {
        const beforeFrom = period
          ? await db
              .select({ ts: readings.ts })
              .from(readings)
              .where(and(eq(readings.tenant_id, ctx.tenantId), lt(readings.ts, period.from)))
              .orderBy(desc(readings.ts))
              .limit(1)
          : [];
        const afterFrom = period
          ? await db
              .select({ ts: readings.ts })
              .from(readings)
              .where(and(eq(readings.tenant_id, ctx.tenantId), gt(readings.ts, period.from)))
              .orderBy(asc(readings.ts))
              .limit(1)
          : [];

        const beforeTo = period
          ? await db
              .select({ ts: readings.ts })
              .from(readings)
              .where(and(eq(readings.tenant_id, ctx.tenantId), lt(readings.ts, period.to)))
              .orderBy(desc(readings.ts))
              .limit(1)
          : [];
        const afterTo = period
          ? await db
              .select({ ts: readings.ts })
              .from(readings)
              .where(and(eq(readings.tenant_id, ctx.tenantId), gt(readings.ts, period.to)))
              .orderBy(asc(readings.ts))
              .limit(1)
          : [];

        csvLines.push("");
        csvLines.push("LEITURAS VIRTUAIS (PRÓ-RATA)");
        csvLines.push("Data/Hora,Hidrômetro (m³),Horímetro (h),Motivo,Base (antes),Base (depois)");

        virtualReadings
          .slice()
          .sort((a, b) => a.ts.getTime() - b.ts.getTime())
          .forEach((reading) => {
            const ts = reading.ts;
            const isStart = period && ts.getTime() === period.from.getTime();
            const isEnd = period && ts.getTime() === period.to.getTime();
            const motivo = isStart ? "Início do período" : isEnd ? "Fim do período" : "Pró-rata";
            const baseBefore = isStart ? beforeFrom[0]?.ts ?? null : isEnd ? beforeTo[0]?.ts ?? null : null;
            const baseAfter = isStart ? afterFrom[0]?.ts ?? null : isEnd ? afterTo[0]?.ts ?? null : null;

            csvLines.push(
              csvRow([
                formatPtBrDateTime(ts),
                Number.parseFloat(String(reading.hydrometer_m3)).toFixed(3),
                Number.parseFloat(String(reading.horimeter_h)).toFixed(3),
                motivo,
                baseBefore ? formatPtBrDateTime(baseBefore) : "",
                baseAfter ? formatPtBrDateTime(baseAfter) : "",
              ])
            );
          });
      }
    }
    
    // Separador
    csvLines.push("");
    csvLines.push("INTERVALOS E CÁLCULOS");
    csvLines.push("Início,Fim,ΔV (m³),ΔH (h),Q (m³/h),Q (L/min),Q (L/s),Confiança,Fonte");

    const virtualTimestamps = new Set<number>(
      dashboardData ? dashboardData.readings.filter((r) => r.id === -1).map((r) => r.ts.getTime()) : []
    );
    
    // Intervalos
    intervals.forEach(interval => {
      const startDate = new Date(interval.start);
      const endDate = new Date(interval.end);
      const start = formatPtBrDateTime(startDate);
      const end = formatPtBrDateTime(endDate);
      const deltaV = interval.delta_v.toFixed(3);
      const deltaH = interval.delta_h.toFixed(3);
      const qM3h = interval.q_m3h ? interval.q_m3h.toFixed(3) : "N/A";
      const qLmin = interval.l_min ? interval.l_min.toFixed(1) : "N/A";
      const qLs = interval.l_s ? interval.l_s.toFixed(2) : "N/A";
      const confidence = interval.confidence;
      const fonte = virtualTimestamps.has(startDate.getTime()) || virtualTimestamps.has(endDate.getTime()) ? "pró-rata" : "real";
      
      csvLines.push(csvRow([start, end, deltaV, deltaH, qM3h, qLmin, qLs, confidence, fonte]));
    });
    
    // Separador
    csvLines.push("");
    csvLines.push("KPIs");
    csvLines.push("Métrica,Valor");
    csvLines.push(csvRow(["Produção Total (m³)", kpis.producao_total_m3.toFixed(3)]));
    csvLines.push(csvRow(["Horas Total (h)", kpis.horas_total_h.toFixed(3)]));
    csvLines.push(csvRow(["Q Média (m³/h)", kpis.q_avg_m3h ? kpis.q_avg_m3h.toFixed(3) : "N/A"]));
    csvLines.push(csvRow(["Q Média (L/min)", kpis.q_avg_lmin ? kpis.q_avg_lmin.toFixed(1) : "N/A"]));
    csvLines.push(csvRow(["Q Média (L/s)", kpis.q_avg_ls ? kpis.q_avg_ls.toFixed(2) : "N/A"]));
    csvLines.push(csvRow(["COV (%)", kpis.cov_q_pct ? kpis.cov_q_pct.toFixed(1) : "N/A"]));
    csvLines.push(
      csvRow(["Utilização (%)", kpis.utilization_rate_pct ? kpis.utilization_rate_pct.toFixed(1) : "N/A"])
    );
    
    // Alertas
    if (alerts.length > 0) {
      csvLines.push("");
      csvLines.push("ALERTAS");
      csvLines.push("Tipo,Severidade,Mensagem");
      
      alerts.forEach(alert => {
        csvLines.push(`"${alert.type}","${alert.severity}","${alert.message}"`);
      });
    }
    
    // Excel (pt-BR) friendly: BOM for UTF-8 + CRLF line endings + explicit separator
    csvLines.unshift("sep=,");
    const csvContent = `\uFEFF${csvLines.join("\r\n")}`;
    
    const filename = `agua-clara-export-${format(new Date(), "yyyy-MM-dd-HH-mm", { locale: ptBR })}.csv`;
    
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
