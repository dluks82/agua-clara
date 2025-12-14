import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL deve ser uma URL válida"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, "Nome da aplicação é obrigatório"),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().min(1, "Descrição da aplicação é obrigatória"),
});

export const env = envSchema.parse(process.env);
