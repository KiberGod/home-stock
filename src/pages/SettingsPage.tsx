import { useState } from 'react';
import { PageHead } from '../components/Layout';
import { ConfirmDialog } from '../components/Modal';
import { BrandIcon, Icon } from '../icons/ui';
import { LANGUAGES, useI18n } from '../i18n';
import { settings } from '../lib/storage';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';
import { APP_VERSION } from '../lib/version';
import { disconnect, logout, reload, useStore } from '../store/store';

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="segmented" role="radiogroup" aria-label={t('settings.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={lang === l.code}
          className={lang === l.code ? 'active' : ''}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch() {
  const { t } = useI18n();
  const [pref, setPref] = useState<ThemePref>(getThemePref);
  const options: ThemePref[] = ['system', 'light', 'dark'];
  return (
    <div className="segmented" role="radiogroup" aria-label={t('settings.theme')}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={pref === o}
          className={pref === o ? 'active' : ''}
          onClick={() => {
            setThemePref(o);
            setPref(o);
          }}
        >
          {t(`theme.${o}`)}
        </button>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const { t } = useI18n();
  const title = useStore((s) => s.title);
  const refreshing = useStore((s) => s.refreshing);
  const sheet = settings.getSheet();
  const [confirm, setConfirm] = useState<'change' | 'signOut' | null>(null);

  return (
    <>
      <PageHead title={t('settings.title')} />
      <div className="settings">
        <section className="panel">
          <h2>{t('settings.language')}</h2>
          <LanguageSwitch />
        </section>

        <section className="panel">
          <h2>{t('settings.theme')}</h2>
          <ThemeSwitch />
        </section>

        <section className="panel">
          <h2>{t('settings.spreadsheet')}</h2>
          {sheet && (
            <p className="sheet-name">
              <Icon name="link" size={18} />
              <a href={`https://docs.google.com/spreadsheets/d/${sheet.id}/edit`} target="_blank" rel="noreferrer">
                {title || sheet.id}
              </a>
              <Icon name="external" size={14} />
            </p>
          )}
          <div className="button-row">
            <button type="button" className="btn" onClick={() => void reload()} disabled={refreshing}>
              <Icon name="refresh" size={18} />
              {t('settings.reload')}
            </button>
            <button type="button" className="btn" onClick={() => setConfirm('change')}>
              <Icon name="link" size={18} />
              {t('settings.change')}
            </button>
            <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirm('signOut')}>
              <Icon name="logout" size={18} />
              {t('settings.signOut')}
            </button>
          </div>
          <p className="field-hint">{t('settings.signOutHint')}</p>
        </section>

        <section className="panel">
          <h2>{t('settings.structure')}</h2>
          <p className="muted">{t('settings.structureText')}</p>
        </section>

        <section className="panel">
          <h2>{t('settings.about')}</h2>
          <p className="muted">
            HomeStock · {t('settings.version', { v: APP_VERSION })}
          </p>
          <p className="muted">
            {t('settings.developer')}: <strong className="developer">kiber_god</strong>
          </p>
          <div className="button-row">
            <a className="btn" href="https://github.com/KiberGod" target="_blank" rel="noreferrer">
              <BrandIcon name="github" size={18} />
              GitHub
            </a>
            <a className="btn" href="https://t.me/kiber_god" target="_blank" rel="noreferrer">
              <BrandIcon name="telegram" size={18} />
              Telegram
            </a>
          </div>
        </section>
      </div>

      {confirm === 'change' && (
        <ConfirmDialog
          title={t('settings.changeConfirmTitle')}
          text={t('settings.changeConfirmText')}
          confirmLabel={t('settings.change')}
          danger={false}
          onClose={() => setConfirm(null)}
          onConfirm={disconnect}
        />
      )}
      {confirm === 'signOut' && (
        <ConfirmDialog
          title={t('settings.signOutConfirmTitle')}
          text={t('settings.signOutHint')}
          confirmLabel={t('settings.signOut')}
          onClose={() => setConfirm(null)}
          onConfirm={logout}
        />
      )}
    </>
  );
}
