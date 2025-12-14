import { Reading } from "@/db/schema";
import { Interval, KPIs } from "@/lib/validations/intervals";

function calculateDelta(
  prevVal: number,
  currVal: number,
  status: string,
  finalOld?: string | null,
  initialNew?: string | null
): number {
  if (status === "exchange") {
    const valFinalOld = finalOld ? parseFloat(finalOld) : prevVal;
    const valInitialNew = initialNew ? parseFloat(initialNew) : currVal;
    
    // Delta = (Final Old - Prev) + (Curr - Initial New)
    const deltaOld = valFinalOld - prevVal;
    const deltaNew = currVal - valInitialNew;
    
    return Math.max(0, deltaOld + deltaNew);
  }

  if (status === "rollover") {
    // Heuristic: Estimate meter max value based on number of digits of previous reading
    // e.g., 998 -> 3 digits -> Max 1000
    // e.g., 9995 -> 4 digits -> Max 10000
    if (prevVal <= 0) return Math.max(0, currVal - prevVal); // Fallback
    
    const digits = Math.floor(Math.log10(prevVal)) + 1;
    const magnitude = Math.pow(10, digits);
    
    // If the calculated magnitude is exactly prevVal (e.g. 100), bump to next power
    // But usually prevVal < magnitude (99 < 100).
    
    return Math.max(0, (currVal + magnitude) - prevVal);
  }

  // Regular
  return Math.max(0, currVal - prevVal);
}

export function calculateIntervals(readings: Reading[]): Interval[] {
  if (readings.length < 2) return [];

  // Ordenar leituras por data crescente (mais antiga primeiro)
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  const intervals: Interval[] = [];
  
  for (let i = 1; i < sortedReadings.length; i++) {
    const prev = sortedReadings[i - 1];
    const curr = sortedReadings[i];
    
    const delta_v = calculateDelta(
      parseFloat(prev.hydrometer_m3),
      parseFloat(curr.hydrometer_m3),
      curr.hydrometer_status,
      curr.hydrometer_final_old,
      curr.hydrometer_initial_new
    );

    const delta_h = calculateDelta(
      parseFloat(prev.horimeter_h),
      parseFloat(curr.horimeter_h),
      curr.horimeter_status,
      curr.horimeter_final_old,
      curr.horimeter_initial_new
    );
    
    let q_m3h: number | null = null;
    let l_min: number | null = null;
    let l_s: number | null = null;
    
    if (delta_h > 0 && delta_v >= 0) {
      q_m3h = delta_v / delta_h;
      l_min = q_m3h * 1000 / 60;
      l_s = q_m3h * 1000 / 3600;
    }
    
    const confidence = delta_h < 1 ? "BAIXA" : "ALTA";
    
    intervals.push({
      start: prev.ts.toISOString(),
      end: curr.ts.toISOString(),
      delta_v,
      delta_h,
      q_m3h,
      l_min,
      l_s,
      confidence,
    });
  }
  
  return intervals;
}

export function calculateKPIs(intervals: Interval[]): KPIs {
  if (intervals.length === 0) {
    return {
      producao_total_m3: 0,
      horas_total_h: 0,
      q_avg_m3h: null,
      q_avg_lmin: null,
      q_avg_ls: null,
      cov_q_pct: null,
      utilization_rate_pct: null,
    };
  }

  const validIntervals = intervals.filter(i => i.q_m3h !== null);
  const producao_total_m3 = intervals.reduce((sum, i) => sum + i.delta_v, 0);
  const horas_total_h = intervals.reduce((sum, i) => sum + i.delta_h, 0);
  
  let q_avg_m3h: number | null = null;
  let q_avg_lmin: number | null = null;
  let q_avg_ls: number | null = null;
  let cov_q_pct: number | null = null;
  let utilization_rate_pct: number | null = null;
  
  if (validIntervals.length > 0) {
    // Weighted Average Flow: Total Volume / Total Operating Hours
    if (horas_total_h > 0) {
      q_avg_m3h = producao_total_m3 / horas_total_h;
      q_avg_lmin = q_avg_m3h * 1000 / 60;
      q_avg_ls = q_avg_m3h * 1000 / 3600;
    }

    // COV Calculation (remains based on individual interval flows to measure stability)
    const qValues = validIntervals.map(i => i.q_m3h!);
    const q_avg_arithmetic = qValues.reduce((sum, q) => sum + q, 0) / qValues.length;
    
    if (qValues.length > 1) {
      const variance = qValues.reduce((sum, q) => sum + Math.pow(q - q_avg_arithmetic, 2), 0) / qValues.length;
      const stdDev = Math.sqrt(variance);
      // Use arithmetic average for COV normalization as it relates to the variance of samples
      cov_q_pct = (stdDev / q_avg_arithmetic) * 100;
    }

    // Utilization Rate: Total Operating Hours / Total Elapsed Time
    const startTimes = validIntervals.map(i => new Date(i.start).getTime());
    const endTimes = validIntervals.map(i => new Date(i.end).getTime());
    const minStart = Math.min(...startTimes);
    const maxEnd = Math.max(...endTimes);
    const totalElapsedHours = (maxEnd - minStart) / (1000 * 60 * 60);

    if (totalElapsedHours > 0) {
      utilization_rate_pct = (horas_total_h / totalElapsedHours) * 100;
    }
  }
  
  return {
    producao_total_m3,
    horas_total_h,
    q_avg_m3h,
    q_avg_lmin,
    q_avg_ls,
    cov_q_pct,
    utilization_rate_pct,
  };
}
