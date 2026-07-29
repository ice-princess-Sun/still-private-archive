import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const key = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rememberKey = "still.remember-login";

async function shouldRemember() {
  if (Capacitor.isNativePlatform()) {
    return (await Preferences.get({ key: rememberKey })).value !== "false";
  }
  return localStorage.getItem(rememberKey) !== "false";
}

const authStorage = {
  async getItem(storageKey: string) {
    if (!Capacitor.isNativePlatform()) {
      const storage = (await shouldRemember()) ? localStorage : sessionStorage;
      return storage.getItem(storageKey);
    }
    if (!(await shouldRemember())) return sessionStorage.getItem(storageKey);
    const stored = await Preferences.get({ key: storageKey });
    if (stored.value) return stored.value;
    const legacyValue = localStorage.getItem(storageKey);
    if (legacyValue) await Preferences.set({ key: storageKey, value: legacyValue });
    return legacyValue;
  },
  async setItem(storageKey: string, value: string) {
    if (!Capacitor.isNativePlatform()) {
      const storage = (await shouldRemember()) ? localStorage : sessionStorage;
      storage.setItem(storageKey, value);
      return;
    }
    if (await shouldRemember()) await Preferences.set({ key: storageKey, value });
    else sessionStorage.setItem(storageKey, value);
  },
  async removeItem(storageKey: string) {
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
    if (Capacitor.isNativePlatform()) await Preferences.remove({ key: storageKey });
  },
};

if (!url || !key) {
  throw new Error("缺少 Supabase 配置。请在项目根目录的 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: authStorage,
  },
});

export async function setRememberLogin(remember: boolean) {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: rememberKey, value: String(remember) });
  } else {
    localStorage.setItem(rememberKey, String(remember));
  }
}
