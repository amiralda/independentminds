export interface DeploymentEnvStatus {
  key: string;
  ok: boolean;
  message: string;
}

function readEnvValue(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getDeploymentEnvStatus(env: Record<string, unknown> = import.meta.env): DeploymentEnvStatus[] {
  const required = [
    {
      key: "VITE_SUPABASE_URL",
      validator: (value: string) => isValidUrl(value),
      message: "Supabase project URL",
    },
    {
      key: "VITE_SUPABASE_PUBLISHABLE_KEY",
      validator: (value: string) => value.length > 0,
      message: "Supabase anon key",
    },
    {
      key: "VITE_SUPABASE_PROJECT_ID",
      validator: (value: string) => value.length > 0,
      message: "Supabase project reference",
    },
    {
      key: "VITE_SITE_URL",
      validator: (value: string) => isValidUrl(value),
      message: "Public app URL",
    },
  ] as const;

  return required.map(({ key, validator, message }) => {
    const value = readEnvValue(env, key);
    const ok = Boolean(value) && validator(value);
    return {
      key,
      ok,
      message: ok ? `${message} is configured` : `${message} is missing or invalid`,
    };
  });
}

export function isDeploymentHealthy(env: Record<string, unknown> = import.meta.env): boolean {
  return getDeploymentEnvStatus(env).every((item) => item.ok);
}
