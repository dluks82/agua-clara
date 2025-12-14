import { Reading } from "@/db/schema";

export interface CalibrationData {
  weekdayAverage: number;
  weekendAverage: number;
  monthlyPattern: number[];
  confidence: 'low' | 'medium' | 'high';
  totalReadings: number;
  dailyReadingsCount: number;
  recommendedDays: number;
}

export function calculateCalibration(readings: Reading[]): CalibrationData | null {
  if (readings.length < 2) return null;

  // Ordenar leituras por data
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  // Analisar leituras diárias dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentReadings = sortedReadings.filter(r => 
    new Date(r.ts) >= thirtyDaysAgo
  );

  if (recentReadings.length < 2) return null;

  // Calcular intervalos diários
  const dailyProduction: Record<string, number> = {};
  
  for (let i = 1; i < recentReadings.length; i++) {
    const prev = recentReadings[i - 1];
    const curr = recentReadings[i];
    
    const dateKey = new Date(curr.ts).toISOString().split('T')[0];
    const delta_v = parseFloat(curr.hydrometer_m3) - parseFloat(prev.hydrometer_m3);
    
    // Verificar se é leitura diária (mesmo horário aproximado)
    const timeDiff = Math.abs(
      new Date(curr.ts).getHours() - new Date(prev.ts).getHours()
    );
    
    if (timeDiff <= 2) { // Tolerância de 2 horas
      dailyProduction[dateKey] = delta_v;
    }
  }

  const dailyValues = Object.values(dailyProduction);
  const dailyReadingsCount = dailyValues.length;

  if (dailyReadingsCount === 0) return null;

  // Separar dias úteis vs. finais de semana
  const weekdayValues: number[] = [];
  const weekendValues: number[] = [];

  Object.entries(dailyProduction).forEach(([dateKey, production]) => {
    const date = new Date(dateKey);
    const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendValues.push(production);
    } else {
      weekdayValues.push(production);
    }
  });

  // Calcular médias
  const weekdayAverage = weekdayValues.length > 0 
    ? weekdayValues.reduce((sum, val) => sum + val, 0) / weekdayValues.length 
    : 0;
  
  const weekendAverage = weekendValues.length > 0 
    ? weekendValues.reduce((sum, val) => sum + val, 0) / weekendValues.length 
    : weekdayAverage; // Se não há dados de fim de semana, usar média geral

  // Calcular padrão mensal (últimos 12 meses)
  const monthlyPattern: number[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthReadings = recentReadings.filter(r => {
      const readingDate = new Date(r.ts);
      return readingDate >= monthStart && readingDate <= monthEnd;
    });
    
    if (monthReadings.length > 0) {
      const monthProduction = monthReadings.reduce((sum, r, idx) => {
        if (idx > 0) {
          const prev = monthReadings[idx - 1];
          const delta_v = parseFloat(r.hydrometer_m3) - parseFloat(prev.hydrometer_m3);
          return sum + delta_v;
        }
        return sum;
      }, 0);
      monthlyPattern.unshift(monthProduction);
    } else {
      monthlyPattern.unshift(0);
    }
  }

  // Determinar confiança
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (dailyReadingsCount >= 14) {
    confidence = 'high';
  } else if (dailyReadingsCount >= 7) {
    confidence = 'medium';
  }

  // Calcular dias recomendados
  const recommendedDays = Math.max(0, 14 - dailyReadingsCount);

  return {
    weekdayAverage,
    weekendAverage,
    monthlyPattern,
    confidence,
    totalReadings: recentReadings.length,
    dailyReadingsCount,
    recommendedDays,
  };
}

export function applyCalibration(baseProduction: number, date: Date, calibration: CalibrationData): number {
  if (!calibration) return baseProduction;

  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Aplicar ajuste baseado no dia da semana
  const adjustedProduction = isWeekend 
    ? baseProduction * (calibration.weekendAverage / calibration.weekdayAverage)
    : baseProduction;

  // Aplicar ajuste sazonal baseado no mês
  const month = date.getMonth();
  const currentMonthProduction = calibration.monthlyPattern[month] || 0;
  const avgMonthlyProduction = calibration.monthlyPattern.reduce((sum, val) => sum + val, 0) / 12;
  
  if (avgMonthlyProduction > 0) {
    const seasonalFactor = currentMonthProduction / avgMonthlyProduction;
    return adjustedProduction * seasonalFactor;
  }

  return adjustedProduction;
}

export function getCalibrationRecommendations(calibration: CalibrationData | null): string[] {
  if (!calibration) {
    return [
      "Realize leituras diárias para habilitar a calibração do sistema",
      "Mantenha horário consistente nas leituras (tolerância de ±2h)",
      "Colete pelo menos 7 dias de dados para análise básica"
    ];
  }

  const recommendations: string[] = [];

  if (calibration.confidence === 'low') {
    recommendations.push("Continue com leituras diárias por mais dias para melhorar a precisão");
  }

  if (calibration.recommendedDays > 0) {
    recommendations.push(`Recomendado: ${calibration.recommendedDays} dias adicionais de leituras diárias`);
  }

  if (calibration.weekendAverage !== calibration.weekdayAverage) {
    recommendations.push("Sistema detectou padrão diferente entre dias úteis e fins de semana");
  }

  if (calibration.monthlyPattern.some(val => val > 0)) {
    recommendations.push("Sistema identificou padrões sazonais nos dados");
  }

  return recommendations;
}
