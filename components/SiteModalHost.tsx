'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { modalsForPath, paragraphs } from '@/lib/site-modals';
import type { SiteModal } from '@/types';

/** Pause between one modal closing and the next opening. */
const GAP_MS = 800;

// Editing a modal gives it a new updated_at, so a changed announcement shows again.
const seenKey = (modal: SiteModal) => `akiwumi-modal:${modal.id}:${modal.updated_at}`;

function storageFor(modal: SiteModal): Storage | null {
  try {
    if (modal.frequency === 'once') return window.localStorage;
    if (modal.frequency === 'once_per_session') return window.sessionStorage;
  } catch { /* storage blocked: treat as never seen */ }
  return null;
}

function hasSeen(modal: SiteModal): boolean {
  try { return storageFor(modal)?.getItem(seenKey(modal)) === '1'; } catch { return false; }
}

function markSeen(modal: SiteModal) {
  try { storageFor(modal)?.setItem(seenKey(modal), '1'); } catch { /* ignore */ }
}

/**
 * Opens the admin's announcements on the pages they target: at most three
 * per page, one at a time, each after its own delay from page load.
 */
export default function SiteModalHost() {
  const pathname = usePathname();
  const [modals, setModals] = useState<SiteModal[]>([]);
  const [queue, setQueue] = useState<SiteModal[]>([]);
  const [current, setCurrent] = useState<SiteModal | null>(null);
  const [position, setPosition] = useState({ index: 0, total: 0 });
  const loadedAt = useRef(0);
  const closedAt = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('site_modals').select('*').eq('active', true);
        if (!cancelled && !error) setModals((data ?? []) as SiteModal[]);
      } catch { /* Supabase not configured: no modals */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // A new page starts its own queue; the clock runs from when it loaded.
  useEffect(() => {
    loadedAt.current = Date.now();
    closedAt.current = 0;
    const due = modalsForPath(modals, pathname).filter((m) => !hasSeen(m));
    setCurrent(null);
    setQueue(due);
    setPosition({ index: 0, total: due.length });
  }, [pathname, modals]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    const wait = Math.max(
      loadedAt.current + next.delay_seconds * 1000 - Date.now(),
      closedAt.current ? closedAt.current + GAP_MS - Date.now() : 0,
      0,
    );
    const timer = setTimeout(() => {
      markSeen(next);
      setQueue((q) => q.slice(1));
      setPosition((p) => ({ ...p, index: p.index + 1 }));
      setCurrent(next);
    }, wait);
    return () => clearTimeout(timer);
  }, [current, queue]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (current && dialog && !dialog.open) dialog.showModal();
    if (!current?.auto_close_seconds) return;
    const timer = setTimeout(() => dialogRef.current?.close(), current.auto_close_seconds * 1000);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <dialog
      ref={dialogRef}
      className="site-modal"
      aria-labelledby={`site-modal-${current.id}`}
      onClose={() => { closedAt.current = Date.now(); setCurrent(null); }}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
    >
      <div className="site-modal-panel">
        <div className="site-modal-top">
          <span>News{position.total > 1 ? ` · ${position.index} of ${position.total}` : ''}</span>
          <button type="button" className="site-modal-close" aria-label="Close" onClick={() => dialogRef.current?.close()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <h2 id={`site-modal-${current.id}`}>{current.title}</h2>
        <div className="site-modal-body">
          {paragraphs(current.body).map((text, i) => <p key={i}>{text}</p>)}
        </div>
        <div className="site-modal-actions">
          {current.cta_label && current.cta_url && (
            <Link href={current.cta_url} className="site-modal-cta" onClick={() => dialogRef.current?.close()}>
              {current.cta_label}
            </Link>
          )}
          {current.show_on_news && pathname !== '/news' && (
            <Link href={`/news#${current.id}`} className="site-modal-later" onClick={() => dialogRef.current?.close()}>
              Read later on News ↗
            </Link>
          )}
        </div>
        {current.auto_close_seconds && (
          <div className="site-modal-timer" aria-hidden="true">
            <span key={current.id} style={{ animationDuration: `${current.auto_close_seconds}s` }} />
          </div>
        )}
      </div>
    </dialog>
  );
}
