import { Capacitor, registerPlugin } from "@capacitor/core";

type Credentials = { email: string; password: string };

interface SecureCredentialsPlugin {
  load(): Promise<Credentials>;
  save(options: Credentials): Promise<void>;
  clear(): Promise<void>;
}

const SecureCredentials = registerPlugin<SecureCredentialsPlugin>("SecureCredentials");
const webKey = "still.saved-credentials.v1";

export async function loadSavedCredentials(): Promise<Credentials | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await SecureCredentials.load();
      return result.email && result.password ? result : null;
    }
    const value = localStorage.getItem(webKey);
    return value ? JSON.parse(value) as Credentials : null;
  } catch {
    return null;
  }
}

export async function saveSavedCredentials(remember: boolean, credentials: Credentials) {
  if (Capacitor.isNativePlatform()) {
    if (remember) await SecureCredentials.save(credentials);
    else await SecureCredentials.clear();
    return;
  }
  if (remember) localStorage.setItem(webKey, JSON.stringify(credentials));
  else localStorage.removeItem(webKey);
}
