import type React from 'react';
import { CategoryIcon } from '../icons/categoryIcons';
import { useI18n } from '../i18n';
import { changeQuantity } from '../lib/ops';
import type { Category, Group, Item } from '../lib/types';
import { href, navigate } from '../router';
import { mutate } from '../store/store';
import { CardMenu, Highlight, ImageBox, QtyControl, type MenuAction } from './bits';

const open = (to: string) => () => navigate(to);
// the card itself handles the click; the link is there for keyboard and middle-click
const linkClick = (e: React.MouseEvent) => e.stopPropagation();

export function CategoryCard({
  category,
  groupCount,
  actions,
  highlight,
}: {
  category: Category;
  groupCount: number;
  actions: MenuAction[];
  highlight?: string;
}) {
  const { tn } = useI18n();
  return (
    <article className="card card-category" onClick={open(href.category(category.id))}>
      <div className="category-icon">
        <CategoryIcon name={category.icon} size={30} />
      </div>
      <div className="card-body">
        <a className="card-title" href={href.category(category.id)} onClick={linkClick} draggable={false}>
          <Highlight text={category.name} query={highlight} />
        </a>
        <span className="card-meta">{tn('counts.groups', groupCount)}</span>
      </div>
      <CardMenu actions={actions} />
    </article>
  );
}

export function GroupCard({
  group,
  image,
  total,
  itemCount,
  actions,
  highlight,
}: {
  group: Group;
  image: string;
  total: number;
  itemCount: number;
  actions: MenuAction[];
  highlight?: string;
}) {
  const { tn } = useI18n();
  return (
    <article className={`card card-media ${total === 0 ? 'is-empty' : ''}`} onClick={open(href.group(group.id))}>
      <ImageBox src={image} alt={group.name} />
      <div className="card-body">
        <a className="card-title" href={href.group(group.id)} onClick={linkClick} draggable={false}>
          <Highlight text={group.name} query={highlight} />
        </a>
        <span className="card-meta">
          <strong>{tn('counts.pcs', total)}</strong> · {tn('counts.items', itemCount)}
        </span>
      </div>
      <CardMenu actions={actions} />
    </article>
  );
}

export function ItemCard({ item, subtitle, highlight }: { item: Item; subtitle?: string; highlight?: string }) {
  const { t } = useI18n();
  const out = item.quantity <= 0;
  return (
    <article className={`card card-media card-item ${out ? 'is-empty' : ''}`} onClick={open(href.item(item.id))}>
      <ImageBox src={item.image} alt={item.name} />
      {out && <span className="badge">{t('item.outOfStock')}</span>}
      <div className="card-body">
        <a className="card-title" href={href.item(item.id)} onClick={linkClick} draggable={false}>
          <Highlight text={item.name} query={highlight} />
        </a>
        {subtitle && <span className="card-meta">{subtitle}</span>}
        {item.note && (
          <span className="card-note" title={item.note}>
            <Highlight text={item.note} query={highlight} />
          </span>
        )}
      </div>
      <QtyControl value={item.quantity} onChange={(delta) => mutate((d) => changeQuantity(d, item.id, delta), ['items'])} />
    </article>
  );
}
