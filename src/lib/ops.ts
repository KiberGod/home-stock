import type { Category, Group, Item, StockData } from './types';

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

const nextPosition = (list: { position: number }[]) => list.reduce((m, x) => Math.max(m, x.position), 0) + 1;

/** Renumbers positions 1..n inside one parent, preserving current order. */
function renumber<T extends { position: number }>(all: T[], inParent: (x: T) => boolean): T[] {
  const ordered = all.filter(inParent).sort((a, b) => a.position - b.position);
  const pos = new Map(ordered.map((x, i) => [x, i + 1]));
  return all.map((x) => (pos.has(x) ? { ...x, position: pos.get(x)! } : x));
}

/** Applies a new order (list of ids) to the given subset of entities. */
function applyOrder<T extends { id: string; position: number }>(all: T[], ids: string[]): T[] {
  const pos = new Map(ids.map((id, i) => [id, i + 1]));
  return all.map((x) => (pos.has(x.id) ? { ...x, position: pos.get(x.id)! } : x));
}

// ---- categories ----

export function addCategory(d: StockData, c: Pick<Category, 'name' | 'icon'>): StockData {
  return { ...d, categories: [...d.categories, { ...c, id: newId(), position: nextPosition(d.categories) }] };
}

export function updateCategory(d: StockData, id: string, patch: Partial<Pick<Category, 'name' | 'icon'>>): StockData {
  return { ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

export function deleteCategory(d: StockData, id: string): StockData {
  const groupIds = new Set(d.groups.filter((g) => g.categoryId === id).map((g) => g.id));
  return {
    categories: renumber(d.categories.filter((c) => c.id !== id), () => true),
    groups: d.groups.filter((g) => !groupIds.has(g.id)),
    items: d.items.filter((i) => !groupIds.has(i.groupId)),
  };
}

export const reorderCategories = (d: StockData, ids: string[]): StockData => ({
  ...d,
  categories: applyOrder(d.categories, ids),
});

// ---- groups ----

export function addGroup(d: StockData, g: Pick<Group, 'name' | 'categoryId'>): StockData {
  const siblings = d.groups.filter((x) => x.categoryId === g.categoryId);
  return { ...d, groups: [...d.groups, { ...g, id: newId(), position: nextPosition(siblings) }] };
}

export function updateGroup(d: StockData, id: string, patch: Partial<Pick<Group, 'name' | 'categoryId'>>): StockData {
  const old = d.groups.find((g) => g.id === id);
  if (!old) return d;
  const moved = patch.categoryId !== undefined && patch.categoryId !== old.categoryId;
  let groups = d.groups.map((g) => {
    if (g.id !== id) return g;
    const next = { ...g, ...patch };
    if (moved) next.position = nextPosition(d.groups.filter((x) => x.categoryId === patch.categoryId));
    return next;
  });
  if (moved) groups = renumber(groups, (g) => g.categoryId === old.categoryId);
  return { ...d, groups };
}

export function deleteGroup(d: StockData, id: string): StockData {
  const old = d.groups.find((g) => g.id === id);
  return {
    ...d,
    groups: renumber(
      d.groups.filter((g) => g.id !== id),
      (g) => g.categoryId === old?.categoryId,
    ),
    items: d.items.filter((i) => i.groupId !== id),
  };
}

export const reorderGroups = (d: StockData, ids: string[]): StockData => ({ ...d, groups: applyOrder(d.groups, ids) });

// ---- items ----

export type ItemFields = Pick<Item, 'name' | 'image' | 'quantity' | 'note' | 'groupId'>;

export function addItem(d: StockData, fields: ItemFields): StockData {
  const siblings = d.items.filter((x) => x.groupId === fields.groupId);
  return { ...d, items: [...d.items, { ...fields, id: newId(), position: nextPosition(siblings) }] };
}

export function updateItem(d: StockData, id: string, patch: Partial<ItemFields>): StockData {
  const old = d.items.find((i) => i.id === id);
  if (!old) return d;
  const moved = patch.groupId !== undefined && patch.groupId !== old.groupId;
  let items = d.items.map((i) => {
    if (i.id !== id) return i;
    const next = { ...i, ...patch };
    if (moved) next.position = nextPosition(d.items.filter((x) => x.groupId === patch.groupId));
    return next;
  });
  if (moved) items = renumber(items, (i) => i.groupId === old.groupId);
  return { ...d, items };
}

export function changeQuantity(d: StockData, id: string, delta: number): StockData {
  return {
    ...d,
    items: d.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, roundQty(i.quantity + delta)) } : i)),
  };
}

export function deleteItem(d: StockData, id: string): StockData {
  const old = d.items.find((i) => i.id === id);
  return {
    ...d,
    items: renumber(
      d.items.filter((i) => i.id !== id),
      (i) => i.groupId === old?.groupId,
    ),
  };
}

export const reorderItems = (d: StockData, ids: string[]): StockData => ({ ...d, items: applyOrder(d.items, ids) });

export const roundQty = (n: number) => Math.round(n * 1000) / 1000;
