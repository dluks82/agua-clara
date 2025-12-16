import { z } from "zod";

export const createReadingSchema = z.object({
  ts: z.string().refine((val) => {
    // Aceitar formato datetime-local (YYYY-MM-DDTHH:MM) ou ISO completo
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Timestamp deve ser uma data/hora válida"),
  hydrometer_m3: z.number().min(0, "Hidrômetro deve ser maior ou igual a 0"),
  horimeter_h: z.number().min(0, "Horímetro deve ser maior ou igual a 0"),
  notes: z.preprocess((val) => (val === null ? undefined : val), z.string().optional()),
  hydrometer_status: z.enum(["regular", "rollover", "exchange"]).default("regular"),
  horimeter_status: z.enum(["regular", "rollover", "exchange"]).default("regular"),
  hydrometer_final_old: z.number().optional(),
  hydrometer_initial_new: z.number().optional(),
  horimeter_final_old: z.number().optional(),
  horimeter_initial_new: z.number().optional(),
});

export const getReadingsSchema = z.object({
  from: z.string().datetime({ offset: true }).optional().nullable(),
  to: z.string().datetime({ offset: true }).optional().nullable(),
  page: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 1;
    const coerced = typeof val === "string" ? Number(val) : val;
    return Number.isFinite(coerced as number) ? coerced : val;
  }, z.number().min(1).default(1)),
  limit: z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 20;
    const coerced = typeof val === "string" ? Number(val) : val;
    return Number.isFinite(coerced as number) ? coerced : val;
  }, z.number().min(1).max(100).default(20)),
});

export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type GetReadingsInput = z.infer<typeof getReadingsSchema>;
