import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface IntercomConfig {
  token: string;
  workspace: string;
  app_id: string;
  region: 'us' | 'eu' | 'au';
}

const CONFIG_DIR = path.join(os.homedir(), '.intercom');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function readConfig(): IntercomConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as IntercomConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: IntercomConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

export function deleteConfig(): void {
  try {
    fs.unlinkSync(CONFIG_FILE);
  } catch {
    // Already deleted or never existed — that's fine
  }
}

/**
 * Resolve the API token with priority:
 * 1. INTERCOM_TOKEN env var
 * 2. ~/.intercom/config.json
 * 3. null (caller should print error and exit)
 */
export function resolveToken(): { token: string; region: 'us' | 'eu' | 'au' } | null {
  const envToken = process.env.INTERCOM_TOKEN;
  if (envToken) {
    const region = (process.env.INTERCOM_REGION as 'us' | 'eu' | 'au') || 'us';
    return { token: envToken, region };
  }

  const config = readConfig();
  if (config?.token) {
    return { token: config.token, region: config.region || 'us' };
  }

  return null;
}
