'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, EyeOff } from 'lucide-react';
import styles from './AdminShell.module.css';
import { supabase } from '@/lib/supabase';
import { HIDEABLE_PAGES, VISIBILITY_ROW, parseHiddenPages } from '@/lib/site-visibility';

/** Switches public pages on and off; see lib/site-visibility.ts. */
export default function PageVisibility() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('page_content').select('value')
          .eq('page', VISIBILITY_ROW.page).eq('key', VISIBILITY_ROW.key).maybeSingle();
        if (cancelled) return;
        if (error) setStatus({ text: `Could not load: ${error.message}`, error: true });
        else setHidden(parseHiddenPages(data?.value));
      } catch { /* Supabase not configured */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = async (key: string, show: boolean) => {
    const previous = hidden;
    const next = show ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    const { error } = await supabase.from('page_content')
      .upsert({ ...VISIBILITY_ROW, value: JSON.stringify(next) }, { onConflict: 'page,key' });
    const label = HIDEABLE_PAGES.find((p) => p.key === key)?.label;
    if (error) {
      setHidden(previous);
      setStatus({ text: `Could not save: ${error.message}`, error: true });
    } else {
      setStatus({ text: `${label} is now ${show ? 'shown' : 'hidden'}. The live site follows within about 15 seconds.`, error: false });
    }
  };

  return (
    <section className={`${styles.panel} ${styles.visibilityPanel}`} aria-labelledby="visibility-title">
      <h2 id="visibility-title" className={styles.panelTitle}><EyeOff size={18} aria-hidden="true" /> Visible on the site</h2>
      <p className={styles.modalSummary} style={{ marginBottom: 18 }}>
        A hidden page leaves the menu, footer and sitemap, and its address shows “not found” until you switch it back on.
        Its content is kept. The landing page is always shown.
      </p>
      <ul className={styles.visibilityList}>
        {HIDEABLE_PAGES.map((page) => {
          const shown = !hidden.includes(page.key);
          return (
            <li key={page.key} className={styles.visibilityRow}>
              <div className={styles.modalMain}>
                <p className={styles.visibilityName}>
                  {page.label}
                  {!shown && <span className={styles.status}>Hidden</span>}
                </p>
                <p className={styles.fieldHint} style={{ marginTop: 2 }}>{page.description}</p>
              </div>
              {shown && (
                <a className={styles.iconButton} href={page.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${page.label}`}>
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              )}
              <label className={styles.switch}>
                <input type="checkbox" checked={shown} disabled={loading} onChange={(e) => toggle(page.key, e.target.checked)} />
                <span className={styles.switchTrack} />
                <span className={styles.visibilityState}>{shown ? 'Shown' : 'Hidden'}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {status && <p role="status" style={{ marginTop: 14, fontSize: 14, color: status.error ? '#ffb3b3' : '#d4d4d8' }}>{status.text}</p>}
    </section>
  );
}
