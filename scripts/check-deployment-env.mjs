import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const env = {
  ...parseEnvFile(resolve(process.cwd(), '.env.local')),
  ...parseEnvFile(resolve(process.cwd(), '.env')),
  ...process.env,
};

const checks = [
  {
    key: 'VITE_SUPABASE_URL',
    validator: (value) => isValidUrl(value),
    label: 'Supabase project URL',
  },
  {
    key: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    validator: (value) => value.length > 0,
    label: 'Supabase publishable key',
  },
  {
    key: 'VITE_SUPABASE_PROJECT_ID',
    validator: (value) => value.length > 0,
    label: 'Supabase project ID',
  },
  {
    key: 'VITE_SITE_URL',
    validator: (value) => isValidUrl(value),
    label: 'Public app URL',
  },
];

const failures = checks.filter(({ key }) => {
  const value = (env[key] || '').trim();
  return !value || !checks.find((c) => c.key === key).validator(value);
});

for (const check of checks) {
  const value = (env[check.key] || '').trim();
  const ok = Boolean(value) && check.validator(value);
  console.log(`${ok ? '✓' : '✗'} ${check.label}: ${ok ? 'configured' : 'missing or invalid'}`);
}

if (failures.length > 0) {
  console.error('\nDeployment env validation failed.');
  process.exit(1);
}

console.log('\nDeployment env validation passed.');
