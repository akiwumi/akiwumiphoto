'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown, ArrowLeft, ArrowUp, Bold, CornerDownRight, ExternalLink, FilePlus2, FileText, GripVertical, Heading2, Heading3,
  ImagePlus, Italic, LayoutTemplate, Link2, List, Pencil, Plus, Quote, Settings2, Trash2, Type, X,
} from 'lucide-react';
import styles from '../AdminShell.module.css';
import { restrictToVerticalAxis } from '../dnd-modifiers';
import PageVisibility from '../PageVisibility';
import PagesTab, { type PageKey } from './PagesTab';
import PageBlocks from '@/components/PageBlocks';
import { supabase } from '@/lib/supabase';
import { uploadPageImage } from '@/lib/image-upload';
import { BLOCK_TYPES, createBlock, parseBlocks, type BlockImage, type BlockType, type PageBlock } from '@/lib/page-blocks';
import { slugProblem, slugify } from '@/lib/site-pages';
import type { SitePage } from '@/types';

/** null for the list; a built-in page key; 'new' or 'new:<parent id>'; or a created page's id. */
export type PageView = null | PageKey | string;

export const BUILT_IN_PAGES: { key: PageKey; title: string; description: string; href: string }[] = [
  { key: 'about', title: 'About', description: 'Heading, biography and portrait', href: '/about' },
  { key: 'splash', title: 'Splash screen', description: 'Title and background image', href: '/' },
];

/** Pages created in the admin, in menu order (sub pages in order within their parent). */
export function useSitePages() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data, error: loadError } = await supabase.from('site_pages').select('*')
        .order('nav_order', { ascending: true }).order('created_at', { ascending: true });
      if (loadError) setError(`Could not load pages: ${loadError.message}`);
      else setPages((data ?? []) as SitePage[]);
    } catch { /* Supabase not configured */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { pages, setPages, loading, error, setError, refresh };
}

export type SitePagesState = ReturnType<typeof useSitePages>;

/** The public address of a created page. */
export function pagePath(page: Pick<SitePage, 'slug' | 'parent_id'>, pages: SitePage[]): string {
  const parent = page.parent_id ? pages.find((p) => p.id === page.parent_id) : null;
  return parent ? `/${parent.slug}/${page.slug}` : `/${page.slug}`;
}

export default function SitePagesTab({ state, view, onView }: { state: SitePagesState; view: PageView; onView: (view: PageView) => void }) {
  if (view === 'about' || view === 'splash') {
    return (
      <div className={styles.contentPad} style={{ paddingBottom: 0 }}>
        <button type="button" className={styles.backLink} onClick={() => onView(null)}><ArrowLeft size={16} aria-hidden="true" /> All pages</button>
        <div className={styles.legacyTheme} style={{ margin: '-24px -24px 0' }}><PagesTab only={view} /></div>
      </div>
    );
  }
  if (view) {
    const isNew = view === 'new' || view.startsWith('new:');
    const page = isNew ? null : state.pages.find((p) => p.id === view) ?? null;
    if (!isNew && !page) return state.loading ? <p className={styles.empty}>Loading…</p> : <PagesOverview state={state} onView={onView} />;
    return (
      <PageEditor
        key={view}
        page={page}
        initialParentId={view.startsWith('new:') ? view.slice(4) : null}
        allPages={state.pages}
        onBack={() => onView(null)}
        onSaved={async (id) => { await state.refresh(); onView(id); }}
        onDeleted={async () => { await state.refresh(); onView(null); }}
      />
    );
  }
  return <PagesOverview state={state} onView={onView} />;
}

// Overview --------------------------------------------------------------------

function useListSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function PagesOverview({ state, onView }: { state: SitePagesState; onView: (view: PageView) => void }) {
  const { pages, setPages } = state;
  const topLevel = pages.filter((p) => !p.parent_id);
  const sensors = useListSensors();

  /** Reorders one group of siblings; nav_order is only compared among siblings. */
  const reorderSiblings = async (siblings: SitePage[], { active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ordered = arrayMove(siblings, siblings.findIndex((p) => p.id === active.id), siblings.findIndex((p) => p.id === over.id))
      .map((p, i) => ({ ...p, nav_order: i }));
    const byId = new Map(ordered.map((p) => [p.id, p]));
    setPages((prev) => prev.map((p) => byId.get(p.id) ?? p).sort((a, b) => a.nav_order - b.nav_order));
    const results = await Promise.all(ordered.map((p) => supabase.from('site_pages').update({ nav_order: p.nav_order }).eq('id', p.id)));
    const failed = results.find((r) => r.error)?.error;
    if (failed) { state.setError(`Could not save the order: ${failed.message}`); state.refresh(); }
  };

  return (
    <div className={styles.contentPad}>
      {state.error && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <span>{state.error}</span>
          <button type="button" className={styles.chip} onClick={() => state.setError('')}>Dismiss</button>
        </div>
      )}

      <section className={`${styles.panel} ${styles.pagesPanel}`} aria-labelledby="created-pages-title">
        <h2 id="created-pages-title" className={styles.panelTitle}><FilePlus2 size={18} aria-hidden="true" /> Pages you created</h2>
        {!state.loading && topLevel.length === 0 && (
          <div className={styles.pagesEmpty}>
            <p className={styles.modalSummary}>
              Build pages from text, photographs, photo grids and quotes — for commissions, workshops, an exhibition or press.
              Each page can have its own sub pages.
            </p>
            <button type="button" className={styles.primaryButton} onClick={() => onView('new')}><Plus aria-hidden="true" /> Create a page</button>
          </div>
        )}
        {topLevel.length > 1 && <p className={styles.fieldHint} style={{ margin: '-8px 0 12px' }}>Drag to set the menu order. Sub pages are ordered within their page.</p>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={(e) => reorderSiblings(topLevel, e)}>
          <SortableContext items={topLevel.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.pageTree}>
              {topLevel.map((page) => (
                <PageTreeItem
                  key={page.id}
                  page={page}
                  pages={pages}
                  subPages={pages.filter((p) => p.parent_id === page.id)}
                  onView={onView}
                  onReorderSubPages={reorderSiblings}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </section>

      <section className={`${styles.panel} ${styles.pagesPanel}`} aria-labelledby="built-in-pages-title">
        <h2 id="built-in-pages-title" className={styles.panelTitle}><FileText size={18} aria-hidden="true" /> Built-in pages</h2>
        <ul className={styles.visibilityList}>
          {BUILT_IN_PAGES.map((page) => (
            <li key={page.key} className={styles.visibilityRow}>
              <div className={styles.modalMain}>
                <p className={styles.visibilityName}>{page.title}</p>
                <p className={styles.fieldHint} style={{ marginTop: 2 }}>{page.description}</p>
              </div>
              <a className={styles.iconButton} href={page.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${page.title}`}><ExternalLink size={16} aria-hidden="true" /></a>
              <button type="button" className={styles.chip} onClick={() => onView(page.key)}><Pencil size={14} aria-hidden="true" className={styles.chipIcon} />Edit</button>
            </li>
          ))}
        </ul>
        <p className={styles.fieldHint}>Galleries, videos and prints have their own sections in the sidebar.</p>
      </section>

      <div style={{ marginTop: 20 }}><PageVisibility /></div>
    </div>
  );
}

function PageRowContent({ page, pages, onEdit }: { page: SitePage; pages: SitePage[]; onEdit: () => void }) {
  const parent = page.parent_id ? pages.find((p) => p.id === page.parent_id) : null;
  const live = page.published && (!parent || parent.published);
  return (
    <>
      <div className={styles.modalMain}>
        <p className={styles.visibilityName}>
          {page.title}
          <span className={`${styles.status} ${live ? styles.statusLive : ''}`}>{page.published ? (live ? 'Published' : 'Waiting for its page') : 'Draft'}</span>
          {!page.parent_id && page.published && page.show_in_nav && <span className={styles.status}>In menu</span>}
        </p>
        <p className={styles.fieldHint} style={{ marginTop: 2 }}>{pagePath(page, pages)}</p>
      </div>
      {live && (
        <a className={styles.iconButton} href={pagePath(page, pages)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${page.title}`}><ExternalLink size={16} aria-hidden="true" /></a>
      )}
      <button type="button" className={styles.chip} onClick={onEdit}><Pencil size={14} aria-hidden="true" className={styles.chipIcon} />Edit</button>
    </>
  );
}

function PageTreeItem({ page, pages, subPages, onView, onReorderSubPages }: {
  page: SitePage; pages: SitePage[]; subPages: SitePage[];
  onView: (view: PageView) => void;
  onReorderSubPages: (siblings: SitePage[], event: DragEndEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const sensors = useListSensors();
  return (
    <li ref={setNodeRef} className={`${styles.pageTreeItem} ${isDragging ? styles.dragging : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className={styles.pageTreeRow}>
        <button type="button" ref={setActivatorNodeRef} className={styles.grip} aria-label={`Move ${page.title}`} {...attributes} {...listeners}>
          <GripVertical size={15} aria-hidden="true" />
        </button>
        <PageRowContent page={page} pages={pages} onEdit={() => onView(page.id)} />
      </div>
      {subPages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={(e) => onReorderSubPages(subPages, e)}>
          <SortableContext items={subPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.subPageList} aria-label={`Sub pages of ${page.title}`}>
              {subPages.map((sub) => <SubPageRow key={sub.id} page={sub} pages={pages} onEdit={() => onView(sub.id)} />)}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <button type="button" className={styles.addSubPage} onClick={() => onView(`new:${page.id}`)}>
        <CornerDownRight size={14} aria-hidden="true" /> Add sub page
      </button>
    </li>
  );
}

function SubPageRow({ page, pages, onEdit }: { page: SitePage; pages: SitePage[]; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  return (
    <li ref={setNodeRef} className={`${styles.pageTreeRow} ${styles.subPageRow} ${isDragging ? styles.dragging : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button type="button" ref={setActivatorNodeRef} className={styles.grip} aria-label={`Move ${page.title}`} {...attributes} {...listeners}>
        <GripVertical size={15} aria-hidden="true" />
      </button>
      <PageRowContent page={page} pages={pages} onEdit={onEdit} />
    </li>
  );
}

// Editor ----------------------------------------------------------------------

type Draft = Pick<SitePage, 'title' | 'slug' | 'intro' | 'cover_image' | 'cover_width' | 'cover_height' | 'seo_description' | 'published' | 'show_in_nav' | 'parent_id'>;

function PageEditor({ page, initialParentId, allPages, onBack, onSaved, onDeleted }: {
  page: SitePage | null;
  initialParentId: string | null;
  allPages: SitePage[];
  onBack: () => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => page ? {
    title: page.title, slug: page.slug, intro: page.intro, cover_image: page.cover_image, cover_width: page.cover_width,
    cover_height: page.cover_height, seo_description: page.seo_description, published: page.published,
    show_in_nav: page.show_in_nav, parent_id: page.parent_id,
  } : {
    title: '', slug: '', intro: '', cover_image: null, cover_width: null, cover_height: null, seo_description: null,
    published: false, show_in_nav: !initialParentId, parent_id: initialParentId,
  });
  const [blocks, setBlocks] = useState<PageBlock[]>(() => (page ? parseBlocks(page.blocks) : [createBlock('text')]));
  // A new page's address follows its title until the address is edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(page));
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const parent = draft.parent_id ? allPages.find((p) => p.id === draft.parent_id) ?? null : null;
  const hasSubPages = Boolean(page && allPages.some((p) => p.parent_id === page.id));
  const parentOptions = allPages.filter((p) => !p.parent_id && p.id !== page?.id);
  const siblingSlugs = allPages.filter((p) => p.id !== page?.id && p.parent_id === draft.parent_id).map((p) => p.slug);
  const addressProblem = draft.slug ? slugProblem(draft.slug, siblingSlugs, !draft.parent_id) : null;
  const addressPrefix = parent ? `/${parent.slug}/` : '/';

  const trackUpload = async <T,>(work: () => Promise<T>): Promise<T | null> => {
    setUploads((n) => n + 1);
    try { return await work(); } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Upload failed.', error: true });
      return null;
    } finally { setUploads((n) => n - 1); }
  };

  const updateBlock = (id: string, next: PageBlock) => setBlocks((prev) => prev.map((b) => (b.id === id ? next : b)));
  const moveBlock = (index: number, by: -1 | 1) => setBlocks((prev) => {
    const target = index + by;
    return target < 0 || target >= prev.length ? prev : arrayMove(prev, index, target);
  });
  const blockSensors = useListSensors();

  const save = async () => {
    const title = draft.title.trim();
    if (!title) { setMessage({ text: 'Give the page a title.', error: true }); return; }
    const slug = draft.slug || slugify(title);
    const problem = slugProblem(slug, siblingSlugs, !draft.parent_id);
    if (problem) { setMessage({ text: problem, error: true }); return; }
    if (uploads > 0) { setMessage({ text: 'Wait for the images to finish uploading.', error: true }); return; }
    setSaving(true);
    const row = {
      ...draft, title, slug, blocks,
      seo_description: draft.seo_description?.trim() || null,
      show_in_nav: draft.parent_id ? false : draft.show_in_nav,
    };
    const siblingsCount = allPages.filter((p) => p.parent_id === draft.parent_id).length;
    const result = page
      ? await supabase.from('site_pages').update(page.parent_id === draft.parent_id ? row : { ...row, nav_order: siblingsCount }).eq('id', page.id).select('id').single()
      : await supabase.from('site_pages').insert({ ...row, nav_order: siblingsCount }).select('id').single();
    setSaving(false);
    if (result.error || !result.data) {
      const text = result.error?.code === '23505' ? `Another page here already uses “${slug}”.` : `Could not save: ${result.error?.message ?? 'unknown error'}`;
      setMessage({ text, error: true });
      return;
    }
    setMessage({ text: draft.published ? 'Saved. The page is live.' : 'Saved as a draft.', error: false });
    onSaved(result.data.id);
  };

  const remove = async () => {
    if (!page) return;
    const children = allPages.filter((p) => p.parent_id === page.id).length;
    const warning = children ? ` Its ${children} sub ${children === 1 ? 'page is' : 'pages are'} deleted too.` : '';
    if (!confirm(`Delete the page “${page.title}”? Its address will stop working.${warning}`)) return;
    const { error } = await supabase.from('site_pages').delete().eq('id', page.id);
    if (error) { setMessage({ text: `Could not delete: ${error.message}`, error: true }); return; }
    onDeleted();
  };

  return (
    <div className={styles.contentPad}>
      <button type="button" className={styles.backLink} onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> All pages</button>

      <div className={styles.editorGrid}>
        <div>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><Type size={18} aria-hidden="true" /> Page</h2>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Title</span>
              <input className={styles.input} value={draft.title} maxLength={120} placeholder="e.g. Commissions"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) }))} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Web address</span>
              <span className={styles.slugInput}>
                <span aria-hidden="true">{addressPrefix}</span>
                <input className={styles.input} value={draft.slug} maxLength={80} placeholder="commissions"
                  onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }}
                  onBlur={() => set('slug', slugify(draft.slug))} aria-invalid={Boolean(addressProblem)} />
              </span>
              {addressProblem
                ? <span className={styles.fieldHint} style={{ color: '#ffb3b3' }}>{addressProblem}</span>
                : page?.published && (draft.slug !== page.slug || draft.parent_id !== page.parent_id) && <span className={styles.fieldHint}>Changing the address breaks links people already have to the old one.</span>}
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Introduction</span>
              <textarea className={styles.textarea} style={{ minHeight: 80 }} value={draft.intro} onChange={(e) => set('intro', e.target.value)} placeholder="A sentence under the title." />
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Cover image (optional)</span>
              <ImageField
                image={draft.cover_image && draft.cover_width && draft.cover_height ? { url: draft.cover_image, width: draft.cover_width, height: draft.cover_height, alt: '' } : null}
                showAlt={false}
                onUpload={trackUpload}
                onChange={(img) => setDraft((d) => ({ ...d, cover_image: img?.url ?? null, cover_width: img?.width ?? null, cover_height: img?.height ?? null }))}
              />
              <span className={styles.fieldHint}>Shown wide under the title, and as the picture when the page is shared or listed as a sub page.</span>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><LayoutTemplate size={18} aria-hidden="true" /> Content</h2>
            {blocks.length === 0 && <p className={styles.modalSummary} style={{ marginBottom: 16 }}>Add text, images and more below.</p>}
            <DndContext sensors={blockSensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) return;
                setBlocks((prev) => arrayMove(prev, prev.findIndex((b) => b.id === active.id), prev.findIndex((b) => b.id === over.id)));
              }}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <ol className={styles.blockList}>
                  {blocks.map((block, index) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      isFirst={index === 0}
                      isLast={index === blocks.length - 1}
                      onChange={(next) => updateBlock(block.id, next)}
                      onMove={(by) => moveBlock(index, by)}
                      onRemove={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                      onUpload={trackUpload}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
            <div className={styles.addBlock}>
              <span className={styles.fieldLabel}>Add a block</span>
              <div className={styles.addBlockGrid}>
                {BLOCK_TYPES.map((t) => (
                  <button key={t.type} type="button" className={styles.addBlockButton} onClick={() => setBlocks((prev) => [...prev, createBlock(t.type)])}>
                    <Plus size={14} aria-hidden="true" /> <b>{t.label}</b><span>{t.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><Settings2 size={18} aria-hidden="true" /> Publishing</h2>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Place</span>
              <select className={styles.select} style={{ width: '100%' }} value={draft.parent_id ?? ''} disabled={hasSubPages}
                onChange={(e) => set('parent_id', e.target.value || null)}>
                <option value="">Top-level page</option>
                {parentOptions.map((p) => <option key={p.id} value={p.id}>Sub page of {p.title}</option>)}
              </select>
              {hasSubPages && <span className={styles.fieldHint}>This page has sub pages, so it stays at the top level.</span>}
            </label>
            <div className={styles.switchStack}>
              <label className={styles.switch}>
                <input type="checkbox" checked={draft.published} onChange={(e) => set('published', e.target.checked)} />
                <span className={styles.switchTrack} />
                <span>Published — visitors can open it{parent && !parent.published ? ' once “' + parent.title + '” is published' : ''}</span>
              </label>
              {!draft.parent_id && (
                <label className={styles.switch}>
                  <input type="checkbox" checked={draft.show_in_nav} onChange={(e) => set('show_in_nav', e.target.checked)} />
                  <span className={styles.switchTrack} />
                  <span>Show in the menu and footer</span>
                </label>
              )}
            </div>
            <label className={styles.field} style={{ marginTop: 18 }}>
              <span className={styles.fieldLabel}>Search and sharing description (optional)</span>
              <textarea className={styles.textarea} style={{ minHeight: 70 }} maxLength={300} value={draft.seo_description ?? ''}
                onChange={(e) => set('seo_description', e.target.value)} placeholder="Shown by Google and link previews. Uses the introduction if empty." />
            </label>
          </section>

          <div className={styles.editorActions}>
            <button type="button" className={styles.primaryButton} onClick={save} disabled={saving || uploads > 0}>
              {saving ? 'Saving…' : uploads > 0 ? 'Uploading…' : page ? 'Save changes' : 'Create page'}
            </button>
            {page && <button type="button" className={styles.dangerButton} onClick={remove}><Trash2 size={16} aria-hidden="true" /> Delete</button>}
            {message && <span role="status" style={{ color: message.error ? '#ffb3b3' : '#d4d4d8', fontSize: 14 }}>{message.text}</span>}
          </div>
        </div>

        <aside className={styles.stickyPreview} aria-label="Preview">
          <p className={styles.fieldLabel}>Preview · {addressPrefix}{draft.slug || '…'}</p>
          <div className={styles.pagePreview}>
            {parent && <p className={styles.pagePreviewCrumb}>{parent.title} /</p>}
            <p className={styles.pagePreviewTitle}>{draft.title || 'Page title'}</p>
            {draft.intro && <p className={styles.pagePreviewIntro}>{draft.intro}</p>}
            {draft.cover_image && draft.cover_width && draft.cover_height && (
              <Image className={styles.pagePreviewCover} src={draft.cover_image} alt="" width={draft.cover_width} height={draft.cover_height} sizes="420px" />
            )}
            <PageBlocks blocks={blocks} />
          </div>
        </aside>
      </div>
    </div>
  );
}

// Blocks ----------------------------------------------------------------------

type Uploader = <T>(work: () => Promise<T>) => Promise<T | null>;

const BLOCK_LABEL = Object.fromEntries(BLOCK_TYPES.map((t) => [t.type, t.label])) as Record<BlockType, string>;

function BlockEditor({ block, isFirst, isLast, onChange, onMove, onRemove, onUpload }: {
  block: PageBlock; isFirst: boolean; isLast: boolean;
  onChange: (block: PageBlock) => void; onMove: (by: -1 | 1) => void; onRemove: () => void; onUpload: Uploader;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <li ref={setNodeRef} className={`${styles.block} ${isDragging ? styles.dragging : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className={styles.blockHeader}>
        <button type="button" ref={setActivatorNodeRef} className={styles.grip} aria-label={`Move ${BLOCK_LABEL[block.type]} block`} {...attributes} {...listeners}>
          <GripVertical size={15} aria-hidden="true" />
        </button>
        <span className={styles.blockName}>{BLOCK_LABEL[block.type]}</span>
        <button type="button" className={styles.blockTool} onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move up"><ArrowUp size={15} /></button>
        <button type="button" className={styles.blockTool} onClick={() => onMove(1)} disabled={isLast} aria-label="Move down"><ArrowDown size={15} /></button>
        <button type="button" className={styles.blockTool} onClick={onRemove} aria-label={`Remove ${BLOCK_LABEL[block.type]} block`}><Trash2 size={15} /></button>
      </div>

      {block.type === 'text' && (
        <FormattedTextarea value={block.text} onChange={(text) => onChange({ ...block, text })} label="Text" />
      )}

      {block.type === 'image' && (
        <>
          <ImageField image={block.image} onUpload={onUpload} onChange={(image) => onChange({ ...block, image })} />
          <label className={styles.field} style={{ marginTop: 12 }}>
            <span className={styles.fieldLabel}>Caption (optional)</span>
            <input className={styles.input} value={block.caption} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
          </label>
          <Segmented label="Width" value={block.size} onChange={(size) => onChange({ ...block, size })}
            options={[['text', 'Text width'], ['wide', 'Wide'], ['full', 'Full width']]} />
        </>
      )}

      {block.type === 'image_text' && (
        <>
          <ImageField image={block.image} onUpload={onUpload} onChange={(image) => onChange({ ...block, image })} />
          <Segmented label="Image side" value={block.side} onChange={(side) => onChange({ ...block, side })}
            options={[['left', 'Image left'], ['right', 'Image right']]} />
          <FormattedTextarea value={block.text} onChange={(text) => onChange({ ...block, text })} label="Text beside the image" />
        </>
      )}

      {block.type === 'gallery' && (
        <GalleryField block={block} onChange={onChange} onUpload={onUpload} />
      )}

      {block.type === 'quote' && (
        <>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Quote</span>
            <textarea className={styles.textarea} style={{ minHeight: 90 }} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Who said it (optional)</span>
            <input className={styles.input} value={block.attribution} onChange={(e) => onChange({ ...block, attribution: e.target.value })} />
          </label>
        </>
      )}

      {block.type === 'divider' && <hr className={styles.blockDivider} />}
    </li>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (value: T) => void;
}) {
  return (
    <div className={styles.field} style={{ marginTop: 12 }}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.presetRow} role="group" aria-label={label} style={{ marginTop: 0 }}>
        {options.map(([v, text]) => (
          <button key={v} type="button" className={styles.preset} aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

const FORMATS: { label: string; icon: typeof Bold; wrap?: [string, string]; line?: string; placeholder: string }[] = [
  { label: 'Heading', icon: Heading2, line: '## ', placeholder: 'Heading' },
  { label: 'Subheading', icon: Heading3, line: '### ', placeholder: 'Subheading' },
  { label: 'Bold', icon: Bold, wrap: ['**', '**'], placeholder: 'bold text' },
  { label: 'Italic', icon: Italic, wrap: ['*', '*'], placeholder: 'italic text' },
  { label: 'Bulleted list', icon: List, line: '- ', placeholder: 'List item' },
  { label: 'Quote', icon: Quote, line: '> ', placeholder: 'Quote' },
  { label: 'Link', icon: Link2, wrap: ['[', '](/contact)'], placeholder: 'link text' },
];

function FormattedTextarea({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (format: (typeof FORMATS)[number]) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || format.placeholder;
    let insert: string;
    if (format.wrap) {
      insert = `${format.wrap[0]}${selected}${format.wrap[1]}`;
    } else {
      // Line formats start a new paragraph unless the cursor already begins one.
      const prefix = start === 0 || value.slice(0, start).endsWith('\n\n') ? '' : value.slice(0, start).endsWith('\n') ? '\n' : '\n\n';
      insert = `${prefix}${selected.split('\n').map((l) => `${format.line}${l}`).join('\n')}`;
    }
    onChange(value.slice(0, start) + insert + value.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + insert.length, start + insert.length); });
  };

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.formatBar} role="toolbar" aria-label="Formatting">
        {FORMATS.map((format) => (
          <button key={format.label} type="button" className={styles.formatButton} onClick={() => apply(format)} aria-label={format.label} title={format.label}>
            <format.icon size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <textarea ref={ref} className={`${styles.textarea} ${styles.formattedTextarea}`} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={'Leave a blank line between paragraphs.\n\n## A heading\n\nText with **bold**, *italic* and a [link](/contact).'} />
    </div>
  );
}

function ImageField({ image, onChange, onUpload, showAlt = true }: {
  image: BlockImage | null; onChange: (image: BlockImage | null) => void; onUpload: Uploader; showAlt?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (files: FileList | null) => {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setBusy(true);
    const uploaded = await onUpload(() => uploadPageImage(file));
    setBusy(false);
    if (uploaded) onChange({ ...uploaded, alt: image?.alt ?? '' });
  };

  return (
    <div>
      <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => choose(e.target.files)} />
      {image ? (
        <div className={styles.imageField}>
          <Image src={image.url} alt="" width={image.width} height={image.height} sizes="200px" className={styles.imageThumb} />
          <div className={styles.imageFieldSide}>
            {showAlt && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Description for screen readers</span>
                <input className={styles.input} value={image.alt} placeholder="What the photograph shows" onChange={(e) => onChange({ ...image, alt: e.target.value })} />
              </label>
            )}
            <div className={styles.presetRow}>
              <button type="button" className={styles.chip} onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? 'Uploading…' : 'Replace'}</button>
              <button type="button" className={styles.chip} onClick={() => onChange(null)} disabled={busy}>Remove</button>
            </div>
            <span className={styles.fieldHint}>{image.width} × {image.height}px</span>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.dropZone} onClick={() => inputRef.current?.click()} disabled={busy}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files); }}>
          <ImagePlus size={22} aria-hidden="true" />
          <span>{busy ? 'Optimising and uploading…' : 'Drop an image here or click to choose'}</span>
          <small>JPG, PNG or WebP. Large photos are resized for the web automatically.</small>
        </button>
      )}
    </div>
  );
}

function GalleryField({ block, onChange, onUpload }: {
  block: Extract<PageBlock, { type: 'gallery' }>; onChange: (block: PageBlock) => void; onUpload: Uploader;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  // Uploads finish out of order; read the latest block when each one lands.
  const latest = useRef(block);
  useEffect(() => { latest.current = block; }, [block]);

  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    setPending((n) => n + list.length);
    for (const file of list) {
      const uploaded = await onUpload(() => uploadPageImage(file));
      setPending((n) => n - 1);
      if (uploaded) {
        const current = latest.current;
        const next = { ...current, images: [...current.images, uploaded] };
        latest.current = next;
        onChange(next);
      }
    }
  };

  const moveImage = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= block.images.length) return;
    onChange({ ...block, images: arrayMove(block.images, index, target) });
  };

  return (
    <div>
      <input ref={inputRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => addFiles(e.target.files)} />
      {block.images.length > 0 && (
        <ul className={styles.galleryEdit}>
          {block.images.map((image, i) => (
            <li key={`${image.url}-${i}`}>
              <Image src={image.url} alt="" width={image.width} height={image.height} sizes="160px" className={styles.galleryThumb} />
              <input className={styles.input} value={image.alt} placeholder="Description" aria-label={`Description of photo ${i + 1}`}
                onChange={(e) => onChange({ ...block, images: block.images.map((img, j) => (j === i ? { ...img, alt: e.target.value } : img)) })} />
              <div className={styles.galleryThumbTools}>
                <button type="button" className={styles.blockTool} onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move earlier"><ArrowLeft size={14} /></button>
                <button type="button" className={styles.blockTool} onClick={() => moveImage(i, 1)} disabled={i === block.images.length - 1} aria-label="Move later"><ArrowLeft size={14} style={{ transform: 'scaleX(-1)' }} /></button>
                <button type="button" className={styles.blockTool} onClick={() => onChange({ ...block, images: block.images.filter((_, j) => j !== i) })} aria-label={`Remove photo ${i + 1}`}><X size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={styles.dropZone} onClick={() => inputRef.current?.click()} disabled={pending > 0}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
        <ImagePlus size={22} aria-hidden="true" />
        <span>{pending > 0 ? `Optimising and uploading ${pending}…` : 'Drop photos here or click to add several'}</span>
      </button>
      <Segmented label="Columns" value={String(block.columns) as '2' | '3'} onChange={(c) => onChange({ ...block, columns: c === '2' ? 2 : 3 })}
        options={[['2', 'Two columns'], ['3', 'Three columns']]} />
    </div>
  );
}
