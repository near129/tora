import type { Settings } from "./types.js";
import { DEFAULT_SETTINGS } from "./constants.js";

const STORAGE_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>;

export async function loadSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(STORAGE_KEYS)) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set(settings);
}

export async function initializeSettings(): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS);
  const updates: Record<string, unknown> = {};

  for (const key of STORAGE_KEYS) {
    if (!(key in stored)) {
      updates[key] = DEFAULT_SETTINGS[key];
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}
