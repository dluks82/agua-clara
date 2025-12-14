import { z } from "zod";

export const createReadingSchema = z.object({
  ts: z.string().refine((val) => {
    // Aceitar formato datetime-local (YYYY-MM-DDTHH:MM) ou ISO completo
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Timestamp deve ser uma data/hora válida"),
  hydrometer_m3: z.number().min(0, "Hidrômetro deve ser maior ou igual a 0"),
  horimeter_h: z.number().min(0, "Horímetro deve ser maior ou igual a 0"),
  notes: z.string().optional(),
  hydrometer_status: z.enum(["regular", "rollover", "exchange"]).default("regular"),
  horimeter_status: z.enum(["regular", "rollover", "exchange"]).default("regular"),
  hydrometer_final_old: z.number().optional(),
  hydrometer_initial_new: z.number().optional(),
  horimeter_final_old: z.number().optional(),
  horimeter_initial_new: z.number().optional(),
});

export const getReadingsSchema = z.object({
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
  page: z.preprocess((val) => val === null ? 1 : val, z.number().min(1).default(1)),
  limit: z.preprocess((val) => val === null ? 20 : val, z.number().min(1).max(100).default(20)),
});

export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type GetReadingsInput = z.infer<typeof getReadingsSchema>;
