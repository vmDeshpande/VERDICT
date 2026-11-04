import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  TEST_DATABASE_URL: z.string().url("TEST_DATABASE_URL must be a valid URL"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error.issues);
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();