'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EllipsisVertical, ExternalLink, EyeOff, Eye, GripVertical, Images, Pencil, Trash2 } from 'lucide-react';
import styles from './AdminShell.module.css';
import type { GalleriesState } from './useGalleries';
import type { Gallery } from '@/types';

type Filter = 'all' | 'published' | 'drafts';
type Sort = 'custom' | 'name' | 'newest';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function GalleriesOverview({ state, onOpen }: { state: GalleriesState; onOpen: (id: string) => void }) {
  const { galleries, covers, photoCounts, loading } = state;
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('custom');

  const shown = galleries
    .filter((g) => (filter === 'all' ? true : filter === 'published' ? g.published : !g.published))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title)
      : sort === 'newest' ? Date.parse(b.created_at) - Date.parse(a.created_at)
      : 0);
  // Dragging sets the site's order, so it only makes sense on the full, custom-ordered list.
  const canDrag = sort === 'custom' && filter === 'all';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    state.reorder(arrayMove(galleries, galleries.findIndex((g) => g.id === active.id), galleries.findIndex((g) => g.id === over.id)));
  };

  return (
    <div className={styles.contentPad}>
      {state.isDemoMode && (
        <div className={styles.notice}>
          <span>Demo mode — changes are saved in this browser. Connect Supabase for shared production data.</span>
          <button type="button" className={styles.chip} onClick={state.seedDemo}>Seed to database</button>
        </div>
      )}
      {state.error && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <span>{state.error}</span>
          <button type="button" className={styles.chip} onClick={() => state.setError('')}>Dismiss</button>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.chips} role="group" aria-label="Show">
          {(['all', 'published', 'drafts'] as Filter[]).map((f) => (
            <button key={f} type="button" className={styles.chip} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'published' ? 'Published' : 'Drafts'}
            </button>
          ))}
        </div>
        <label className={styles.sort}>
          Sort by:
          <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="custom">Site order</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>

      {!canDrag && galleries.length > 1 && (
        <p className={styles.notice}>Switch to All and Site order to drag galleries into a new order.</p>
      )}

      {loading && <p className={styles.empty}>Loading galleries…</p>}
      {!loading && shown.length === 0 && <p className={styles.empty}>No galleries here yet.</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={shown.map((g) => g.id)} strategy={rectSortingStrategy}>
          <div className={styles.cardGrid}>
            {shown.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                cover={covers[gallery.id]}
                photoCount={photoCounts[gallery.id] ?? 0}
                canDrag={canDrag}
                onOpen={() => onOpen(gallery.id)}
                onTogglePublished={() => state.setPublished(gallery.id, !gallery.published)}
                onDelete={() => state.remove(gallery.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function GalleryCard({ gallery, cover, photoCount, canDrag, onOpen, onTogglePublished, onDelete }: {
  gallery: Gallery; cover?: string; photoCount: number; canDrag: boolean;
  onOpen: () => void; onTogglePublished: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: gallery.id, disabled: !canDrag });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <article
      ref={setNodeRef}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button type="button" className={styles.cardButton} onClick={onOpen} aria-label={`Edit ${gallery.title}`}>
        {cover
          ? <Image src={cover} alt="" fill unoptimized sizes="(max-width: 860px) 100vw, 45vw" />
          : <span className={styles.cardEmpty}><Images size={40} aria-hidden="true" /></span>}
        <span className={styles.cardShade} />
        <span className={styles.cardText}>
          <span className={styles.cardMeta}>
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'} <i aria-hidden="true" /> {formatDate(gallery.created_at)}
          </span>
          <span className={styles.cardTitle} style={{ display: 'block' }}>{gallery.title}</span>
        </span>
      </button>
      {!gallery.published && <span className={styles.draftTag}>Draft</span>}

      <div className={styles.cardTools} ref={menuRef}>
        {canDrag && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className={`${styles.cardIcon} ${styles.cardGrip}`}
            aria-label={`Move ${gallery.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={18} aria-hidden="true" />
          </button>
        )}
        <button type="button" className={styles.cardIcon} aria-label={`More actions for ${gallery.title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <EllipsisVertical size={18} aria-hidden="true" />
        </button>
        {menuOpen && (
          <div className={`${styles.menu} ${styles.menuDown}`} role="menu" style={{ right: 0 }}>
            <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); onOpen(); }}>
              <Pencil size={16} aria-hidden="true" /> Edit gallery
            </button>
            <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); onTogglePublished(); }}>
              {gallery.published ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              {gallery.published ? 'Unpublish' : 'Publish'}
            </button>
            {gallery.published && (
              <a role="menuitem" className={styles.menuItem} href={`/gallery/${gallery.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} aria-hidden="true" /> View on site
              </a>
            )}
            <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => { setMenuOpen(false); onDelete(); }}>
              <Trash2 size={16} aria-hidden="true" /> Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
