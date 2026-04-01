import { Interval } from "@/lib/validations/intervals";

export interface DataQualityFactor {
  score: number; // 0–100
  detail: string;
}

export interface DataQuality {
  score: number; // 0–100 weighted composite
  level: "BAIXA" | "MÉDIA" | "ALTA";
  factors: {
    frequency: DataQualityFactor & { avgDaysBetweenReadings: number };
    regularity: DataQualityFactor & { stdDevDays: number };
    coverage: DataQualityFactor & { coveredDays: number; totalDays: number };
    gaps: DataQualityFactor & { gapCount: number };
  };
  recommendations: string[];
}

const WEIGHTS = {
  frequency: 0.4,
  regularity: 0.25,
  coverage: 0.2,
  gaps: 0.15,
} as const;

// Ideal interval between readings (days). Closer to this = higher frequency score.
const IDEAL_INTERVAL_DAYS = 3;
// Maximum acceptable interval before frequency score hits 0.
const MAX_INTERVAL_DAYS = 10;
// Maximum acceptable std dev before regularity score hits 0.
const MAX_STDDEV_DAYS = 5;

/**
 * Calculates a Data Quality Score for a given period.
 *
 * Measures how trustworthy the KPIs are based on reading behavior — not the
 * readings themselves. More frequent, more regular, and gap-free readings
 * produce higher scores.
 *
 * Pure function — no dependency on Date.now(). Safe for caching.
 */
export function calculateDataQuality(
  intervals: Interval[],
  periodFrom: Date,
  periodTo: Date,
  gapThresholdDays: number = 7,
): DataQuality | null {
  if (intervals.length === 0) return null;

  const totalDays = Math.max(1, (periodTo.getTime() - periodFrom.getTime()) / (1000 * 60 * 60 * 24));

  // ── Interval durations (days) ──────────────────────────────────────────
  const intervalDays = intervals.map((i) => {
    const start = new Date(i.start).getTime();
    const end = new Date(i.end).getTime();
    return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  });

  // ── 1. Frequency ───────────────────────────────────────────────────────
  const avgDays = intervalDays.reduce((s, d) => s + d, 0) / intervalDays.length;
  const freqScore = Math.max(0, 1 - Math.abs(avgDays - IDEAL_INTERVAL_DAYS) / (MAX_INTERVAL_DAYS - IDEAL_INTERVAL_DAYS)) * 100;
  const freqDetail =
    avgDays <= IDEAL_INTERVAL_DAYS + 1
      ? `Média de ${avgDays.toFixed(1)} dias entre leituras — ótimo`
      : avgDays <= 5
        ? `Média de ${avgDays.toFixed(1)} dias entre leituras — bom`
        : `Média de ${avgDays.toFixed(1)} dias entre leituras — registre com mais frequência`;

  // ── 2. Regularity ─────────────────────────────────────────────────────
  let stdDevDays = 0;
  let regScore = 100;
  if (intervalDays.length > 1) {
    const variance = intervalDays.reduce((s, d) => s + Math.pow(d - avgDays, 2), 0) / intervalDays.length;
    stdDevDays = Math.sqrt(variance);
    regScore = Math.max(0, 1 - stdDevDays / MAX_STDDEV_DAYS) * 100;
  }
  const regDetail =
    stdDevDays < 1
      ? `Desvio de ${stdDevDays.toFixed(1)} dia — leituras muito regulares`
      : stdDevDays < 3
        ? `Desvio de ${stdDevDays.toFixed(1)} dias — razoavelmente regular`
        : `Desvio de ${stdDevDays.toFixed(1)} dias — tente manter intervalos mais constantes`;

  // ── 3. Coverage ────────────────────────────────────────────────────────
  // Days effectively spanned by intervals (union of start→end ranges)
  const coveredMs = intervalDays.reduce((s, d) => s + d * 24 * 60 * 60 * 1000, 0);
  const coveredDays = Math.min(totalDays, coveredMs / (1000 * 60 * 60 * 24));
  const covScore = Math.min(100, (coveredDays / totalDays) * 100);
  const covDetail =
    covScore >= 80
      ? `${coveredDays.toFixed(0)} de ${totalDays.toFixed(0)} dias cobertos — boa cobertura`
      : `${coveredDays.toFixed(0)} de ${totalDays.toFixed(0)} dias cobertos — há lacunas significativas`;

  // ── 4. Gap absence ─────────────────────────────────────────────────────
  let gapCount = 0;
  for (const d of intervalDays) {
    if (d > gapThresholdDays) gapCount++;
  }
  const gapScore = Math.max(0, 1 - gapCount / 3) * 100;
  const gapDetail =
    gapCount === 0
      ? "Nenhum gap acima do limiar — excelente"
      : `${gapCount} intervalo(s) acima de ${gapThresholdDays} dias`;

  // ── Composite score ────────────────────────────────────────────────────
  const score = Math.round(
    freqScore * WEIGHTS.frequency +
    regScore * WEIGHTS.regularity +
    covScore * WEIGHTS.coverage +
    gapScore * WEIGHTS.gaps,
  );

  const level: DataQuality["level"] = score >= 70 ? "ALTA" : score >= 40 ? "MÉDIA" : "BAIXA";

  // ── Recommendations ────────────────────────────────────────────────────
  const recommendations: string[] = [];

  if (freqScore < 60) {
    recommendations.push(
      `Registre leituras a cada ${IDEAL_INTERVAL_DAYS} dias para melhorar a confiabilidade (atualmente a cada ${avgDays.toFixed(0)} dias).`,
    );
  }
  if (regScore < 60) {
    recommendations.push(
      "Mantenha intervalos mais constantes entre leituras — a irregularidade reduz a precisão dos cálculos.",
    );
  }
  if (covScore < 60) {
    recommendations.push(
      `Apenas ${coveredDays.toFixed(0)} de ${totalDays.toFixed(0)} dias do período estão cobertos por leituras.`,
    );
  }
  if (gapCount > 0) {
    recommendations.push(
      `Existem ${gapCount} intervalo(s) maiores que ${gapThresholdDays} dias. Evite gaps longos sem leitura.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("Qualidade dos dados está boa. Continue registrando leituras regularmente.");
  }

  return {
    score,
    level,
    factors: {
      frequency: { score: Math.round(freqScore), avgDaysBetweenReadings: avgDays, detail: freqDetail },
      regularity: { score: Math.round(regScore), stdDevDays, detail: regDetail },
      coverage: { score: Math.round(covScore), coveredDays, totalDays, detail: covDetail },
      gaps: { score: Math.round(gapScore), gapCount, detail: gapDetail },
    },
    recommendations,
  };
}
