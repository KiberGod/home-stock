import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PageHead } from '../components/Layout';
import { ConfirmDialog } from '../components/Modal';
import { AutoTextarea, EmptyState, Field, ImageBox } from '../components/bits';
import { Icon } from '../icons/ui';
import { useI18n } from '../i18n';
import { addItem, deleteItem, roundQty, updateItem, type ItemFields } from '../lib/ops';
import { groupsByCategory } from '../lib/selectors';
import type { Item } from '../lib/types';
import { goBack, href, setLeaveGuard } from '../router';
import { mutate, useStore } from '../store/store';
import { NotFound } from './BrowsePages';

const NOTE_MAX_LENGTH = 1000;

export function ItemEditPage({ id, group }: { id?: string; group?: string }) {
  const { t } = useI18n();
  const data = useStore((s) => s.data);
  const item = id ? data.items.find((i) => i.id === id) : undefined;

  if (id && !item) return <NotFound />;
  if (!data.groups.length) {
    return (
      <EmptyState text={t('item.needGroup')}>
        <a className="btn btn-primary" href={href.categories()}>
          {t('common.toHome')}
        </a>
      </EmptyState>
    );
  }
  // keyed so the form resets when switching between items
  return <ItemForm key={item?.id ?? 'new'} item={item} defaultGroup={group} />;
}

function ItemForm({ item, defaultGroup }: { item?: Item; defaultGroup?: string }) {
  const { t } = useI18n();
  const data = useStore((s) => s.data);
  const options = groupsByCategory(data).filter((c) => c.groups.length);
  const validGroup = (g?: string) => (g && data.groups.some((x) => x.id === g) ? g : '');

  const [name, setName] = useState(item?.name ?? '');
  const [image, setImage] = useState(item?.image ?? '');
  const [groupId, setGroupId] = useState(item?.groupId ?? validGroup(defaultGroup));
  const [qty, setQty] = useState(String(item?.quantity ?? 0));
  const [note, setNote] = useState(item?.note ?? '');
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [leave, setLeave] = useState<(() => void) | null>(null);

  // Unsaved changes: ask before leaving the page (in-app navigation, back button, tab close).
  const initial = useRef({ name, image, groupId, qty, note }).current;
  const dirty =
    name !== initial.name || image !== initial.image || groupId !== initial.groupId || qty !== initial.qty || note !== initial.note;
  const guardActive = useRef(dirty);
  guardActive.current = dirty;
  useEffect(() => {
    setLeaveGuard({ active: () => guardActive.current, confirm: (proceed) => setLeave(() => proceed) });
    return () => setLeaveGuard(null);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  /** leaving on purpose (save / delete / cancel) - no question */
  const leaveFreely = (go: () => void) => {
    setLeaveGuard(null); // not a flag: the re-render after saving would turn it back on before history.back() lands
    go();
  };

  const qtyNum = Number(qty.replace(',', '.'));
  const qtyValid = qty.trim() !== '' && Number.isFinite(qtyNum) && qtyNum >= 0;
  const step = (delta: number) => setQty(String(Math.max(0, roundQty((qtyValid ? qtyNum : 0) + delta))));

  const backTo = groupId ? href.group(groupId) : href.items();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !groupId || !qtyValid) return;
    const fields: ItemFields = { name: name.trim(), image: image.trim(), groupId, quantity: roundQty(qtyNum), note: note.trim() };
    if (item) mutate((d) => updateItem(d, item.id, fields), ['items']);
    else mutate((d) => addItem(d, fields), ['items']);
    leaveFreely(() => goBack(backTo));
  };

  const group = data.groups.find((g) => g.id === (item?.groupId ?? groupId));
  const category = data.categories.find((c) => c.id === group?.categoryId);

  return (
    <>
      <PageHead
        crumbs={[
          { label: t('nav.categories'), href: href.categories() },
          ...(category ? [{ label: category.name, href: href.category(category.id) }] : []),
          ...(group ? [{ label: group.name, href: href.group(group.id) }] : []),
        ]}
        title={item ? t('item.edit') : t('item.new')}
      />
      <form className="edit-layout" onSubmit={submit} noValidate>
        <div className="edit-preview">
          <ImageBox src={image.trim()} alt={name} className="large" />
          {image.trim() && imageFailed && <p className="field-error">{t('item.imageBroken')}</p>}
          {/* hidden probe: tells whether the link actually loads */}
          {image.trim() && (
            <img
              key={image.trim()}
              src={image.trim()}
              alt=""
              hidden
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              onLoad={() => setImageFailed(false)}
            />
          )}
        </div>

        <div className="form edit-fields">
          <Field label={t('common.name')} error={touched && !name.trim() ? t('form.required') : undefined}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus={!item} />
          </Field>

          <Field label={t('item.quantity')} error={touched && !qtyValid ? t('form.required') : undefined} group>
            <div className="qty qty-large">
              <button type="button" className="qty-btn" onClick={() => step(-1)} disabled={qtyValid && qtyNum <= 0} aria-label={t('item.decrease')}>
                <Icon name="minus" />
              </button>
              <input
                className="qty-input"
                aria-label={t('item.quantity')}
                value={qty}
                inputMode="decimal"
                onChange={(e) => setQty(e.target.value.replace(/[^\d.,]/g, ''))}
                onFocus={(e) => e.target.select()}
              />
              <button type="button" className="qty-btn" onClick={() => step(1)} aria-label={t('item.increase')}>
                <Icon name="plus" />
              </button>
            </div>
          </Field>

          <Field label={t('item.group')} error={touched && !groupId ? t('form.required') : undefined}>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {!groupId && <option value="">{t('form.chooseGroup')}</option>}
              {options.map((c) => (
                <optgroup key={c.categoryName} label={c.categoryName}>
                  {c.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field label={t('item.image')}>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder={t('item.imagePlaceholder')}
              inputMode="url"
            />
          </Field>

          <Field
            label={t('item.note')}
            hint={note.length > NOTE_MAX_LENGTH * 0.8 && <span className="counter">{`${note.length} / ${NOTE_MAX_LENGTH}`}</span>}
          >
            <AutoTextarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              placeholder={t('item.notePlaceholder')}
            />
          </Field>

          <div className="form-actions">
            {item && (
              <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={18} />
                {t('common.delete')}
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn" onClick={() => leaveFreely(() => goBack(backTo))}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t(item ? 'common.save' : 'common.create')}
            </button>
          </div>
        </div>
      </form>

      {leave && (
        <ConfirmDialog
          title={t('leave.title')}
          text={t('leave.text')}
          confirmLabel={t('leave.confirm')}
          cancelLabel={t('leave.stay')}
          onClose={() => setLeave(null)}
          onConfirm={leave}
        />
      )}

      {confirmDelete && item && (
        <ConfirmDialog
          title={t('item.deleteTitle', { name: item.name })}
          text={t('item.deleteText')}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            mutate((d) => deleteItem(d, item.id), ['items']);
            leaveFreely(() => goBack(href.group(item.groupId)));
          }}
        />
      )}
    </>
  );
}
