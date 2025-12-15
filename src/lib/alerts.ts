import { Interval, Alert } from "@/lib/validations/intervals";

export function detectAlerts(intervals: Interval[], baseline?: number, settings?: Record<string, string>): Alert[] {
  const alerts: Alert[] = [];
  
  // Verificar se alertas estão habilitados
  if (settings?.alert_enabled === "false") return alerts;
  
  // Obter limiares das configurações
  const flowDropThreshold = parseFloat(settings?.alert_flow_drop_threshold || "10");
  const covThreshold = parseFloat(settings?.alert_cov_threshold || "15");
  
  // Detectar queda de vazão (≥2 intervalos seguidos com Q < threshold% do baseline)
  if (baseline && intervals.length >= 2) {
    const threshold = baseline * (1 - flowDropThreshold / 100);
    let consecutiveLow = 0;
    
    for (const interval of intervals) {
      if (interval.q_m3h !== null && interval.q_m3h < threshold) {
        consecutiveLow++;
      } else {
        consecutiveLow = 0;
      }
      
      if (consecutiveLow >= 2) {
        alerts.push({
          type: "queda_vazao",
          message: `Queda de vazão detectada: ${interval.q_m3h?.toFixed(2)} m³/h < ${flowDropThreshold}% do baseline (${baseline.toFixed(2)} m³/h)`,
          severity: "high",
        });
        break; // Evitar alertas duplicados
      }
    }
  }
  
  // Detectar oscilação alta (COV > threshold%)
  const validIntervals = intervals.filter(i => i.q_m3h !== null);
  if (validIntervals.length > 1) {
    const qValues = validIntervals.map(i => i.q_m3h!);
    const q_avg = qValues.reduce((sum, q) => sum + q, 0) / qValues.length;
    const variance = qValues.reduce((sum, q) => sum + Math.pow(q - q_avg, 2), 0) / qValues.length;
    const stdDev = Math.sqrt(variance);
    const cov_q_pct = (stdDev / q_avg) * 100;
    
    if (cov_q_pct > covThreshold) {
      alerts.push({
        type: "oscilacao_alta",
        message: `Oscilação alta detectada: COV = ${cov_q_pct.toFixed(1)}% > ${covThreshold}%`,
        severity: "medium",
      });
    }
  }
  
  // Detectar inconsistências de dados
  for (const interval of intervals) {
    if (interval.delta_h === 0 && interval.delta_v > 0) {
      alerts.push({
        type: "inconsistencia_dados",
        message: "Inconsistência: ΔH = 0 com ΔV > 0. Verifique as leituras.",
        severity: "high",
      });
    }
    
    if (interval.delta_v < 0) {
      alerts.push({
        type: "inconsistencia_dados",
        message: "Inconsistência: ΔV < 0. Hidrômetro regrediu - verifique digitação ou troca de medidor.",
        severity: "high",
      });
    }
  }
  
  return alerts;
}

export function calculateBaseline(
  intervals: Interval[],
  days: number = 7,
  settings?: Record<string, string>,
  asOf: Date = new Date()
): number | null {
  // Usar configurações se disponíveis
  const baselineDays = parseInt(settings?.baseline_days || String(days));
  const minIntervals = parseInt(settings?.baseline_min_intervals || "5");
  
  const validIntervals = intervals.filter(i => i.q_m3h !== null && i.confidence === "ALTA");
  
  if (validIntervals.length === 0) return null;
  
  // Pegar os últimos N dias de intervalos válidos
  const cutoffDate = new Date(asOf);
  cutoffDate.setDate(cutoffDate.getDate() - baselineDays);
  
  const recentIntervals = validIntervals.filter(i => 
    new Date(i.start) >= cutoffDate
  );
  
  if (recentIntervals.length < minIntervals) return null;
  
  const qValues = recentIntervals.map(i => i.q_m3h!);
  return qValues.reduce((sum, q) => sum + q, 0) / qValues.length;
}
