import { useSyncExternalStore } from 'react';
import { createBackend, type Backend } from '../lib/backend';
import { AppError, toAppError } from '../lib/errors';
import { CLIENT_ID, forgetToken, getValidToken, loadGis, requestToken, signOut } from '../lib/googleAuth';
import { parseSpreadsheetId } from '../lib/sheetsApi';
import { settings } from '../lib/storage';
import { EMPTY_DATA, type EntityKind, type StockData } from '../lib/types';

export type Phase = 'connect' | 'auth' | 'loading' | 'ready' | 'error';
export type SyncState = 'idle' | 'pending' | 'saving' | 'error';

export interface State {
  phase: Phase;
  /** fatal load error (phase = error) or connect-form error (phase = connect) */
  error: AppError | null;
  data: StockData;
  title: string;
  sync: SyncState;
  syncError: AppError | null;
  refreshing: boolean;
  /** bumps on every successful load, so pages can show a toast */
  loadedAt: number;
}

const SAVE_DEBOUNCE_MS = 700;
const AUTO_REFRESH_AFTER_MS = 60_000;

let state: State = {
  phase: 'loading',
  error: null,
  data: EMPTY_DATA,
  title: '',
  sync: 'idle',
  syncError: null,
  refreshing: false,
  loadedAt: 0,
};

const listeners = new Set<() => void>();
function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

// ---------------------------------------------------------------------------

let backend: Backend | null = null;
let dirty = new Set<EntityKind>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;

const needsGoogle = (id: string) => !(import.meta.env.DEV && id === 'demo');

async function load(sheetId: string, verifyWrite: boolean) {
  backend = await createBackend(sheetId);
  const result = await backend.load({ verifyWrite });
  dirty = new Set();
  return result;
}

export async function init() {
  if (CLIENT_ID) loadGis().catch(() => {}); // preload so the sign-in popup opens instantly on click
  const sheet = settings.getSheet();
  if (!sheet) return set({ phase: 'connect', error: CLIENT_ID ? null : new AppError('noClientId') });
  if (needsGoogle(sheet.id) && !getValidToken()) return set({ phase: 'auth', title: sheet.title ?? '' });
  await reload({ initial: true });
}

/** First connection of a spreadsheet link. Must be called from a click handler. */
export async function connect(link: string) {
  const id = parseSpreadsheetId(link) ?? (import.meta.env.DEV && link.trim() === 'demo' ? 'demo' : null);
  if (!id) return set({ error: new AppError('badLink') });
  set({ error: null, refreshing: true });
  try {
    if (needsGoogle(id) && !getValidToken()) await requestToken();
    const { data, title } = await load(id, true);
    settings.setSheet({ id, url: link.trim(), title });
    set({ phase: 'ready', data, title, sync: 'idle', syncError: null, refreshing: false, loadedAt: Date.now() });
  } catch (e) {
    backend = null;
    set({ phase: 'connect', error: toAppError(e), refreshing: false });
  }
}

/** Sign-in for an already connected spreadsheet. Must be called from a click handler. */
export async function signIn() {
  try {
    await requestToken();
  } catch (e) {
    const err = toAppError(e);
    if (state.phase === 'ready') return set({ sync: 'error', syncError: err });
    return set({ phase: 'auth', error: err });
  }
  if (state.phase === 'ready') {
    // session renewed mid-work: push what's queued, then continue
    set({ syncError: null });
    if (dirty.size) await flush();
    if (!dirty.size && state.sync !== 'error') await reload();
  } else {
    await reload({ initial: true });
  }
}

/** Re-reads the spreadsheet. Pending local changes are saved first. */
export async function reload({ initial = false } = {}) {
  const sheet = settings.getSheet();
  if (!sheet) return set({ phase: 'connect' });
  if (needsGoogle(sheet.id) && !getValidToken()) {
    if (initial || state.phase !== 'ready') return set({ phase: 'auth', title: sheet.title ?? '' });
    return set({ sync: 'error', syncError: new AppError('auth') });
  }
  if (!initial && dirty.size) {
    await flush();
    if (state.sync === 'error') return; // don't overwrite unsaved changes with remote data
  }

  if (state.phase === 'ready') set({ refreshing: true });
  else set({ phase: 'loading', error: null });

  try {
    const { data, title } = await load(sheet.id, false);
    if (title !== sheet.title) settings.setSheet({ ...sheet, title });
    set({ phase: 'ready', data, title, error: null, sync: 'idle', syncError: null, refreshing: false, loadedAt: Date.now() });
  } catch (e) {
    const err = toAppError(e);
    if (err.code === 'auth') {
      forgetToken();
      return set({ phase: 'auth', refreshing: false, error: null });
    }
    set({ phase: 'error', error: err, refreshing: false });
  }
}

export async function disconnect() {
  if (dirty.size) await flush(); // best effort - don't lose the last edits
  clearTimeout(saveTimer);
  dirty = new Set();
  backend = null;
  settings.setSheet(null);
  set({ phase: 'connect', data: EMPTY_DATA, title: '', error: null, sync: 'idle', syncError: null });
}

export async function logout() {
  await disconnect();
  signOut();
}

// ---- mutations & saving ----

/** Applies a local change immediately and schedules a write of the touched sheets. */
export function mutate(fn: (d: StockData) => StockData, kinds: EntityKind[]) {
  if (state.phase !== 'ready') return;
  kinds.forEach((k) => dirty.add(k));
  set({ data: fn(state.data), sync: state.sync === 'error' ? 'error' : 'pending' });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
}

export async function flush(): Promise<void> {
  clearTimeout(saveTimer);
  if (saving) {
    await saving;
    if (!dirty.size) return;
  }
  if (!backend || !dirty.size) return;
  const sheet = settings.getSheet();
  if (sheet && needsGoogle(sheet.id) && !getValidToken()) {
    return set({ sync: 'error', syncError: new AppError('auth') });
  }

  const kinds = [...dirty];
  dirty = new Set();
  set({ sync: 'saving' });
  saving = backend
    .save(state.data, kinds)
    .then(() => set({ sync: dirty.size ? 'pending' : 'idle', syncError: null }))
    .catch((e) => {
      kinds.forEach((k) => dirty.add(k));
      const err = toAppError(e);
      if (err.code === 'auth') forgetToken();
      set({ sync: 'error', syncError: err });
    })
    .finally(() => (saving = null));
  await saving;
  if (dirty.size && state.sync !== 'error') {
    saveTimer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }
}

export const hasUnsavedChanges = () => dirty.size > 0 || saving !== null;

// ---- lifecycle hooks ----

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges()) {
    void flush();
    e.preventDefault();
  }
});

document.addEventListener('visibilitychange', () => {
  // Coming back to the tab (e.g. phone after using the PC): pick up remote edits.
  if (document.visibilityState !== 'visible') return;
  if (state.phase !== 'ready' || state.refreshing || hasUnsavedChanges() || state.sync === 'error') return;
  const sheet = settings.getSheet();
  if (!sheet || (needsGoogle(sheet.id) && !getValidToken())) return;
  if (Date.now() - state.loadedAt > AUTO_REFRESH_AFTER_MS) void reload();
});
