import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Icon, type UiIconName } from '../icons/ui';
import { useI18n } from '../i18n';
import { matchRanges, type SortMode } from '../lib/selectors';
import { readJson, writeJson } from '../lib/storage';

export function ImageBox({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  return (
    <div className={`image-box ${className}`}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" draggable={false} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="image-placeholder">
          <Icon name="image" size={28} />
        </span>
      )}
    </div>
  );
}

/** Renders text with the parts matching the search query marked. */
export function Highlight({ text, query = '' }: { text: string; query?: string }) {
  const ranges = matchRanges(text, query);
  if (!ranges.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let last = 0;
  ranges.forEach(([start, end], i) => {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark key={i} className="hl">
        {text.slice(start, end)}
      </mark>,
    );
    last = end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function QtyControl({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (delta: number) => void;
  compact?: boolean;
}) {
  const { t, num } = useI18n();
  return (
    <div className={`qty ${compact ? 'qty-compact' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="qty-btn"
        onClick={() => onChange(-1)}
        disabled={value <= 0}
        aria-label={t('item.decrease')}
      >
        <Icon name="minus" size={18} />
      </button>
      <span className="qty-value" aria-live="polite">
        {num(value)}
      </span>
      <button type="button" className="qty-btn" onClick={() => onChange(1)} aria-label={t('item.increase')}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="search-field">
      <Icon name="search" size={18} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        enterKeyHint="search"
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="×">
          <Icon name="close" size={16} />
        </button>
      )}
    </label>
  );
}

/** Sort preference is per list type and remembered on this device. */
export function useSortMode(key: string): [SortMode, (m: SortMode) => void] {
  const [mode, setMode] = useState<SortMode>(() => readJson<SortMode>(`sort.${key}`, 'manual'));
  return [
    mode,
    (m) => {
      writeJson(`sort.${key}`, m);
      setMode(m);
    },
  ];
}

/**
 * Keeps a quantity-sorted list in place while quantities change, so a card doesn't jump away
 * between two +/- taps. It re-sorts when the sort mode or the set of entries changes.
 */
export function useStableQtyOrder() {
  const frozen = useRef<{ key: string; order: string[] } | null>(null);
  return <T extends { id: string }>(sorted: T[], mode: SortMode): T[] => {
    if (mode !== 'qtyDesc' && mode !== 'qtyAsc') {
      frozen.current = null;
      return sorted;
    }
    const key = `${mode}|${sorted.map((x) => x.id).sort().join(',')}`;
    if (frozen.current?.key === key) {
      const byId = new Map(sorted.map((x) => [x.id, x]));
      return frozen.current.order.map((id) => byId.get(id)!);
    }
    frozen.current = { key, order: sorted.map((x) => x.id) };
    return sorted;
  };
}

/** withQty: offer the "by stock" sorts (lists whose entries have a quantity). */
export function SortSwitch({
  value,
  onChange,
  withQty = false,
}: {
  value: SortMode;
  onChange: (m: SortMode) => void;
  withQty?: boolean;
}) {
  const { t } = useI18n();
  const opts: { v: SortMode; label: string }[] = [
    { v: 'manual', label: t('sort.manual') },
    { v: 'az', label: t('sort.az') },
    { v: 'za', label: t('sort.za') },
    ...(withQty
      ? [
          { v: 'qtyDesc' as const, label: t('sort.qtyDesc') },
          { v: 'qtyAsc' as const, label: t('sort.qtyAsc') },
        ]
      : []),
  ];
  return (
    <label className="sort-select">
      <Icon name="sort" size={16} />
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as SortMode)} aria-label={t('sort.label')}>
        {opts.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface MenuAction {
  label: string;
  icon: UiIconName;
  onSelect: () => void;
  danger?: boolean;
}

export function CardMenu({ actions }: { actions: MenuAction[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="icon-btn menu-trigger"
        aria-label={t('common.more')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="more" size={18} />
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              className={a.danger ? 'danger' : ''}
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
            >
              <Icon name={a.icon} size={16} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p>{text}</p>
      {children}
    </div>
  );
}

/** Textarea that grows with its content (never scrolls); `rows` stays the minimum height. */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    // Collapsing to `rows` (needed to shrink) briefly makes the page shorter and the browser
    // clamps the scroll position - keep it, so editing the end of a long note doesn't jump.
    const { scrollX, scrollY } = window;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`; // + borders
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo(scrollX, scrollY);
  };
  useLayoutEffect(fit, [props.value]);
  useEffect(() => {
    // line wrapping changes with the width (window resize, phone rotation)
    const ro = new ResizeObserver(fit);
    if (ref.current) ro.observe(ref.current.parentElement ?? ref.current);
    return () => ro.disconnect();
  }, []);
  return <textarea ref={ref} {...props} className={`autosize ${props.className ?? ''}`} />;
}

/**
 * A labelled form field. `group` renders a <div> instead of a <label>: a label forwards hover and
 * clicks to its first control, which is wrong when the field holds several (e.g. − input +).
 */
export function Field({
  label,
  children,
  hint,
  error,
  group = false,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  group?: boolean;
}) {
  const content = (
    <>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </>
  );
  return group ? (
    <div className="field" role="group" aria-label={label}>
      {content}
    </div>
  ) : (
    <label className="field">{content}</label>
  );
}
