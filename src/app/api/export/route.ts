import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readings } from "@/db/schema";
import { desc, and, gte, lte } from "drizzle-orm";
import { calculateIntervals, calculateKPIs } from "@/lib/calculations";
import { detectAlerts, calculateBaseline } from "@/lib/alerts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    
    const whereConditions = [];
    
    if (from) {
      whereConditions.push(gte(readings.ts, new Date(from)));
    }
    
    if (to) {
      whereConditions.push(lte(readings.ts, new Date(to)));
    }
    
    const readingsData = await db
      .select()
      .from(readings)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(readings.ts));
    
    const intervals = calculateIntervals(readingsData);
    const kpis = calculateKPIs(intervals);
    const baseline = calculateBaseline(intervals);
    const alerts = detectAlerts(intervals, baseline || undefined);
    
    // Gerar CSV
    const csvLines = [];
    
    // Cabeçalho
    csvLines.push("Data/Hora,Hidrômetro (m³),Horímetro (h),Observações");
    
    // Leituras
    readingsData.forEach(reading => {
      const date = format(new Date(reading.ts), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const hydrometer = parseFloat(reading.hydrometer_m3).toFixed(3);
      const horimeter = parseFloat(reading.horimeter_h).toFixed(3);
      const notes = reading.notes || "";
      
      csvLines.push(`"${date}","${hydrometer}","${horimeter}","${notes}"`);
    });
    
    // Separador
    csvLines.push("");
    csvLines.push("INTERVALOS E CÁLCULOS");
    csvLines.push("Início,Fim,ΔV (m³),ΔH (h),Q (m³/h),Q (L/min),Q (L/s),Confiança");
    
    // Intervalos
    intervals.forEach(interval => {
      const start = format(new Date(interval.start), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const end = format(new Date(interval.end), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const deltaV = interval.delta_v.toFixed(3);
      const deltaH = interval.delta_h.toFixed(3);
      const qM3h = interval.q_m3h ? interval.q_m3h.toFixed(3) : "N/A";
      const qLmin = interval.l_min ? interval.l_min.toFixed(1) : "N/A";
      const qLs = interval.l_s ? interval.l_s.toFixed(2) : "N/A";
      const confidence = interval.confidence;
      
      csvLines.push(`"${start}","${end}","${deltaV}","${deltaH}","${qM3h}","${qLmin}","${qLs}","${confidence}"`);
    });
    
    // Separador
    csvLines.push("");
    csvLines.push("KPIs");
    csvLines.push("Produção Total (m³),Horas Total (h),Q Média (m³/h),Q Média (L/min),Q Média (L/s),COV (%)");
    
    const producao = kpis.producao_total_m3.toFixed(3);
    const horas = kpis.horas_total_h.toFixed(3);
    const qAvgM3h = kpis.q_avg_m3h ? kpis.q_avg_m3h.toFixed(3) : "N/A";
    const qAvgLmin = kpis.q_avg_lmin ? kpis.q_avg_lmin.toFixed(1) : "N/A";
    const qAvgLs = kpis.q_avg_ls ? kpis.q_avg_ls.toFixed(2) : "N/A";
    const cov = kpis.cov_q_pct ? kpis.cov_q_pct.toFixed(1) : "N/A";
    
    csvLines.push(`"${producao}","${horas}","${qAvgM3h}","${qAvgLmin}","${qAvgLs}","${cov}"`);
    
    // Alertas
    if (alerts.length > 0) {
      csvLines.push("");
      csvLines.push("ALERTAS");
      csvLines.push("Tipo,Severidade,Mensagem");
      
      alerts.forEach(alert => {
        csvLines.push(`"${alert.type}","${alert.severity}","${alert.message}"`);
      });
    }
    
    const csvContent = csvLines.join("\n");
    
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
