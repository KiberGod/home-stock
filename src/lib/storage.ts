/** Small wrapper over localStorage that never throws (private mode, blocked storage, ...). */
const PREFIX = 'homestock.';

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable - settings just won't persist */
  }
}

export interface SheetSettings {
  id: string;
  url: string;
  title?: string;
}

export const settings = {
  getSheet: () => readJson<SheetSettings | null>('sheet', null),
  setSheet: (s: SheetSettings | null) => writeJson('sheet', s),
};
