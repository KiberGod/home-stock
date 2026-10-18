import type { Category, EntityKind, Group, Item, StockData } from './types';
import { DEFAULT_ICON, isKnownIcon } from '../icons/categoryIcons';

/**
 * Spreadsheet layout (schema v1):
 *
 *   Meta        key | value             (app = HomeStock, schema = 1)
 *   Categories  id | name | icon | position
 *   Groups      id | name | categoryId | position
 *   Items       id | name | image | quantity | note | groupId | position
 *
 * Row 1 of every sheet is a header. Derived values (group totals, group image,
 * category group count) are never stored - they are computed in the app.
 */
export const SCHEMA_VERSION = 1;

export const SHEETS = {
  meta: 'Meta',
  categories: 'Categories',
  groups: 'Groups',
  items: 'Items',
} as const;

export const HEADERS: Record<EntityKind | 'meta', string[]> = {
  meta: ['key', 'value'],
  categories: ['id', 'name', 'icon', 'position'],
  groups: ['id', 'name', 'categoryId', 'position'],
  items: ['id', 'name', 'image', 'quantity', 'note', 'groupId', 'position'],
};

export const DATA_KINDS: EntityKind[] = ['categories', 'groups', 'items'];

export type Cell = string | number | boolean | null | undefined;
export type Rows = Cell[][];

export interface ValidationIssue {
  sheet: string;
  row?: number; // 1-based spreadsheet row
  code:
    | 'foreignData'
    | 'badHeader'
    | 'missingId'
    | 'duplicateId'
    | 'missingName'
    | 'badQuantity'
    | 'unknownCategory'
    | 'unknownGroup'
    | 'newerSchema';
  value?: string;
}

export class InvalidStructureError extends Error {
  constructor(public issues: ValidationIssue[]) {
    super('Invalid spreadsheet structure');
  }
}

const str = (c: Cell) => (c === null || c === undefined ? '' : String(c).trim());

const isBlankRow = (row: Cell[] | undefined) => !row || row.every((c) => str(c) === '');

export const isBlankSheet = (rows: Rows | undefined) => !rows || rows.every(isBlankRow);

function headerMatches(kind: EntityKind | 'meta', row: Cell[] | undefined) {
  const expected = HEADERS[kind];
  return !!row && expected.every((h, i) => str(row[i]).toLowerCase() === h.toLowerCase());
}

function toNumber(c: Cell): number | null {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  const s = str(c).replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Positions in the sheet may be missing or messy - normalise to 1..n keeping relative order. */
function normalisePositions<T extends { position: number }>(list: T[]): T[] {
  return list
    .map((x, idx) => ({ x, idx }))
    .sort((a, b) => a.x.position - b.x.position || a.idx - b.idx)
    .map(({ x }, i) => ({ ...x, position: i + 1 }));
}

export interface SheetValues {
  meta?: Rows;
  categories?: Rows;
  groups?: Rows;
  items?: Rows;
}

/**
 * Parses raw sheet values into StockData. A sheet that is absent (undefined)
 * is treated as empty. Throws InvalidStructureError with every issue found.
 */
export function parseSheets(values: SheetValues): StockData {
  const issues: ValidationIssue[] = [];

  const meta = values.meta;
  if (meta && !isBlankSheet(meta)) {
    if (!headerMatches('meta', meta[0])) {
      issues.push({ sheet: SHEETS.meta, row: 1, code: 'badHeader' });
    } else {
      const schemaRow = meta.find((r) => str(r[0]).toLowerCase() === 'schema');
      const v = schemaRow ? toNumber(schemaRow[1]) : null;
      if (v !== null && v > SCHEMA_VERSION) {
        issues.push({ sheet: SHEETS.meta, code: 'newerSchema', value: String(v) });
      }
    }
  }

  function body(kind: EntityKind): { row: Cell[]; line: number }[] {
    const rows = values[kind];
    if (!rows || isBlankSheet(rows)) return [];
    if (!headerMatches(kind, rows[0])) {
      issues.push({ sheet: SHEETS[kind], row: 1, code: 'badHeader' });
      return [];
    }
    return rows
      .slice(1)
      .map((row, i) => ({ row, line: i + 2 }))
      .filter(({ row }) => !isBlankRow(row));
  }

  const ids = new Set<string>();
  function checkId(kind: EntityKind, id: string, line: number) {
    if (!id) {
      issues.push({ sheet: SHEETS[kind], row: line, code: 'missingId' });
      return false;
    }
    if (ids.has(id)) {
      issues.push({ sheet: SHEETS[kind], row: line, code: 'duplicateId', value: id });
      return false;
    }
    ids.add(id);
    return true;
  }
  function checkName(kind: EntityKind, name: string, line: number) {
    if (!name) issues.push({ sheet: SHEETS[kind], row: line, code: 'missingName' });
    return !!name;
  }

  const categories: Category[] = [];
  for (const { row, line } of body('categories')) {
    const [id, name, icon] = [str(row[0]), str(row[1]), str(row[2])];
    if (!checkId('categories', id, line) || !checkName('categories', name, line)) continue;
    categories.push({
      id,
      name,
      icon: isKnownIcon(icon) ? icon : DEFAULT_ICON,
      position: toNumber(row[3]) ?? Number.MAX_SAFE_INTEGER,
    });
  }
  const categoryIds = new Set(categories.map((c) => c.id));

  const groups: Group[] = [];
  for (const { row, line } of body('groups')) {
    const [id, name, categoryId] = [str(row[0]), str(row[1]), str(row[2])];
    if (!checkId('groups', id, line) || !checkName('groups', name, line)) continue;
    if (!categoryIds.has(categoryId)) {
      issues.push({ sheet: SHEETS.groups, row: line, code: 'unknownCategory', value: categoryId });
      continue;
    }
    groups.push({ id, name, categoryId, position: toNumber(row[3]) ?? Number.MAX_SAFE_INTEGER });
  }
  const groupIds = new Set(groups.map((g) => g.id));

  const items: Item[] = [];
  for (const { row, line } of body('items')) {
    const [id, name, image] = [str(row[0]), str(row[1]), str(row[2])];
    const groupId = str(row[5]);
    if (!checkId('items', id, line) || !checkName('items', name, line)) continue;
    const rawQty = str(row[3]);
    const quantity = rawQty === '' ? 0 : toNumber(row[3]);
    if (quantity === null || quantity < 0) {
      issues.push({ sheet: SHEETS.items, row: line, code: 'badQuantity', value: rawQty });
      continue;
    }
    if (!groupIds.has(groupId)) {
      issues.push({ sheet: SHEETS.items, row: line, code: 'unknownGroup', value: groupId });
      continue;
    }
    items.push({
      id,
      name,
      image,
      quantity,
      note: str(row[4]),
      groupId,
      position: toNumber(row[6]) ?? Number.MAX_SAFE_INTEGER,
    });
  }

  if (issues.length) throw new InvalidStructureError(issues);

  // Positions are scoped: categories globally, groups per category, items per group.
  const byParent = <T extends { position: number }>(list: T[], key: (x: T) => string) => {
    const buckets = new Map<string, T[]>();
    for (const x of list) {
      const k = key(x);
      buckets.set(k, [...(buckets.get(k) ?? []), x]);
    }
    return [...buckets.values()].flatMap(normalisePositions);
  };

  return {
    categories: normalisePositions(categories),
    groups: byParent(groups, (g) => g.categoryId),
    items: byParent(items, (i) => i.groupId),
  };
}

/** Serialises an entity list into sheet rows (header included). */
export function serialise(kind: EntityKind, data: StockData): Rows {
  const header = HEADERS[kind];
  switch (kind) {
    case 'categories':
      return [header, ...data.categories.map((c) => [c.id, c.name, c.icon, c.position])];
    case 'groups':
      return [header, ...data.groups.map((g) => [g.id, g.name, g.categoryId, g.position])];
    case 'items':
      return [
        header,
        ...data.items.map((i) => [i.id, i.name, i.image, i.quantity, i.note, i.groupId, i.position]),
      ];
  }
}

export const metaRows = (): Rows => [
  HEADERS.meta,
  ['app', 'HomeStock'],
  ['schema', SCHEMA_VERSION],
];
