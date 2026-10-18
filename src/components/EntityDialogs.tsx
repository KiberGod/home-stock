import { useState, type FormEvent, type ReactNode } from 'react';
import { CategoryIcon, DEFAULT_ICON, ICON_KEYS } from '../icons/categoryIcons';
import { useI18n } from '../i18n';
import type { DictKey } from '../i18n/en';
import { addCategory, addGroup, deleteCategory, deleteGroup, updateCategory, updateGroup } from '../lib/ops';
import { byPosition, groupsOf, itemsOf } from '../lib/selectors';
import type { Category, Group } from '../lib/types';
import { mutate, useStore } from '../store/store';
import { Field, type MenuAction } from './bits';
import { ConfirmDialog, Modal } from './Modal';

export function CategoryFormModal({ category, onClose }: { category?: Category; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? DEFAULT_ICON);
  const [touched, setTouched] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setTouched(true);
    if (category) mutate((d) => updateCategory(d, category.id, { name: n, icon }), ['categories']);
    else mutate((d) => addCategory(d, { name: n, icon }), ['categories']);
    onClose();
  };

  return (
    <Modal
      title={t(category ? 'category.edit' : 'category.new')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="category-form" className="btn btn-primary">
            {t(category ? 'common.save' : 'common.create')}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="form">
        <Field label={t('common.name')} error={touched && !name.trim() ? t('form.required') : undefined}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
           
            placeholder={t(`icon.${icon}` as DictKey)}
            maxLength={80}
          />
        </Field>
        <div className="field">
          <span className="field-label">{t('category.icon')}</span>
          <div className="icon-picker" role="radiogroup">
            {ICON_KEYS.map((key) => (
              <button
                type="button"
                key={key}
                role="radio"
                aria-checked={icon === key}
                className={icon === key ? 'active' : ''}
                title={t(`icon.${key}` as DictKey)}
                aria-label={t(`icon.${key}` as DictKey)}
                onClick={() => {
                  // suggest the icon's name for an empty new category
                  if (!category && !name.trim()) setName(t(`icon.${key}` as DictKey));
                  setIcon(key);
                }}
              >
                <CategoryIcon name={key} size={26} />
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function GroupFormModal({
  group,
  categoryId,
  onClose,
}: {
  group?: Group;
  categoryId?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const categories = useStore((s) => s.data.categories);
  const [name, setName] = useState(group?.name ?? '');
  const [cat, setCat] = useState(group?.categoryId ?? categoryId ?? [...categories].sort(byPosition)[0]?.id ?? '');
  const [touched, setTouched] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || !cat) return setTouched(true);
    if (group) mutate((d) => updateGroup(d, group.id, { name: n, categoryId: cat }), ['groups']);
    else mutate((d) => addGroup(d, { name: n, categoryId: cat }), ['groups']);
    onClose();
  };

  return (
    <Modal
      title={t(group ? 'group.edit' : 'group.new')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="group-form" className="btn btn-primary">
            {t(group ? 'common.save' : 'common.create')}
          </button>
        </>
      }
    >
      <form id="group-form" onSubmit={submit} className="form">
        <Field label={t('common.name')} error={touched && !name.trim() ? t('form.required') : undefined}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label={t('group.category')}>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {[...categories].sort(byPosition).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

type Dialog =
  | { kind: 'newCategory' }
  | { kind: 'editCategory'; category: Category }
  | { kind: 'deleteCategory'; category: Category }
  | { kind: 'newGroup'; categoryId?: string }
  | { kind: 'editGroup'; group: Group }
  | { kind: 'deleteGroup'; group: Group };

/**
 * Shared create/edit/delete dialogs for categories and groups. Render `dialogs` once per page.
 * `onDeleted` tells which entity was removed, so a page can leave only when it was its own.
 */
export function useEntityDialogs(opts: { onDeleted?: (kind: 'category' | 'group', id: string) => void } = {}) {
  const { t, tn } = useI18n();
  const data = useStore((s) => s.data);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  let dialogs: ReactNode = null;
  if (dialog?.kind === 'newCategory') dialogs = <CategoryFormModal onClose={close} />;
  if (dialog?.kind === 'editCategory') dialogs = <CategoryFormModal category={dialog.category} onClose={close} />;
  if (dialog?.kind === 'newGroup') dialogs = <GroupFormModal categoryId={dialog.categoryId} onClose={close} />;
  if (dialog?.kind === 'editGroup') dialogs = <GroupFormModal group={dialog.group} onClose={close} />;
  if (dialog?.kind === 'deleteCategory') {
    const c = dialog.category;
    const groups = groupsOf(data, c.id);
    const items = groups.reduce((n, g) => n + itemsOf(data, g.id).length, 0);
    dialogs = (
      <ConfirmDialog
        title={t('category.deleteTitle', { name: c.name })}
        text={
          groups.length
            ? t('category.deleteText', { groups: tn('counts.groups', groups.length), items: tn('counts.items', items) })
            : t('category.deleteTextEmpty')
        }
        onClose={close}
        onConfirm={() => {
          mutate((d) => deleteCategory(d, c.id), ['categories', 'groups', 'items']);
          opts.onDeleted?.('category', c.id);
        }}
      />
    );
  }
  if (dialog?.kind === 'deleteGroup') {
    const g = dialog.group;
    const items = itemsOf(data, g.id).length;
    dialogs = (
      <ConfirmDialog
        title={t('group.deleteTitle', { name: g.name })}
        text={items ? t('group.deleteText', { items: tn('counts.items', items) }) : t('group.deleteTextEmpty')}
        onClose={close}
        onConfirm={() => {
          mutate((d) => deleteGroup(d, g.id), ['groups', 'items']);
          opts.onDeleted?.('group', g.id);
        }}
      />
    );
  }

  const categoryActions = (category: Category): MenuAction[] => [
    { label: t('common.edit'), icon: 'edit', onSelect: () => setDialog({ kind: 'editCategory', category }) },
    { label: t('common.delete'), icon: 'trash', danger: true, onSelect: () => setDialog({ kind: 'deleteCategory', category }) },
  ];
  const groupActions = (group: Group): MenuAction[] => [
    { label: t('common.edit'), icon: 'edit', onSelect: () => setDialog({ kind: 'editGroup', group }) },
    { label: t('common.delete'), icon: 'trash', danger: true, onSelect: () => setDialog({ kind: 'deleteGroup', group }) },
  ];

  return {
    dialogs,
    categoryActions,
    groupActions,
    newCategory: () => setDialog({ kind: 'newCategory' }),
    newGroup: (categoryId?: string) => setDialog({ kind: 'newGroup', categoryId }),
  };
}
