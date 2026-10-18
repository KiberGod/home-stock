import { AppError } from './errors';
import { getValidToken } from './googleAuth';
import {
  DATA_KINDS,
  HEADERS,
  InvalidStructureError,
  SHEETS,
  isBlankSheet,
  metaRows,
  parseSheets,
  serialise,
  type Rows,
  type SheetValues,
} from './schema';
import { SheetsApi, quoteSheet } from './sheetsApi';
import type { EntityKind, StockData } from './types';

export interface LoadResult {
  data: StockData;
  title: string;
}

export interface Backend {
  /** verifyWrite: make a harmless write to prove the account can edit the file. */
  load(opts: { verifyWrite: boolean }): Promise<LoadResult>;
  save(data: StockData, kinds: EntityKind[]): Promise<void>;
}

type SheetKey = keyof typeof SHEETS;
const ALL_KEYS: SheetKey[] = ['meta', ...DATA_KINDS];
const colLetter = (n: number) => String.fromCharCode(64 + n);

export class GoogleSheetsBackend implements Backend {
  private api: SheetsApi;
  /** grid size per sheet, so writes never go past the sheet's last row */
  private gridRows = new Map<SheetKey, { sheetId: number; rowCount: number }>();
  /** rows currently occupied in the sheet (header included), to blank out leftovers on rewrite */
  private usedRows: Record<EntityKind, number> = { categories: 0, groups: 0, items: 0 };

  constructor(spreadsheetId: string) {
    this.api = new SheetsApi(spreadsheetId, getValidToken);
  }

  async load({ verifyWrite }: { verifyWrite: boolean }): Promise<LoadResult> {
    const info = await this.api.info();
    const byTitle = new Map(info.sheets.map((s) => [s.title, s]));
    const ownTitles = new Set<string>(Object.values(SHEETS));
    const present = ALL_KEYS.filter((k) => byTitle.has(SHEETS[k]));
    const hasData = DATA_KINDS.some((k) => byTitle.has(SHEETS[k]));
    // Without any HomeStock sheet the file must be completely empty to be adopted.
    const foreign = hasData ? [] : info.sheets.filter((s) => !ownTitles.has(s.title));

    const ranges = [...present.map((k) => quoteSheet(SHEETS[k])), ...foreign.map((s) => quoteSheet(s.title))];
    const results = await this.api.batchGet(ranges);

    const values: SheetValues = {};
    present.forEach((k, i) => (values[k] = results[i]));
    const nonEmptyForeign = foreign.filter((_, i) => !isBlankSheet(results[present.length + i]));
    if (nonEmptyForeign.length) {
      throw new AppError(
        'invalid',
        undefined,
        nonEmptyForeign.map((s) => ({ sheet: s.title, code: 'foreignData' })),
      );
    }

    let data: StockData;
    try {
      data = parseSheets(values);
    } catch (e) {
      if (e instanceof InvalidStructureError) throw new AppError('invalid', undefined, e.issues);
      throw e;
    }

    for (const k of present) {
      const s = byTitle.get(SHEETS[k])!;
      this.gridRows.set(k, { sheetId: s.sheetId, rowCount: s.rowCount });
    }
    for (const k of DATA_KINDS) this.usedRows[k] = values[k]?.length ?? 0;

    const missing = ALL_KEYS.filter((k) => !byTitle.has(SHEETS[k]));
    if (missing.length) {
      await this.createSheets(missing); // a write - also proves edit access
    } else if (verifyWrite || isBlankSheet(values.meta)) {
      await this.api.writeValues([{ range: `${quoteSheet(SHEETS.meta)}!A1:B3`, values: metaRows() }]);
    }

    return { data, title: info.title };
  }

  private async createSheets(keys: SheetKey[]) {
    const requests: unknown[] = [];
    for (const k of keys) {
      const sheetId = Math.floor(Math.random() * 1e9) + 1;
      const columns = HEADERS[k].length;
      this.gridRows.set(k, { sheetId, rowCount: 1000 });
      requests.push(
        {
          addSheet: {
            properties: {
              sheetId,
              title: SHEETS[k],
              gridProperties: { rowCount: 1000, columnCount: Math.max(columns, 8), frozenRowCount: 1 },
            },
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columns },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
      );
    }
    await this.api.batchUpdate(requests);

    const writes = keys.map((k) => {
      const rows: Rows = k === 'meta' ? metaRows() : [HEADERS[k]];
      return { range: `${quoteSheet(SHEETS[k])}!A1:${colLetter(HEADERS[k].length)}${rows.length}`, values: rows };
    });
    await this.api.writeValues(writes);
    for (const k of DATA_KINDS) if (keys.includes(k)) this.usedRows[k] = 1;
  }

  async save(data: StockData, kinds: EntityKind[]) {
    const grow: unknown[] = [];
    const writes = kinds.map((kind) => {
      const rows = serialise(kind, data);
      const width = HEADERS[kind].length;
      const total = Math.max(rows.length, this.usedRows[kind]);
      // Rewrite the whole table; rows that are no longer used get blanked in the same request.
      const padded: Rows = [...rows, ...Array.from({ length: total - rows.length }, () => Array(width).fill(''))];

      const grid = this.gridRows.get(kind);
      if (grid && total > grid.rowCount) {
        grow.push({ appendDimension: { sheetId: grid.sheetId, dimension: 'ROWS', length: total - grid.rowCount + 100 } });
        grid.rowCount = total + 100;
      }
      return { range: `${quoteSheet(SHEETS[kind])}!A1:${colLetter(width)}${total}`, values: padded, kind, used: rows.length };
    });

    await this.api.batchUpdate(grow);
    await this.api.writeValues(writes.map(({ range, values }) => ({ range, values })));
    for (const w of writes) this.usedRows[w.kind] = w.used;
  }
}

export async function createBackend(spreadsheetId: string): Promise<Backend> {
  if (import.meta.env.DEV && spreadsheetId === 'demo') {
    const { DemoBackend } = await import('./demoBackend');
    return new DemoBackend();
  }
  return new GoogleSheetsBackend(spreadsheetId);
}
