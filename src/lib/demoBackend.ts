// Development-only backend (link "demo" in `npm run dev`): keeps the "spreadsheet"
// in localStorage so the UI can be exercised without a Google account.
import type { Backend, LoadResult } from './backend';
import { DATA_KINDS, parseSheets, serialise, type SheetValues } from './schema';
import { readJson, writeJson } from './storage';
import type { EntityKind, StockData } from './types';

const KEY = 'demoSheet';
const delay = () => new Promise((r) => setTimeout(r, 250));

function seed(): SheetValues {
  const data: StockData = {
    categories: [
      { id: 'c1', name: 'Продукты', icon: 'food', position: 1 },
      { id: 'c2', name: 'Гигиена', icon: 'hygiene', position: 2 },
      { id: 'c3', name: 'Бытовая химия', icon: 'cleaning', position: 3 },
    ],
    groups: [
      { id: 'g1', name: 'Тушёнка', categoryId: 'c1', position: 1 },
      { id: 'g2', name: 'Крупы', categoryId: 'c1', position: 2 },
      { id: 'g3', name: 'Мыло', categoryId: 'c2', position: 1 },
      { id: 'g4', name: 'Бритвы', categoryId: 'c2', position: 2 },
    ],
    items: [
      { id: 'i1', name: 'Тушёнка говяжья', image: '', quantity: 6, note: '', groupId: 'g1', position: 1 },
      { id: 'i2', name: 'Тушёнка свиная', image: '', quantity: 3, note: 'Брать ГОСТ', groupId: 'g1', position: 2 },
      { id: 'i3', name: 'Гречка', image: '', quantity: 4, note: '', groupId: 'g2', position: 1 },
      { id: 'i4', name: 'Рис', image: '', quantity: 0, note: '', groupId: 'g2', position: 2 },
      { id: 'i5', name: 'Мыло детское', image: '', quantity: 5, note: '', groupId: 'g3', position: 1 },
      { id: 'i6', name: 'Кассеты для бритвы', image: '', quantity: 8, note: '', groupId: 'g4', position: 1 },
    ],
  };
  return Object.fromEntries(DATA_KINDS.map((k) => [k, serialise(k, data)]));
}

export class DemoBackend implements Backend {
  async load(): Promise<LoadResult> {
    await delay();
    let sheet = readJson<SheetValues | null>(KEY, null);
    if (!sheet) {
      sheet = seed();
      writeJson(KEY, sheet);
    }
    return { data: parseSheets(sheet), title: 'Demo' };
  }

  async save(data: StockData, kinds: EntityKind[]) {
    await delay();
    const sheet = readJson<SheetValues>(KEY, {});
    for (const k of kinds) sheet[k] = serialise(k, data);
    writeJson(KEY, sheet);
  }
}
