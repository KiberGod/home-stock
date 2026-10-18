export interface Category {
  id: string;
  name: string;
  icon: string;
  position: number;
}

export interface Group {
  id: string;
  name: string;
  categoryId: string;
  position: number;
}

export interface Item {
  id: string;
  name: string;
  image: string;
  quantity: number;
  note: string;
  groupId: string;
  position: number;
}

export interface StockData {
  categories: Category[];
  groups: Group[];
  items: Item[];
}

export type EntityKind = 'categories' | 'groups' | 'items';

export const EMPTY_DATA: StockData = { categories: [], groups: [], items: [] };
