'use client';

import { useState } from 'react';
import type { GallerySection } from '@/types';

/** 'all', 'unassigned', or a sub-gallery id. */
export type ImageView = string;

interface Props {
  sections: GallerySection[];
  /** Photographs per sub-gallery id. */
  counts: Record<string, number>;
  totalCount: number;
  unassignedCount: number;
  view: ImageView;
  onView: (view: ImageView) => void;
  selectedCount: number;
  visibleCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCreate: (title: string) => void;
  onAddTo: (sectionId: string) => void;
  onRemoveFromCurrent: () => void;
  onRename: (sectionId: string, title: string) => void;
  onMove: (sectionId: string, by: -1 | 1) => void;
  onDelete: (sectionId: string) => void;
}

const CHIP = (active: boolean) => ({
  padding: '5px 10px',
  border: '1px solid',
  borderColor: active ? '#E8001C' : '#444',
  background: active ? '#E8001C' : 'transparent',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: '0.75rem',
  cursor: 'pointer',
});

const QUIET = { background: 'transparent', color: '#ccc', border: '1px solid #444', fontFamily: 'inherit', fontSize: '0.75rem', padding: '5px 10px', cursor: 'pointer' };

/**
 * Sub-gallery controls in the gallery editor: which photographs the grid
 * shows, what to do with the selected ones, and the sub-galleries themselves.
 */
export default function SubGalleryPanel(props: Props) {
  const { sections, counts, view, onView, selectedCount } = props;
  const [newTitle, setNewTitle] = useState('');
  const current = sections.find((s) => s.id === view);

  const create = () => {
    const title = newTitle.trim();
    if (!title) return;
    props.onCreate(title);
    setNewTitle('');
  };

  return (
    <div className="flex flex-col gap-3 mb-4" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show photographs">
        <button type="button" style={CHIP(view === 'all')} onClick={() => onView('all')}>
          All photos ({props.totalCount})
        </button>
        {sections.length > 0 && (
          <button type="button" style={CHIP(view === 'unassigned')} onClick={() => onView('unassigned')}>
            Not in a sub-gallery ({props.unassignedCount})
          </button>
        )}
        {sections.map((s) => (
          <button key={s.id} type="button" style={CHIP(view === s.id)} onClick={() => onView(s.id)}>
            {s.title} ({counts[s.id] ?? 0})
          </button>
        ))}
      </div>

      {/* Acting on the selection */}
      <div className="flex flex-wrap items-center gap-2 p-3" style={{ border: '1px solid #333', background: '#0d0d0d' }}>
        {selectedCount === 0 ? (
          <>
            <span className="text-grey-mid text-xs">Tick photos to add them to a sub-gallery.</span>
            {props.visibleCount > 0 && (
              <button type="button" style={QUIET} onClick={props.onSelectAll}>Select all shown</button>
            )}
          </>
        ) : (
          <>
            <span className="text-white text-xs">{selectedCount} selected</span>
            {sections.length > 0 && (
              <select
                aria-label="Add selected photos to a sub-gallery"
                style={{ ...QUIET, background: '#111' }}
                value=""
                onChange={(e) => { if (e.target.value) props.onAddTo(e.target.value); }}
              >
                <option value="">Add to sub-gallery…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            )}
            {current && (
              <button type="button" style={QUIET} onClick={props.onRemoveFromCurrent}>
                Remove from “{current.title}”
              </button>
            )}
            <button type="button" style={QUIET} onClick={props.onClearSelection}>Clear selection</button>
          </>
        )}

        <span className="flex items-center gap-2 ml-auto">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}
            placeholder="New sub-gallery name"
            maxLength={80}
            aria-label="New sub-gallery name"
            style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '5px 8px', fontFamily: 'inherit', fontSize: '0.75rem', width: 180 }}
          />
          <button
            type="button"
            onClick={create}
            disabled={!newTitle.trim()}
            style={{ ...QUIET, background: '#E8001C', borderColor: '#E8001C', color: '#fff', opacity: newTitle.trim() ? 1 : 0.5 }}
          >
            {selectedCount > 0 ? `Create with ${selectedCount}` : 'Create'}
          </button>
        </span>
      </div>

      {sections.length > 0 && (
        <details>
          <summary className="text-grey-mid text-xs uppercase cursor-pointer" style={{ letterSpacing: '0.1em' }}>
            Manage sub-galleries ({sections.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {sections.map((s, index) => (
              <SectionRow
                key={s.id}
                section={s}
                count={counts[s.id] ?? 0}
                first={index === 0}
                last={index === sections.length - 1}
                onRename={(title) => props.onRename(s.id, title)}
                onMove={(by) => props.onMove(s.id, by)}
                onDelete={() => props.onDelete(s.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SectionRow({ section, count, first, last, onRename, onMove, onDelete }: {
  section: GallerySection;
  count: number;
  first: boolean;
  last: boolean;
  onRename: (title: string) => void;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(section.title);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => { if (title.trim() && title.trim() !== section.title) onRename(title.trim()); else setTitle(section.title); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        maxLength={80}
        aria-label={`Name of sub-gallery ${section.title}`}
        style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '5px 8px', fontFamily: 'inherit', fontSize: '0.8rem', flex: '1 1 180px' }}
      />
      <span className="text-grey-mid text-xs" style={{ minWidth: 70 }}>{count} photos</span>
      <span className="text-grey-mid text-xs">?sub={section.slug}</span>
      <button type="button" style={QUIET} disabled={first} onClick={() => onMove(-1)} aria-label={`Move ${section.title} earlier`}>↑</button>
      <button type="button" style={QUIET} disabled={last} onClick={() => onMove(1)} aria-label={`Move ${section.title} later`}>↓</button>
      <button type="button" style={{ ...QUIET, color: '#E8001C', borderColor: '#E8001C66' }} onClick={onDelete}>Delete</button>
    </div>
  );
}
