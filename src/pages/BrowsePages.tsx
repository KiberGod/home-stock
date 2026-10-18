import { useMemo, useState, type ReactNode } from 'react';
import { CategoryCard, GroupCard, ItemCard } from '../components/Cards';
import { useEntityDialogs } from '../components/EntityDialogs';
import { PageHead } from '../components/Layout';
import { SortableGrid } from '../components/SortableGrid';
import { CardMenu, EmptyState, SearchField, SortSwitch, useSortMode, useStableQtyOrder } from '../components/bits';
import { CategoryIcon } from '../icons/categoryIcons';
import { Icon } from '../icons/ui';
import { useI18n } from '../i18n';
import { reorderCategories, reorderGroups, reorderItems } from '../lib/ops';
import { computeGroupStats, groupsByCategory, groupsOf, matches, sortList } from '../lib/selectors';
import type { Group, Item } from '../lib/types';
import { href, navigate, setGlobalQuery } from '../router';
import { mutate, useStore } from '../store/store';

function useData() {
  const data = useStore((s) => s.data);
  const stats = useMemo(() => computeGroupStats(data), [data]);
  return { data, stats };
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <EmptyState text={t('common.notFound')}>
      <a className="btn" href={href.categories()}>
        {t('common.toHome')}
      </a>
    </EmptyState>
  );
}

function DragHint({ show }: { show: boolean }) {
  const { t } = useI18n();
  return show ? <p className="hint">{t('drag.hint')}</p> : null;
}

function AddButton({ label, onClick, to }: { label: string; onClick?: () => void; to?: string }) {
  const content = (
    <>
      <Icon name="plus" size={18} />
      <span>{label}</span>
    </>
  );
  return to ? (
    <a className="btn btn-primary" href={to}>
      {content}
    </a>
  ) : (
    <button type="button" className="btn btn-primary" onClick={onClick}>
      {content}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function CategoriesPage() {
  const { t, lang } = useI18n();
  const { data } = useData();
  const [sort, setSort] = useSortMode('categories');
  const ents = useEntityDialogs();
  const list = sortList(data.categories, sort, lang);
  const groupCount = (id: string) => data.groups.filter((g) => g.categoryId === id).length;

  return (
    <>
      <PageHead title={t('nav.categories')} actions={<AddButton label={t('category.add')} onClick={ents.newCategory} />} />
      {list.length ? (
        <>
          <div className="toolbar">
            <SortSwitch value={sort} onChange={setSort} />
          </div>
          <SortableGrid
            items={list}
            getId={(c) => c.id}
            className="grid grid-categories"
            disabled={sort !== 'manual'}
            onReorder={(ids) => mutate((d) => reorderCategories(d, ids), ['categories'])}
            render={(c) => <CategoryCard category={c} groupCount={groupCount(c.id)} actions={ents.categoryActions(c)} />}
          />
          <DragHint show={sort === 'manual' && list.length > 1} />
        </>
      ) : (
        <EmptyState text={t('category.empty')}>
          <AddButton label={t('category.add')} onClick={ents.newCategory} />
        </EmptyState>
      )}
      {ents.dialogs}
    </>
  );
}

// ---------------------------------------------------------------------------

function GroupGrid({
  groups,
  stats,
  sortable,
  actions,
  highlight,
}: {
  groups: Group[];
  stats: ReturnType<typeof computeGroupStats>;
  sortable: boolean;
  actions: ReturnType<typeof useEntityDialogs>['groupActions'];
  highlight?: string;
}) {
  return (
    <SortableGrid
      items={groups}
      getId={(g) => g.id}
      disabled={!sortable}
      onReorder={(ids) => mutate((d) => reorderGroups(d, ids), ['groups'])}
      render={(g) => {
        const s = stats.get(g.id);
        return (
          <GroupCard
            group={g}
            image={s?.image ?? ''}
            total={s?.total ?? 0}
            itemCount={s?.count ?? 0}
            actions={actions(g)}
            highlight={highlight}
          />
        );
      }}
    />
  );
}

function ItemGrid({
  items,
  sortable,
  subtitle,
  highlight,
}: {
  items: Item[];
  sortable: boolean;
  subtitle?: (i: Item) => string;
  highlight?: string;
}) {
  return (
    <SortableGrid
      items={items}
      getId={(i) => i.id}
      disabled={!sortable}
      onReorder={(ids) => mutate((d) => reorderItems(d, ids), ['items'])}
      render={(i) => <ItemCard item={i} subtitle={subtitle?.(i)} highlight={highlight} />}
    />
  );
}

export function CategoryPage({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const { data, stats } = useData();
  const [sort, setSort] = useSortMode('groups');
  const [q, setQ] = useState('');
  const stableItems = useStableQtyOrder();
  const ents = useEntityDialogs({ onDeleted: () => navigate(href.categories(), { replace: true }) });
  const category = data.categories.find((c) => c.id === id);
  if (!category) return <NotFound />;

  const groups = groupsOf(data, id);
  const query = q.trim();
  const shownGroups = sortList(query ? groups.filter((g) => matches(g.name, query)) : groups, sort, lang, (g) =>
    stats.get(g.id)?.total ?? 0,
  );
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const itemSort = sort === 'manual' ? 'az' : sort;
  const foundItems = query
    ? stableItems(
        sortList(
          data.items.filter((i) => groupName.has(i.groupId) && matches(i.name, query)),
          itemSort,
          lang,
          (i) => i.quantity,
        ),
        itemSort,
      )
    : [];

  return (
    <>
      <PageHead
        crumbs={[{ label: t('nav.categories'), href: href.categories() }]}
        title={category.name}
        icon={
          <span className="title-icon">
            <CategoryIcon name={category.icon} size={22} />
          </span>
        }
        actions={
          <>
            <AddButton label={t('group.add')} onClick={() => ents.newGroup(id)} />
            <CardMenu actions={ents.categoryActions(category)} />
          </>
        }
      />
      {groups.length ? (
        <>
          <div className="toolbar">
            <SearchField value={q} onChange={setQ} placeholder={t('search.inCategory')} />
            <SortSwitch value={sort} onChange={setSort} withQty />
          </div>
          {query ? (
            <SearchResults q={query} empty={!shownGroups.length && !foundItems.length}>
              {shownGroups.length > 0 && (
                <Section title={t('section.groups')}>
                  <GroupGrid groups={shownGroups} stats={stats} sortable={false} actions={ents.groupActions} highlight={query} />
                </Section>
              )}
              {foundItems.length > 0 && (
                <Section title={t('section.items')}>
                  <ItemGrid
                    items={foundItems}
                    sortable={false}
                    subtitle={(i) => groupName.get(i.groupId) ?? ''}
                    highlight={query}
                  />
                </Section>
              )}
            </SearchResults>
          ) : (
            <>
              <GroupGrid groups={shownGroups} stats={stats} sortable={sort === 'manual'} actions={ents.groupActions} />
              <DragHint show={sort === 'manual' && groups.length > 1} />
            </>
          )}
        </>
      ) : (
        <EmptyState text={t('group.empty')}>
          <AddButton label={t('group.add')} onClick={() => ents.newGroup(id)} />
        </EmptyState>
      )}
      {ents.dialogs}
    </>
  );
}

export function GroupPage({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const { data, stats } = useData();
  const [sort, setSort] = useSortMode('items');
  const [q, setQ] = useState('');
  const stable = useStableQtyOrder();
  const group = data.groups.find((g) => g.id === id);
  const category = data.categories.find((c) => c.id === group?.categoryId);
  const ents = useEntityDialogs({
    onDeleted: () => navigate(category ? href.category(category.id) : href.categories(), { replace: true }),
  });
  if (!group || !category) return <NotFound />;

  const items = data.items.filter((i) => i.groupId === id);
  const query = q.trim();
  const shown = stable(sortList(query ? items.filter((i) => matches(i.name, query)) : items, sort, lang, (i) => i.quantity), sort);
  const total = stats.get(id)?.total ?? 0;

  return (
    <>
      <PageHead
        crumbs={[
          { label: t('nav.categories'), href: href.categories() },
          { label: category.name, href: href.category(category.id) },
        ]}
        title={group.name}
        actions={
          <>
            <AddButton label={t('item.add')} to={href.itemNew(id)} />
            <CardMenu actions={ents.groupActions(group)} />
          </>
        }
      />
      <GroupSummary total={total} count={items.length} />
      {items.length ? (
        <>
          <div className="toolbar">
            <SearchField value={q} onChange={setQ} placeholder={t('search.inGroup')} />
            <SortSwitch value={sort} onChange={setSort} withQty />
          </div>
          {query && !shown.length ? (
            <SearchResults q={query} empty />
          ) : (
            <ItemGrid items={shown} sortable={sort === 'manual' && !query} highlight={query} />
          )}
          <DragHint show={sort === 'manual' && !query && items.length > 1} />
        </>
      ) : (
        <EmptyState text={t('item.empty')}>
          <AddButton label={t('item.add')} to={href.itemNew(id)} />
        </EmptyState>
      )}
      {ents.dialogs}
    </>
  );
}

function GroupSummary({ total, count }: { total: number; count: number }) {
  const { tn } = useI18n();
  return (
    <p className="summary">
      <strong>{tn('counts.pcs', total)}</strong> · {tn('counts.items', count)}
    </p>
  );
}

// ---------------------------------------------------------------------------

export function AllItemsPage({ group }: { group: string }) {
  const { t, lang } = useI18n();
  const { data } = useData();
  const [sort, setSort] = useSortMode('items');
  const [q, setQ] = useState('');
  const stable = useStableQtyOrder();

  const options = groupsByCategory(data).filter((c) => c.groups.length);
  const groupInfo = useMemo(() => {
    const cats = new Map(data.categories.map((c) => [c.id, c]));
    return new Map(data.groups.map((g) => [g.id, { group: g, category: cats.get(g.categoryId) }]));
  }, [data]);
  const activeGroup = groupInfo.has(group) ? group : '';

  const query = q.trim();
  let items = activeGroup ? data.items.filter((i) => i.groupId === activeGroup) : data.items;
  if (query) items = items.filter((i) => matches(i.name, query));

  let shown: Item[];
  if (sort === 'manual' && !activeGroup) {
    // "Default" order of the flat list follows the category -> group -> item order.
    const rank = (i: Item) => {
      const info = groupInfo.get(i.groupId);
      return [info?.category?.position ?? 0, info?.group.position ?? 0, i.position];
    };
    shown = [...items].sort((a, b) => {
      const [ra, rb] = [rank(a), rank(b)];
      return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
    });
  } else {
    shown = sortList(items, sort, lang, (i) => i.quantity);
  }
  shown = stable(shown, sort);
  const sortable = sort === 'manual' && !!activeGroup && !query;

  const setGroup = (g: string) => navigate(href.items(g), { replace: true });

  return (
    <>
      <PageHead title={t('nav.allItems')} actions={<AddButton label={t('item.add')} to={href.itemNew(activeGroup)} />} />
      {data.items.length ? (
        <>
          <div className="toolbar">
            <select className="select" value={activeGroup} onChange={(e) => setGroup(e.target.value)} aria-label={t('filter.group')}>
              <option value="">{t('filter.allGroups')}</option>
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
            <SearchField value={q} onChange={setQ} placeholder={t('search.inItems')} />
            <SortSwitch value={sort} onChange={setSort} withQty />
          </div>
          {activeGroup && <GroupSummary total={items.reduce((s, i) => s + i.quantity, 0)} count={items.length} />}
          {shown.length ? (
            <ItemGrid
              items={shown}
              sortable={sortable}
              subtitle={activeGroup ? undefined : (i) => groupInfo.get(i.groupId)?.group.name ?? ''}
              highlight={query}
            />
          ) : query ? (
            <SearchResults q={query} empty />
          ) : (
            <EmptyState text={t('item.empty')} />
          )}
          <DragHint show={sortable && shown.length > 1} />
        </>
      ) : (
        <EmptyState text={data.groups.length ? t('item.empty') : t('item.needGroup')}>
          {data.groups.length ? (
            <AddButton label={t('item.add')} to={href.itemNew()} />
          ) : (
            <a className="btn" href={href.categories()}>
              {t('common.toHome')}
            </a>
          )}
        </EmptyState>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

export function SearchPage({ q }: { q: string }) {
  const { t, lang } = useI18n();
  const { data, stats } = useData();
  const ents = useEntityDialogs();
  const query = q.trim();

  const cats = new Map(data.categories.map((c) => [c.id, c]));
  const groups = new Map(data.groups.map((g) => [g.id, g]));
  const foundCats = query ? sortList(data.categories.filter((c) => matches(c.name, query)), 'az', lang) : [];
  const foundGroups = query ? sortList(data.groups.filter((g) => matches(g.name, query)), 'az', lang) : [];
  const foundItems = query
    ? sortList(data.items.filter((i) => matches(i.name, query) || matches(i.note, query)), 'az', lang)
    : [];
  const path = (i: Item) => {
    const g = groups.get(i.groupId);
    return [cats.get(g?.categoryId ?? '')?.name, g?.name].filter(Boolean).join(' › ');
  };
  const groupCount = (id: string) => data.groups.filter((g) => g.categoryId === id).length;

  return (
    <>
      <div className="mobile-only search-page-field">
        <SearchField
          value={q}
          autoFocus={!q}
          onChange={(v) => setGlobalQuery(v, true)}
          placeholder={t('search.placeholder')}
        />
      </div>
      <PageHead title={t('search.title')} />
      {!query ? (
        <EmptyState text={t('search.hint')} />
      ) : (
        <SearchResults q={query} empty={!foundCats.length && !foundGroups.length && !foundItems.length}>
          {foundCats.length > 0 && (
            <Section title={t('section.categories')}>
              <div className="grid grid-categories">
                {foundCats.map((c) => (
                  <CategoryCard
                    key={c.id}
                    category={c}
                    groupCount={groupCount(c.id)}
                    actions={ents.categoryActions(c)}
                    highlight={query}
                  />
                ))}
              </div>
            </Section>
          )}
          {foundGroups.length > 0 && (
            <Section title={t('section.groups')}>
              <div className="grid">
                {foundGroups.map((g) => {
                  const s = stats.get(g.id);
                  return (
                    <GroupCard
                      key={g.id}
                      group={g}
                      image={s?.image ?? ''}
                      total={s?.total ?? 0}
                      itemCount={s?.count ?? 0}
                      actions={ents.groupActions(g)}
                      highlight={query}
                    />
                  );
                })}
              </div>
            </Section>
          )}
          {foundItems.length > 0 && (
            <Section title={t('section.items')}>
              <ItemGrid items={foundItems} sortable={false} subtitle={path} highlight={query} />
            </Section>
          )}
        </SearchResults>
      )}
      {ents.dialogs}
    </>
  );
}

function SearchResults({ q, empty, children }: { q: string; empty: boolean; children?: ReactNode }) {
  const { t } = useI18n();
  if (empty) return <EmptyState text={t('search.nothing', { q })} />;
  return <div className="results">{children}</div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}
