import type { ReactNode } from 'react';

/** Line icons on a 24x24 grid, drawn with currentColor. Keys are stored in the spreadsheet. */
const ICONS: Record<string, ReactNode> = {
  box: (
    <>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  food: (
    <>
      <path d="M12 7c-1.5-1-3.5-1.4-5-.6C4.6 7.6 4 10.4 4.6 13c.8 3.6 3.2 7 5.4 7 .8 0 1.3-.4 2-.4s1.2.4 2 .4c2.2 0 4.6-3.4 5.4-7 .6-2.6 0-5.4-2.4-6.6-1.5-.8-3.5-.4-5 .6z" />
      <path d="M12 7c0-2 1-3.5 3-4" />
    </>
  ),
  canned: (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" />
      <path d="M5 10.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </>
  ),
  grain: (
    <>
      <path d="M12 21V8" />
      <path d="M12 13c-2.8 0-4.5-1.7-4.5-4.5 2.8 0 4.5 1.7 4.5 4.5z" />
      <path d="M12 13c2.8 0 4.5-1.7 4.5-4.5-2.8 0-4.5 1.7-4.5 4.5z" />
      <path d="M12 18c-2.8 0-4.5-1.7-4.5-4.5 2.8 0 4.5 1.7 4.5 4.5z" />
      <path d="M12 18c2.8 0 4.5-1.7 4.5-4.5-2.8 0-4.5 1.7-4.5 4.5z" />
      <path d="M12 8c-1.2-1-1.2-3.5 0-5 1.2 1.5 1.2 4 0 5z" />
    </>
  ),
  bread: (
    <>
      <path d="M5 11a3.5 3.5 0 0 1-1-6.9C5 3.4 8 3 12 3s7 .4 8 1.1A3.5 3.5 0 0 1 19 11v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
      <path d="M9 11v6M15 11v6" />
    </>
  ),
  vegetables: (
    <>
      <path d="M15.5 8.5c-1.4-1.4-3.6-1.4-5 0L3.6 19.6c-.4.6.3 1.3.9.9l11-7c1.4-1.4 1.4-3.6 0-5z" />
      <path d="M15 9l3.5-3.5M16 3.5c.6 1.6.4 3.3-1 5.5M20.5 8c-1.6-.6-3.3-.4-5.5 1" />
      <path d="M8.5 12.5 10 14M6.5 15.5l1 1" />
    </>
  ),
  meat: (
    <>
      <path d="M6.5 12c2-3.5 5-5.5 8.5-5.5 3 0 5.5 2.5 6.5 5.5-1 3-3.5 5.5-6.5 5.5-3.5 0-6.5-2-8.5-5.5z" />
      <path d="M6.5 12 2.5 8.5v7z" />
      <path d="M17 11h.01" strokeWidth="2.6" />
    </>
  ),
  dairy: (
    <>
      <path d="M8 2h8v3l2 3.5V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8.5L8 5z" />
      <path d="M8 5h8M6 8.5h12" />
      <path d="M6 14c2-1 4 1 6 0s4-1 6 0" />
    </>
  ),
  sweets: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M8.2 10.3 4 8v8l4.2-2.3M15.8 10.3 20 8v8l-4.2-2.3" />
    </>
  ),
  frozen: (
    <>
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" />
      <path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2" />
    </>
  ),
  drinks: (
    <>
      <path d="M10 2h4" />
      <path d="M10.5 2v3.5L8 9v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9l-2.5-3.5V2" />
      <path d="M8 13h8" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H16.5" />
      <path d="M8 2.5c-.6.8-.6 1.7 0 2.5s.6 1.7 0 2.5M12 2.5c-.6.8-.6 1.7 0 2.5s.6 1.7 0 2.5" />
    </>
  ),
  kitchen: (
    <>
      <path d="M6 3v5a3 3 0 0 0 6 0V3M9 3v18" />
      <path d="M18 21V3c-2 1-3 4-3 7v3h3" />
    </>
  ),
  hygiene: (
    <>
      <rect x="3" y="11" width="14" height="9" rx="3" />
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="10.5" cy="6" r="1.5" />
      <circle cx="21" cy="10.5" r="1" />
    </>
  ),
  paper: (
    <>
      <ellipse cx="8" cy="10" rx="4" ry="6" />
      <ellipse cx="8" cy="10" rx="1.2" ry="1.8" />
      <path d="M8 4h8c2.2 0 4 2.7 4 6s-1.8 6-4 6H8" />
      <path d="M12 16v4.5h8V10" />
    </>
  ),
  cleaning: (
    <>
      <path d="M8 11a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z" />
      <path d="M10 9V6h3v3" />
      <path d="M9 6V3h5.5L17 4.5 14.5 6z" />
      <path d="M19.5 3h.01M21 5.5h.01M19.5 8h.01" strokeWidth="2.2" />
    </>
  ),
  laundry: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M4 6h16" />
      <circle cx="12" cy="13.5" r="4.5" />
      <path d="M7 4h.01M10 4h.01" strokeWidth="2.2" />
    </>
  ),
  medicine: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M12 10.5v6M9 13.5h6" />
    </>
  ),
  tools: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M8 9V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3" />
      <path d="M3 14h18M10 13v2M14 13v2" />
    </>
  ),
  electric: (
    <>
      <path d="M9 2v5M15 2v5" />
      <path d="M6 7h12v4a6 6 0 0 1-12 0z" />
      <path d="M12 17v5" />
    </>
  ),
  batteries: (
    <>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 10v4M10 10v4" />
    </>
  ),
  lighting: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3V16h6v-.9c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3z" />
    </>
  ),
  clothes: (
    <path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c0 1.7-1.8 3-4 3S8 4.7 8 3z" />
  ),
  pets: (
    <>
      <circle cx="6.5" cy="11" r="1.8" />
      <circle cx="10" cy="6.5" r="1.8" />
      <circle cx="15.5" cy="6.5" r="1.8" />
      <circle cx="19" cy="11" r="1.8" />
      <path d="M8.5 17.5c0-2.8 2-5.5 4.3-5.5s4.2 2.7 4.2 5.5c0 1.6-1.2 2.5-2.5 2.5-1 0-1.2-.5-1.8-.5s-.9.5-1.8.5c-1.3 0-2.4-.9-2.4-2.5z" />
    </>
  ),
  garden: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 12c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5z" />
      <path d="M12 14.5c0-3-2-5-6-5 0 3.5 2 5 6 5z" />
      <path d="M7 21h10" />
    </>
  ),
  car: (
    <>
      <path d="M3 16v-3.5A1.5 1.5 0 0 1 4.5 11h15a1.5 1.5 0 0 1 1.5 1.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="m5.5 11 1.8-4.4a1 1 0 0 1 .9-.6h7.6a1 1 0 0 1 .9.6l1.8 4.4" />
      <path d="M6 17v2.5M18 17v2.5" />
    </>
  ),
  documents: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11h14V9" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v9h14v-9M12 8v13" />
      <path d="M12 8c-1-3-5-4.5-5.5-2.5S9 8 12 8c3 0 5.9-.5 5.5-2.5S13 5 12 8z" />
    </>
  ),
};

export const ICON_KEYS = Object.keys(ICONS);
export const DEFAULT_ICON = 'box';
export const isKnownIcon = (key: string) => key in ICONS;

export function CategoryIcon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS[DEFAULT_ICON]}
    </svg>
  );
}
