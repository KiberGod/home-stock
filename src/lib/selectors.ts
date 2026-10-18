import type { Group, Item, StockData } from './types';

export type SortMode = 'manual' | 'az' | 'za' | 'qtyDesc' | 'qtyAsc';

export const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/**
 * Case-insensitive normalisation for search (also treats ё as е). Done per UTF-16 unit so the
 * result keeps the original length and match positions map straight back onto the text.
 */
const normChar = (c: string) => {
  const l = c.toLocaleLowerCase();
  return l.length !== 1 ? c : l === 'ё' ? 'е' : l;
};
const norm = (s: string) => s.split('').map(normChar).join('');

/** Positions [start, end) of every occurrence of the query in the text. */
export function matchRanges(text: string, query: string): [number, number][] {
  const q = norm(query.trim());
  if (!q) return [];
  const t = norm(text);
  const ranges: [number, number][] = [];
  for (let i = t.indexOf(q); i !== -1; i = t.indexOf(q, i + q.length)) ranges.push([i, i + q.length]);
  return ranges;
}

export const matches = (text: string, query: string) => norm(text).includes(norm(query.trim()));

/** `qty` gives the stock value for the quantity sorts (item quantity, group total); ties fall back to name. */
export function sortList<T extends { name: string; position: number }>(
  list: T[],
  mode: SortMode,
  locale: string,
  qty?: (x: T) => number,
): T[] {
  const copy = [...list];
  if (mode === 'manual' || ((mode === 'qtyDesc' || mode === 'qtyAsc') && !qty)) return copy.sort(byPosition);
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const byName = (a: T, b: T) => collator.compare(a.name, b.name);
  if (mode === 'qtyDesc') return copy.sort((a, b) => qty!(b) - qty!(a) || byName(a, b));
  if (mode === 'qtyAsc') return copy.sort((a, b) => qty!(a) - qty!(b) || byName(a, b));
  copy.sort(byName);
  return mode === 'za' ? copy.reverse() : copy;
}

export const groupsOf = (d: StockData, categoryId: string) => d.groups.filter((g) => g.categoryId === categoryId);
export const itemsOf = (d: StockData, groupId: string) => d.items.filter((i) => i.groupId === groupId);

/** The group picture is taken from its item with the largest stock that has a picture. */
export function groupImage(d: StockData, groupId: string): string {
  let best: Item | undefined;
  for (const i of itemsOf(d, groupId)) {
    if (!i.image) continue;
    if (!best || i.quantity > best.quantity || (i.quantity === best.quantity && i.position < best.position)) best = i;
  }
  return best?.image ?? '';
}

/** Groups ordered by category order, then by their own position - for <select>s. */
export function groupsByCategory(d: StockData): { categoryName: string; groups: Group[] }[] {
  return [...d.categories].sort(byPosition).map((c) => ({
    categoryName: c.name,
    groups: groupsOf(d, c.id).sort(byPosition),
  }));
}

export interface GroupStats {
  total: number;
  count: number;
  image: string;
}

/** Totals, item counts and pictures for every group. */
export function computeGroupStats(d: StockData): Map<string, GroupStats> {
  const stats = new Map<string, GroupStats>(d.groups.map((g) => [g.id, { total: 0, count: 0, image: '' }]));
  for (const g of d.groups) stats.get(g.id)!.image = groupImage(d, g.id);
  for (const i of d.items) {
    const s = stats.get(i.groupId);
    if (!s) continue;
    s.total += i.quantity;
    s.count++;
  }
  return stats;
}
