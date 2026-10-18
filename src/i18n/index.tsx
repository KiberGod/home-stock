import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import en, { type Dict, type DictKey, type Plural } from './en';
import ru from './ru';
import uk from './uk';
import { readJson, writeJson } from '../lib/storage';

export const LANGUAGES = [
  { code: 'uk', label: 'Українська' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
] as const;
export type Lang = (typeof LANGUAGES)[number]['code'];

const DICTS: Record<Lang, Dict> = { en, ru, uk };

function detectLang(): Lang {
  const saved = readJson<string | null>('lang', null);
  if (saved && saved in DICTS) return saved as Lang;
  for (const l of navigator.languages ?? [navigator.language]) {
    const code = l.slice(0, 2).toLowerCase();
    if (code in DICTS) return code as Lang;
  }
  return 'en';
}

type Params = Record<string, string | number>;
const fill = (s: string, p?: Params) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : s);

export interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, params?: Params) => string;
  /** plural-aware: picks the form for n and fills {n} */
  tn: (key: DictKey, n: number) => string;
  num: (n: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang];
    const rules = new Intl.PluralRules(lang);
    const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: 3 });
    const raw = (key: DictKey) => dict[key] ?? en[key];
    document.documentElement.lang = lang;
    return {
      lang,
      setLang: (l) => {
        writeJson('lang', l);
        setLangState(l);
      },
      t: (key, params) => {
        const v = raw(key);
        return fill(typeof v === 'string' ? v : v.other, params);
      },
      tn: (key, n) => {
        const v = raw(key);
        if (typeof v === 'string') return fill(v, { n: nf.format(n) });
        const form = (v as Plural)[rules.select(n) as keyof Plural] ?? v.other;
        return fill(form, { n: nf.format(n) });
      },
      num: (n) => nf.format(n),
    };
  }, [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}
