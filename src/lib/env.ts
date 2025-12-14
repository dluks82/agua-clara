import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL deve ser uma URL válida"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, "Nome da aplicação é obrigatório"),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().min(1, "Descrição da aplicação é obrigatória"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET é obrigatório"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID é obrigatório"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET é obrigatório"),
  MIGRATIONS_TOKEN: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
