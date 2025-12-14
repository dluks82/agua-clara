import { z } from "zod";

export const getIntervalsSchema = z.object({
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
});

export const intervalSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  delta_v: z.number(),
  delta_h: z.number(),
  q_m3h: z.number().nullable(),
  l_min: z.number().nullable(),
  l_s: z.number().nullable(),
  confidence: z.enum(["ALTA", "BAIXA"]),
});

export const kpisSchema = z.object({
  producao_total_m3: z.number(),
  horas_total_h: z.number(),
  q_avg_m3h: z.number().nullable(),
  q_avg_lmin: z.number().nullable(),
  q_avg_ls: z.number().nullable(),
  cov_q_pct: z.number().nullable(),
  utilization_rate_pct: z.number().nullable(),
});

export const alertSchema = z.object({
  type: z.enum(["queda_vazao", "oscilacao_alta", "inconsistencia_dados"]),
  message: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

export type GetIntervalsInput = z.infer<typeof getIntervalsSchema>;
export type Interval = z.infer<typeof intervalSchema>;
export type KPIs = z.infer<typeof kpisSchema>;
export type Alert = z.infer<typeof alertSchema>;
