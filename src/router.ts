import { useSyncExternalStore } from 'react';

/** Hash routing - GitHub Pages has no server-side rewrites. */
export type Route =
  | { name: 'categories' }
  | { name: 'category'; id: string }
  | { name: 'group'; id: string }
  | { name: 'items'; group: string }
  | { name: 'search'; q: string }
  | { name: 'itemNew'; group: string }
  | { name: 'item'; id: string }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const q = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'c':
      return parts[1] ? { name: 'category', id: parts[1] } : { name: 'categories' };
    case 'g':
      return parts[1] ? { name: 'group', id: parts[1] } : { name: 'categories' };
    case 'items':
      return { name: 'items', group: q.get('group') ?? '' };
    case 'search':
      return { name: 'search', q: q.get('q') ?? '' };
    case 'item':
      if (parts[1] === 'new') return { name: 'itemNew', group: q.get('group') ?? '' };
      return parts[1] ? { name: 'item', id: parts[1] } : { name: 'categories' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'categories' };
  }
}

export const href = {
  categories: () => '#/',
  category: (id: string) => `#/c/${encodeURIComponent(id)}`,
  group: (id: string) => `#/g/${encodeURIComponent(id)}`,
  items: (group = '') => (group ? `#/items?group=${encodeURIComponent(group)}` : '#/items'),
  search: (q = '') => (q ? `#/search?q=${encodeURIComponent(q)}` : '#/search'),
  itemNew: (group = '') => (group ? `#/item/new?group=${encodeURIComponent(group)}` : '#/item/new'),
  item: (id: string) => `#/item/${encodeURIComponent(id)}`,
  settings: () => '#/settings',
};

// How many history entries the app itself pushed in this page session.
let depth = 0;
let replacing = false;
window.addEventListener('hashchange', () => {
  if (!replacing) depth++;
  replacing = false;
});
window.addEventListener('popstate', () => (depth = Math.max(0, depth - 2))); // hashchange follows and adds 1 back

// ---- leave guard (e.g. a form with unsaved changes) ----

interface LeaveGuard {
  /** the guarded page's hash */
  hash: string;
  /** true while leaving should be confirmed */
  active: () => boolean;
  /** ask the user; call proceed() to leave anyway */
  confirm: (proceed: () => void) => void;
}

let guard: LeaveGuard | null = null;

export function setLeaveGuard(g: Omit<LeaveGuard, 'hash'> | null) {
  guard = g && { ...g, hash: location.hash };
}

/** Runs `leave` right away, or after the user confirms leaving a guarded page. */
function guarded(leave: () => void) {
  if (!guard?.active()) return leave();
  guard.confirm(() => {
    guard = null;
    leave();
  });
}

// In-app links: intercept before the browser changes the hash.
document.addEventListener(
  'click',
  (e) => {
    if (!guard?.active() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest?.('a[href^="#"]');
    const to = link?.getAttribute('href');
    if (!to || to === location.hash || link?.getAttribute('target')) return;
    e.preventDefault();
    guarded(() => (location.hash = to));
  },
  true,
);

// Browser/phone "back": the URL has already changed - put the guarded page back, then ask.
window.addEventListener('popstate', () => {
  if (!guard?.active() || location.hash === guard.hash) return;
  history.pushState(history.state, '', guard.hash);
  depth++;
  guarded(() => history.back());
});

export function navigate(to: string, { replace = false } = {}) {
  guarded(() => {
    if (replace) {
      replacing = true;
      history.replaceState(history.state, '', to);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      location.hash = to;
    }
  });
}

/** Goes back within the app if possible, otherwise to the fallback. */
export function goBack(fallback: string) {
  guarded(() => {
    if (depth > 0) history.back();
    else navigate(fallback, { replace: true });
  });
}

/**
 * Global search input handler. Typing opens/updates the search page; clearing the query
 * returns to the page the search was started from.
 */
export function setGlobalQuery(q: string, onSearchPage: boolean) {
  if (!q.trim()) {
    if (onSearchPage) goBack(href.categories());
    return;
  }
  navigate(href.search(q), { replace: onSearchPage });
}

const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l);
  return () => window.removeEventListener('hashchange', l);
};

export function useHash() {
  return useSyncExternalStore(subscribe, () => location.hash);
}
