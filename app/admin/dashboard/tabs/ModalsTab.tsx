'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, CalendarClock, Clock, Globe, GripVertical, Pencil, Trash2, Type } from 'lucide-react';
import styles from '../AdminShell.module.css';
import { restrictToVerticalAxis } from '../dnd-modifiers';
import { supabase } from '@/lib/supabase';
import {
  FREQUENCIES, MAX_MODALS_PER_PAGE, SITE_PAGES, isScheduledNow, overfullPages, paragraphs, targetsPage,
} from '@/lib/site-modals';
import type { SiteModal } from '@/types';

type Draft = Omit<SiteModal, 'id' | 'created_at' | 'updated_at' | 'sort_order'>;

const EMPTY_DRAFT: Draft = {
  title: '', body: '', cta_label: null, cta_url: null, pages: ['all'],
  delay_seconds: 2, auto_close_seconds: null, frequency: 'once_per_session',
  starts_at: null, ends_at: null, active: false, show_on_news: true,
};

/** The admin's modals, shared by the sidebar badge and the Modals section. */
export function useModals() {
  const [modals, setModals] = useState<SiteModal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data, error: loadError } = await supabase.from('site_modals').select('*')
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
      if (loadError) setError(`Could not load modals: ${loadError.message}`);
      else setModals((data ?? []) as SiteModal[]);
    } catch { /* Supabase not configured */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const liveCount = modals.filter((m) => m.active && isScheduledNow(m)).length;
  return { modals, setModals, loading, error, setError, refresh, liveCount };
}

export type ModalsState = ReturnType<typeof useModals>;

// Stored as UTC; edited in the admin's local time.
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const seconds = (n: number) => (n < 60 ? `${n}s` : `${Math.round(n / 6) / 10} min`);

function statusOf(modal: Pick<SiteModal, 'active' | 'starts_at' | 'ends_at'>) {
  if (!modal.active) return { label: 'Off', className: '' };
  if (modal.ends_at && Date.parse(modal.ends_at) <= Date.now()) return { label: 'Ended', className: styles.statusEnded };
  if (modal.starts_at && Date.parse(modal.starts_at) > Date.now()) return { label: 'Scheduled', className: styles.statusScheduled };
  return { label: 'Live', className: styles.statusLive };
}

function pagesSummary(pages: string[]) {
  if (pages.includes('all')) return 'All pages';
  const labels = SITE_PAGES.filter((p) => pages.includes(p.key)).map((p) => p.label);
  return labels.length ? labels.join(', ') : 'No pages';
}

function timingSummary(m: Draft) {
  const parts = [
    m.delay_seconds === 0 ? 'opens at once' : `opens after ${seconds(m.delay_seconds)}`,
    m.auto_close_seconds ? `closes after ${seconds(m.auto_close_seconds)}` : 'stays until closed',
    FREQUENCIES.find((f) => f.value === m.frequency)?.label.toLowerCase(),
  ];
  return parts.join(' · ');
}

export default function ModalsTab({ state, editingId, onEdit }: {
  state: ModalsState;
  /** 'new', a modal id, or null for the list. */
  editingId: string | null;
  onEdit: (id: string | null) => void;
}) {
  const { modals, setModals } = state;
  const editing = editingId === 'new' ? null : modals.find((m) => m.id === editingId) ?? null;

  if (editingId) {
    return (
      <ModalEditor
        key={editingId}
        modal={editing}
        allModals={modals}
        onBack={() => onEdit(null)}
        onSaved={async (id) => { await state.refresh(); onEdit(id); }}
        onDeleted={async () => { await state.refresh(); onEdit(null); }}
      />
    );
  }

  return <ModalList state={state} onEdit={onEdit} setModals={setModals} />;
}

function ModalList({ state, onEdit, setModals }: {
  state: ModalsState; onEdit: (id: string) => void; setModals: ModalsState['setModals'];
}) {
  const { modals } = state;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(modals, modals.findIndex((m) => m.id === active.id), modals.findIndex((m) => m.id === over.id))
      .map((m, i) => ({ ...m, sort_order: i }));
    setModals(next);
    const results = await Promise.all(next.map((m) => supabase.from('site_modals').update({ sort_order: m.sort_order }).eq('id', m.id)));
    const failed = results.find((r) => r.error)?.error;
    if (failed) { state.setError(`Could not save the order: ${failed.message}`); state.refresh(); }
  };

  const toggleActive = async (modal: SiteModal) => {
    const active = !modal.active;
    const full = overfullPages(modals, { ...modal, active });
    if (full.length) {
      state.setError(`${full.join(', ')} already ${full.length === 1 ? 'has' : 'have'} ${MAX_MODALS_PER_PAGE} modals switched on. Turn one off first.`);
      return;
    }
    setModals((prev) => prev.map((m) => (m.id === modal.id ? { ...m, active } : m)));
    const { error } = await supabase.from('site_modals').update({ active }).eq('id', modal.id);
    if (error) state.setError(`Could not update: ${error.message}`);
    state.refresh();
  };

  return (
    <div className={styles.contentPad}>
      {state.error && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <span>{state.error}</span>
          <button type="button" className={styles.chip} onClick={() => state.setError('')}>Dismiss</button>
        </div>
      )}

      <Capacity modals={modals} />

      {state.loading && <p className={styles.empty}>Loading modals…</p>}
      {!state.loading && modals.length === 0 && (
        <div className={styles.panel} style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p className={styles.panelTitle} style={{ justifyContent: 'center' }}>No modals yet</p>
          <p className={styles.modalSummary}>
            A modal pops up on the pages you choose — a new print release, an exhibition, a booking window.
            After visitors close it, it stays readable on the News page.
          </p>
        </div>
      )}

      {modals.length > 1 && (
        <p className={styles.modalSummary} style={{ marginBottom: 12 }}>
          When several modals share a page, they open one after another in this order. Drag to change it.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <SortableContext items={modals.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <ol className={styles.modalList}>
            {modals.map((modal, index) => (
              <ModalRow key={modal.id} modal={modal} position={index + 1} onEdit={() => onEdit(modal.id)} onToggle={() => toggleActive(modal)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Capacity({ modals }: { modals: Pick<SiteModal, 'id' | 'pages' | 'active'>[] }) {
  return (
    <div className={styles.capacity} aria-label="Modals switched on per page">
      {SITE_PAGES.map((page) => {
        const count = modals.filter((m) => m.active && targetsPage(m, page.key)).length;
        return (
          <span key={page.key} className={`${styles.capacityItem} ${count >= MAX_MODALS_PER_PAGE ? styles.capacityFull : ''}`}>
            {page.label}
            <span className={styles.capacityMeter} aria-hidden="true">
              {Array.from({ length: MAX_MODALS_PER_PAGE }, (_, i) => <i key={i} className={i < count ? styles.on : ''} />)}
            </span>
            <b>{count}/{MAX_MODALS_PER_PAGE}</b>
          </span>
        );
      })}
    </div>
  );
}

function ModalRow({ modal, position, onEdit, onToggle }: { modal: SiteModal; position: number; onEdit: () => void; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: modal.id });
  const status = statusOf(modal);
  return (
    <li ref={setNodeRef} className={`${styles.modalRow} ${isDragging ? styles.dragging : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button type="button" ref={setActivatorNodeRef} className={styles.grip} aria-label={`Move ${modal.title}, position ${position}`} {...attributes} {...listeners}>
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <span className={styles.modalOrder}>{position}</span>
      <div className={styles.modalMain}>
        <p className={styles.modalTitle}>
          {modal.title}
          <span className={`${styles.status} ${status.className}`}>{status.label}</span>
          {modal.show_on_news && <span className={styles.status}>On News</span>}
        </p>
        <p className={styles.modalSummary}>{pagesSummary(modal.pages)} · {timingSummary(modal)}</p>
      </div>
      <div className={styles.rowActions}>
        <label className={styles.switch}>
          <input type="checkbox" checked={modal.active} onChange={onToggle} />
          <span className={styles.switchTrack} />
          <span>Pop up</span>
        </label>
        <button type="button" className={styles.iconButton} onClick={onEdit} aria-label={`Edit ${modal.title}`}>
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function ModalEditor({ modal, allModals, onBack, onSaved, onDeleted }: {
  modal: SiteModal | null;
  allModals: SiteModal[];
  onBack: () => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => (modal ? {
    title: modal.title, body: modal.body, cta_label: modal.cta_label, cta_url: modal.cta_url, pages: modal.pages,
    delay_seconds: modal.delay_seconds, auto_close_seconds: modal.auto_close_seconds, frequency: modal.frequency,
    starts_at: modal.starts_at, ends_at: modal.ends_at, active: modal.active, show_on_news: modal.show_on_news,
  } : EMPTY_DRAFT));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const candidateId = modal?.id ?? 'new';
  const others = allModals.filter((m) => m.id !== candidateId);

  const togglePage = (key: string, on: boolean) => {
    if (key === 'all') { set('pages', on ? ['all'] : []); return; }
    const without = draft.pages.filter((p) => p !== 'all' && p !== key);
    set('pages', on ? [...without, key] : without);
  };

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Give the modal a title.';
    if (draft.pages.length === 0) return 'Choose at least one page, or All pages.';
    if (Boolean(draft.cta_label?.trim()) !== Boolean(draft.cta_url?.trim())) return 'A button needs both a label and a link.';
    if (draft.auto_close_seconds !== null && draft.auto_close_seconds < 3) return 'Auto-close needs at least 3 seconds.';
    if (draft.starts_at && draft.ends_at && Date.parse(draft.ends_at) <= Date.parse(draft.starts_at)) return 'The end date must be after the start date.';
    const full = overfullPages(others, { id: candidateId, pages: draft.pages, active: draft.active });
    if (full.length) return `${full.join(', ')} already ${full.length === 1 ? 'has' : 'have'} ${MAX_MODALS_PER_PAGE} modals switched on. Turn one off, or choose other pages.`;
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { setMessage({ text: problem, error: true }); return; }
    setSaving(true);
    const row = {
      ...draft,
      title: draft.title.trim(),
      cta_label: draft.cta_label?.trim() || null,
      cta_url: draft.cta_url?.trim() || null,
    };
    const result = modal
      ? await supabase.from('site_modals').update(row).eq('id', modal.id).select('id').single()
      : await supabase.from('site_modals').insert({ ...row, sort_order: allModals.length }).select('id').single();
    setSaving(false);
    if (result.error || !result.data) { setMessage({ text: `Could not save: ${result.error?.message ?? 'unknown error'}`, error: true }); return; }
    setMessage({ text: 'Saved.', error: false });
    onSaved(result.data.id);
  };

  const remove = async () => {
    if (!modal || !confirm(`Delete “${modal.title}”? It also disappears from the News page.`)) return;
    const { error } = await supabase.from('site_modals').delete().eq('id', modal.id);
    if (error) { setMessage({ text: `Could not delete: ${error.message}`, error: true }); return; }
    onDeleted();
  };

  const DELAYS = [0, 2, 5, 10, 30];
  const AUTO_CLOSE: (number | null)[] = [null, 8, 15, 30, 60];

  return (
    <div className={styles.contentPad}>
      <button type="button" className={styles.backLink} onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> All modals</button>

      <div className={styles.editorGrid}>
        <div>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><Type size={18} aria-hidden="true" /> Content</h2>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Title</span>
              <input className={styles.input} value={draft.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder="e.g. New limited edition prints" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Message</span>
              <textarea className={styles.textarea} value={draft.body} onChange={(e) => set('body', e.target.value)} placeholder="Leave a blank line between paragraphs." />
            </label>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Button label (optional)</span>
                <input className={styles.input} value={draft.cta_label ?? ''} onChange={(e) => set('cta_label', e.target.value)} placeholder="See the prints" />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Button link</span>
                <input className={styles.input} value={draft.cta_url ?? ''} onChange={(e) => set('cta_url', e.target.value)} placeholder="/prints" />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><Globe size={18} aria-hidden="true" /> Where it opens</h2>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Opens when these pages load</span>
              <div className={styles.checkGrid}>
                <label className={styles.checkPill}>
                  <input type="checkbox" checked={draft.pages.includes('all')} onChange={(e) => togglePage('all', e.target.checked)} />
                  All pages
                </label>
                {SITE_PAGES.map((page) => {
                  const used = others.filter((m) => m.active && targetsPage(m, page.key)).length;
                  return (
                    <label key={page.key} className={styles.checkPill}>
                      <input
                        type="checkbox"
                        checked={targetsPage(draft, page.key)}
                        disabled={draft.pages.includes('all')}
                        onChange={(e) => togglePage(page.key, e.target.checked)}
                      />
                      {page.label} <small>{used}/{MAX_MODALS_PER_PAGE}</small>
                    </label>
                  );
                })}
              </div>
              <span className={styles.fieldHint}>
                The numbers show how many other modals are already switched on for each page. Up to {MAX_MODALS_PER_PAGE} can share a page; they open one after another.
              </span>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} />
              <span className={styles.switchTrack} />
              <span>Pop up on the site</span>
            </label>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><Clock size={18} aria-hidden="true" /> Timing</h2>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Open after (seconds)</span>
                <input className={styles.input} type="number" min={0} max={600} value={draft.delay_seconds}
                  onChange={(e) => set('delay_seconds', Math.min(600, Math.max(0, Number(e.target.value) || 0)))} />
                <span className={styles.presetRow}>
                  {DELAYS.map((d) => (
                    <button key={d} type="button" className={styles.preset} aria-pressed={draft.delay_seconds === d} onClick={() => set('delay_seconds', d)}>
                      {d === 0 ? 'At once' : seconds(d)}
                    </button>
                  ))}
                </span>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Close by itself after (seconds)</span>
                <input className={styles.input} type="number" min={3} max={600} placeholder="Stays open until closed"
                  value={draft.auto_close_seconds ?? ''}
                  onChange={(e) => set('auto_close_seconds', e.target.value === '' ? null : Math.min(600, Number(e.target.value)))} />
                <span className={styles.presetRow}>
                  {AUTO_CLOSE.map((d) => (
                    <button key={String(d)} type="button" className={styles.preset} aria-pressed={draft.auto_close_seconds === d} onClick={() => set('auto_close_seconds', d)}>
                      {d === null ? 'Never' : seconds(d)}
                    </button>
                  ))}
                </span>
              </label>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>How often a visitor sees it</span>
              <div className={styles.radioList}>
                {FREQUENCIES.map((f) => (
                  <label key={f.value} className={styles.radio}>
                    <input type="radio" name="frequency" checked={draft.frequency === f.value} onChange={() => set('frequency', f.value)} />
                    <span><b>{f.label}</b>{f.hint}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><CalendarClock size={18} aria-hidden="true" /> Schedule &amp; News</h2>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Start (optional)</span>
                <input className={styles.input} type="datetime-local" value={toLocalInput(draft.starts_at)} onChange={(e) => set('starts_at', fromLocalInput(e.target.value))} />
                <span className={styles.fieldHint}>Empty starts now. Also the date shown on the News page.</span>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Stop popping up (optional)</span>
                <input className={styles.input} type="datetime-local" value={toLocalInput(draft.ends_at)} onChange={(e) => set('ends_at', fromLocalInput(e.target.value))} />
                <span className={styles.fieldHint}>Empty runs until you switch it off.</span>
              </label>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={draft.show_on_news} onChange={(e) => set('show_on_news', e.target.checked)} />
              <span className={styles.switchTrack} />
              <span>Keep it on the News page, so it can be read after it is closed</span>
            </label>
          </section>

          <div className={styles.editorActions}>
            <button type="button" className={styles.primaryButton} onClick={save} disabled={saving}>{saving ? 'Saving…' : modal ? 'Save changes' : 'Create modal'}</button>
            {modal && <button type="button" className={styles.dangerButton} onClick={remove}><Trash2 size={16} aria-hidden="true" /> Delete</button>}
            {message && <span role="status" style={{ color: message.error ? '#ffb3b3' : '#d4d4d8', fontSize: 14 }}>{message.text}</span>}
          </div>
        </div>

        <aside className={styles.stickyPreview} aria-label="Preview">
          <p className={styles.fieldLabel}>Preview</p>
          <div className={styles.previewStage}>
            <div className={styles.previewCard}>
              <div className={styles.previewTop}><span>News</span><span aria-hidden="true">✕</span></div>
              <p className={styles.previewTitle}>{draft.title || 'Your title'}</p>
              <div className={styles.previewBody}>
                {(paragraphs(draft.body).length ? paragraphs(draft.body) : ['Your message appears here.']).map((text, i) => <p key={i}>{text}</p>)}
              </div>
              <div className={styles.previewActions}>
                {draft.cta_label && <span className={styles.previewCta}>{draft.cta_label}</span>}
                {draft.show_on_news && <span className={styles.previewLater}>Read later on News ↗</span>}
              </div>
            </div>
          </div>
          <p className={styles.previewTimeline}>
            {pagesSummary(draft.pages)} · {timingSummary(draft)}
            {draft.starts_at && <><br />From {new Date(draft.starts_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</>}
            {draft.ends_at && <><br />Until {new Date(draft.ends_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</>}
          </p>
        </aside>
      </div>
    </div>
  );
}
