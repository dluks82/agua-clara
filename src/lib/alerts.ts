import { Interval, Alert } from "@/lib/validations/intervals";

export function detectAlerts(intervals: Interval[], baseline?: number, settings?: Record<string, string>, asOf?: Date): Alert[] {
  const alerts: Alert[] = [];
  
  // Verificar se alertas estão habilitados
  if (settings?.alert_enabled === "false") return alerts;
  
  // Obter limiares das configurações
  const flowDropThreshold = parseFloat(settings?.alert_flow_drop_threshold || "10");
  const covThreshold = parseFloat(settings?.alert_cov_threshold || "15");
  const overloadThreshold = parseFloat(settings?.alert_overload_threshold || "30");
  
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
  
  // Detectar oscilação alta (COV ponderado > threshold%)
  // Consistente com calculateKPIs: usa média ponderada e variância ponderada por delta_h
  const validIntervals = intervals.filter(i => i.q_m3h !== null && i.delta_h > 0);
  if (validIntervals.length > 1) {
    const totalH = validIntervals.reduce((sum, i) => sum + i.delta_h, 0);
    const q_avg_weighted = totalH > 0
      ? validIntervals.reduce((sum, i) => sum + i.delta_v, 0) / totalH
      : 0;

    if (q_avg_weighted > 0) {
      const weightedVariance = validIntervals.reduce((sum, i) => {
        const weight = i.delta_h / totalH;
        return sum + weight * Math.pow(i.q_m3h! - q_avg_weighted, 2);
      }, 0);
      const stdDev = Math.sqrt(weightedVariance);
      const cov_q_pct = (stdDev / q_avg_weighted) * 100;

      if (cov_q_pct > covThreshold) {
        alerts.push({
          type: "oscilacao_alta",
          message: `Oscilação alta detectada: COV = ${cov_q_pct.toFixed(1)}% > ${covThreshold}%`,
          severity: "medium",
        });
      }
    }
  }
  
  // Detectar inconsistências de dados (deduplica: máximo 1 alerta por tipo)
  let zeroHCount = 0;
  let negativeVCount = 0;
  for (const interval of intervals) {
    if (interval.delta_h === 0 && interval.delta_v > 0) zeroHCount++;
    if (interval.delta_v < 0) negativeVCount++;
  }
  if (zeroHCount > 0) {
    alerts.push({
      type: "inconsistencia_dados",
      message: `Inconsistência: ΔH = 0 com ΔV > 0 em ${zeroHCount} intervalo(s). Verifique as leituras.`,
      severity: "high",
    });
  }
  if (negativeVCount > 0) {
    alerts.push({
      type: "inconsistencia_dados",
      message: `Inconsistência: ΔV < 0 em ${negativeVCount} intervalo(s). Hidrômetro regrediu — verifique digitação ou troca de medidor.`,
      severity: "high",
    });
  }

  // Detectar sobrecarga contínua de motor (Opção B - Aumento em relação ao histórico recente)
  // calculateIntervals() retorna em ordem cronológica crescente (mais antigo primeiro),
  // então os mais recentes estão no final do array.
  if (validIntervals.length >= 4) {
    const recent = validIntervals.slice(-2); // 2 intervalos mais recentes (final do array)
    const olderEnd = validIntervals.length - 2;
    const olderStart = Math.max(0, olderEnd - 4);
    const older = validIntervals.slice(olderStart, olderEnd); // Até 4 intervalos anteriores
    
    const getAvgHoursPerDay = (ints: Interval[]) => {
      let totalH = 0;
      let totalDays = 0;
      for (const i of ints) {
        if (i.delta_h <= 0) continue;
        totalH += i.delta_h;
        const days = (new Date(i.end).getTime() - new Date(i.start).getTime()) / (1000 * 60 * 60 * 24);
        if (days > 0) totalDays += days;
      }
      return totalDays > 0 ? totalH / totalDays : 0;
    };
    
    const recentHpd = getAvgHoursPerDay(recent);
    const olderHpd = getAvgHoursPerDay(older);
    const minHoursThresholdToAlert = 4; // Só alerta se estiver rodando mais de 4h/dia no total, pra evitar falsos positivos
    
    if (olderHpd > 0 && recentHpd > minHoursThresholdToAlert && recentHpd > (olderHpd * (1 + overloadThreshold / 100))) {
      alerts.push({
        type: "sobrecarga_motor",
        message: `Bomba rodando ${recentHpd.toFixed(1)} h/dia recentemente, um aumento de ${(((recentHpd / olderHpd) - 1) * 100).toFixed(0)}% acima da sua média anterior (${olderHpd.toFixed(1)} h/dia). Verifique queda de eficiência.`,
        severity: "high",
      });
    }
  }
  
  // Detectar gap de leituras — ausência de dados é tão crítica quanto dados ruins
  // Uses ONLY the data within the period — no dependency on new Date().
  // This is critical because results may be cached (unstable_cache).
  const gapDays = parseInt(settings?.alert_gap_days || "7");
  if (intervals.length > 0 && asOf) {
    // Check gap between last interval's end and the period's end date (asOf).
    // This catches "no readings at the tail end of the period".
    const lastIntervalEnd = new Date(intervals[intervals.length - 1].end);
    const daysSinceLastReading = (asOf.getTime() - lastIntervalEnd.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastReading > gapDays) {
      alerts.push({
        type: "gap_leitura",
        message: `Última leitura do período há ${Math.floor(daysSinceLastReading)} dias do fim do ciclo. O limiar configurado é de ${gapDays} dias.`,
        severity: daysSinceLastReading > gapDays * 2 ? "high" : "medium",
      });
    }

    // Check gaps between consecutive intervals within the period.
    for (let i = 1; i < intervals.length; i++) {
      const prevEnd = new Date(intervals[i - 1].end);
      const currStart = new Date(intervals[i].start);
      const gapBetween = (currStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24);

      if (gapBetween > gapDays) {
        alerts.push({
          type: "gap_leitura",
          message: `Gap de ${Math.floor(gapBetween)} dias entre leituras (${prevEnd.toLocaleDateString("pt-BR")} → ${currStart.toLocaleDateString("pt-BR")}).`,
          severity: "medium",
        });
        break; // Um alerta é suficiente para sinalizar
      }
    }
  }

  return alerts;
}

export function calculateBaseline(
  intervals: Interval[],
  days: number = 30,
  settings?: Record<string, string>,
  asOf: Date = new Date()
): number | null {
  // Usar configurações se disponíveis
  // Default: 30 dias para capturar ~6-10 intervalos com leituras a cada 3-5 dias
  const baselineDays = parseInt(settings?.baseline_days || String(days));
  const minIntervals = parseInt(settings?.baseline_min_intervals || "3");
  
  const validIntervals = intervals.filter(i => i.q_m3h !== null && i.confidence === "ALTA");
  
  if (validIntervals.length === 0) return null;
  
  // Pegar os últimos N dias de intervalos válidos
  const cutoffDate = new Date(asOf);
  cutoffDate.setDate(cutoffDate.getDate() - baselineDays);
  
  const recentIntervals = validIntervals.filter(i => 
    new Date(i.start) >= cutoffDate
  );
  
  if (recentIntervals.length < minIntervals) return null;

  // Weighted baseline: total volume / total hours (consistent with q_avg_m3h)
  const totalV = recentIntervals.reduce((sum, i) => sum + i.delta_v, 0);
  const totalH = recentIntervals.reduce((sum, i) => sum + i.delta_h, 0);
  return totalH > 0 ? totalV / totalH : null;
}
