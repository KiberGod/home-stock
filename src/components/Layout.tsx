import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../icons/ui';
import { useI18n } from '../i18n';
import type { DictKey } from '../i18n/en';
import { APP_VERSION } from '../lib/version';
import { href, setGlobalQuery, type Route } from '../router';
import { flush, reload, signIn, useStore } from '../store/store';
import { SearchField } from './bits';

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
        <path d="M3 7.5 12 12l9-4.5M12 12v9" />
      </svg>
    </span>
  );
}

function SyncIndicator() {
  const { t } = useI18n();
  const sync = useStore((s) => s.sync);
  const label = t(`sync.${sync}` as DictKey);
  return (
    <span className={`sync sync-${sync}`} title={label} aria-label={label} role="status">
      {sync === 'saving' ? <span className="spinner" /> : sync === 'error' ? <Icon name="alert" size={18} /> : <span className="sync-dot" />}
    </span>
  );
}

export function AppHeader({ route }: { route: Route }) {
  const { t } = useI18n();
  const refreshing = useStore((s) => s.refreshing);
  const routeQ = route.name === 'search' ? route.q : '';
  const [q, setQ] = useState(routeQ);
  useEffect(() => {
    setQ(routeQ);
  }, [routeQ]);

  const onSearch = (v: string) => {
    setQ(v);
    setGlobalQuery(v, route.name === 'search');
  };

  const inBrowse = ['categories', 'category', 'group'].includes(route.name);

  return (
    <header className="app-header">
      <div className="container header-row">
        <div className="brand-group">
          <a className="brand" href={href.categories()}>
            <Logo />
            <span>HomeStock</span>
          </a>
          <SyncIndicator />
        </div>
        <div className="header-search">
          <SearchField value={q} onChange={onSearch} placeholder={t('search.placeholder')} />
        </div>
        <div className="header-actions">
          <a className="icon-btn mobile-only" href={href.search()} aria-label={t('search.title')} title={t('search.title')}>
            <Icon name="search" />
          </a>
          <button
            type="button"
            className={`icon-btn ${refreshing ? 'spin' : ''}`}
            onClick={() => void reload()}
            disabled={refreshing}
            aria-label={t('refresh')}
            title={t('refresh')}
          >
            <Icon name="refresh" />
          </button>
          <a className="icon-btn" href={href.settings()} aria-label={t('settings.title')} title={t('settings.title')}>
            <Icon name="settings" />
          </a>
        </div>
      </div>
      <nav className="container tabs">
        <a href={href.categories()} className={inBrowse ? 'active' : ''}>
          <Icon name="grid" size={18} />
          {t('nav.categories')}
        </a>
        <a href={href.items()} className={route.name === 'items' ? 'active' : ''}>
          <Icon name="list" size={18} />
          {t('nav.allItems')}
        </a>
      </nav>
    </header>
  );
}

export function SyncBanner() {
  const { t } = useI18n();
  const syncError = useStore((s) => s.syncError);
  if (!syncError) return null;

  if (syncError.code === 'auth') {
    return (
      <div className="banner banner-warn">
        <Icon name="alert" />
        <span>{t('banner.auth')}</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void signIn()}>
          {t('banner.authButton')}
        </button>
      </div>
    );
  }
  if (syncError.code === 'readOnly') {
    return (
      <div className="banner banner-error">
        <Icon name="alert" />
        <span>{t('banner.readOnly')}</span>
        <a className="btn btn-sm" href={href.settings()}>
          {t('banner.change')}
        </a>
      </div>
    );
  }
  return (
    <div className="banner banner-error">
      <Icon name="alert" />
      <span>
        {t('banner.error')} {t(`error.${syncError.code}` as DictKey, { message: syncError.message })}
      </span>
      <button type="button" className="btn btn-sm" onClick={() => void flush()}>
        {t('common.retry')}
      </button>
    </div>
  );
}

export function RefreshToast() {
  const { t } = useI18n();
  const loadedAt = useStore((s) => s.loadedAt);
  const first = useRef(loadedAt);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!loadedAt || loadedAt === first.current) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(id);
  }, [loadedAt]);
  return visible ? (
    <div className="toast" role="status">
      <Icon name="check" size={18} />
      {t('refreshed')}
    </div>
  ) : null;
}

export function Footer() {
  return (
    <footer className="app-footer">
      HomeStock <span className="version">v{APP_VERSION}</span>
    </footer>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHead({
  crumbs,
  title,
  icon,
  actions,
}: {
  crumbs?: Crumb[];
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      {crumbs && crumbs.length > 0 && (
        <nav className="crumbs" aria-label="breadcrumbs">
          {crumbs.map((c, i) => (
            <span key={i}>
              {c.href ? <a href={c.href}>{c.label}</a> : c.label}
              <Icon name="chevronRight" size={14} />
            </span>
          ))}
        </nav>
      )}
      <div className="page-title-row">
        <h1 className="page-title">
          {icon}
          <span>{title}</span>
        </h1>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}
