'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './AdminShell.module.css';
import { useAdminShell } from './AdminShell';
import GalleriesOverview from './GalleriesOverview';
import GalleryEditor from './tabs/GalleriesTab';
import VideosTab from './tabs/VideosTab';
import PrintsTab from './tabs/PrintsTab';
import ModalsTab from './tabs/ModalsTab';
import SitePagesTab, { BUILT_IN_PAGES, pagePath, useSitePages } from './tabs/SitePagesTab';

export default function DashboardClient() {
  const { galleries, modals, section, galleryId, setGalleryId, openGallery, modalId, setModalId, pageView, setPageView } = useAdminShell();
  const sitePages = useSitePages();
  const gallery = galleries.galleries.find((g) => g.id === galleryId) ?? null;
  const published = galleries.galleries.filter((g) => g.published).length;
  const photoTotal = Object.values(galleries.photoCounts).reduce((sum, n) => sum + n, 0);

  let header: { title: string; subtitle: string; preview?: { href: string; label: string }; onAdd?: () => void; addLabel?: string };
  switch (section) {
    case 'galleries':
      header = gallery
        ? { title: gallery.title, subtitle: `${galleries.photoCounts[gallery.id] ?? 0} photos · ${gallery.published ? 'Published' : 'Draft'}`, preview: gallery.published ? { href: `/gallery/${gallery.slug}`, label: 'View on site' } : undefined }
        : {
            title: 'Galleries',
            subtitle: `${galleries.galleries.length} galleries · ${published} published · ${photoTotal} photos`,
            preview: { href: '/home', label: 'Show preview' },
            onAdd: async () => { const id = await galleries.create(); if (id) setGalleryId(id); },
          };
      break;
    case 'videos': header = { title: 'Videos', subtitle: 'Films on the Film page', preview: { href: '/videography', label: 'Show preview' } }; break;
    case 'prints': header = { title: 'Prints', subtitle: 'Sizes, prices, availability and orders', preview: { href: '/prints', label: 'Show preview' } }; break;
    case 'pages': {
      const builtIn = BUILT_IN_PAGES.find((p) => p.key === pageView);
      const created = sitePages.pages.find((p) => p.id === pageView);
      const parent = pageView?.startsWith('new:') ? sitePages.pages.find((p) => p.id === pageView.slice(4)) : null;
      if (builtIn) header = { title: builtIn.title, subtitle: builtIn.description, preview: { href: builtIn.href, label: 'Show preview' } };
      else if (created) header = { title: created.title, subtitle: `${created.parent_id ? 'Sub page' : 'Page'} · ${pagePath(created, sitePages.pages)}`, preview: created.published ? { href: pagePath(created, sitePages.pages), label: 'View on site' } : undefined };
      else if (pageView) header = { title: parent ? 'New sub page' : 'New page', subtitle: parent ? `Inside ${parent.title}` : 'Build it from text, images and more' };
      else {
        const count = sitePages.pages.length;
        header = { title: 'Pages', subtitle: `${count} created ${count === 1 ? 'page' : 'pages'} · built-in pages · visibility`, onAdd: () => setPageView('new') };
      }
      break;
    }
    case 'modals':
      header = modalId
        ? { title: modalId === 'new' ? 'New modal' : 'Edit modal', subtitle: 'Pops up on the pages you choose, then lives on the News page' }
        : {
            title: 'Modals',
            subtitle: `${modals.modals.length} ${modals.modals.length === 1 ? 'modal' : 'modals'} · ${modals.liveCount} live now`,
            preview: { href: '/news', label: 'News page' },
            onAdd: () => setModalId('new'),
          };
      break;
    default: header = { title: 'Settings', subtitle: 'Your admin account' };
  }

  return (
        <div className={styles.content}>
          <header className={styles.header}>
            <div style={{ minWidth: 0 }}>
              <h1 className={styles.title}>{header.title}</h1>
              <p className={styles.subtitle}>{header.subtitle}</p>
            </div>
            <div className={styles.headerActions}>
              {header.preview && (
                <a className={styles.ghostButton} href={header.preview.href} target="_blank" rel="noopener noreferrer">
                  <Eye size={18} aria-hidden="true" /> {header.preview.label}
                </a>
              )}
              {header.onAdd && (
                <button type="button" className={styles.primaryButton} onClick={header.onAdd}>
                  <Plus aria-hidden="true" /> Add new
                </button>
              )}
            </div>
          </header>

          {section === 'galleries' && !gallery && <GalleriesOverview state={galleries} onOpen={openGallery} />}
          {section === 'galleries' && gallery && (
            <div className={styles.contentPad}>
              <button type="button" className={styles.backLink} onClick={() => setGalleryId(null)}>
                <ArrowLeft size={16} aria-hidden="true" /> All galleries
              </button>
              <div className={styles.legacyTheme}>
                <GalleryEditor
                  gallery={gallery}
                  isDemoMode={galleries.isDemoMode}
                  onSave={galleries.refresh}
                  onDelete={async () => { if (await galleries.remove(gallery.id)) setGalleryId(null); }}
                />
              </div>
            </div>
          )}
          {section === 'videos' && <div className={`${styles.legacy} ${styles.legacyTheme}`} style={{ height: 'min(760px, 75dvh)', marginTop: 32 }}><VideosTab /></div>}
          {section === 'prints' && <div className={`${styles.legacy} ${styles.legacyTheme}`} style={{ marginTop: 8 }}><PrintsTab /></div>}
          {section === 'pages' && <SitePagesTab state={sitePages} view={pageView} onView={setPageView} />}
          {section === 'modals' && <ModalsTab state={modals} editingId={modalId} onEdit={setModalId} />}
          {section === 'settings' && <SettingsSection />}
        </div>
  );
}

function SettingsSection() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setStatus('Passwords do not match.'); return; }
    const { error } = await supabase.auth.updateUser({ password });
    setStatus(error ? error.message : 'Password updated.');
  };

  return (
    <div className={styles.contentPad}>
      <form onSubmit={handleChange} className={styles.panel} style={{ maxWidth: 480 }}>
        <h2 className={styles.panelTitle}>Change password</h2>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>New password</span>
          <input className={styles.input} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Confirm password</span>
          <input className={styles.input} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <div className={styles.editorActions}>
          <button type="submit" className={styles.primaryButton}>Update password</button>
          {status && <span role="status" style={{ fontSize: 14, color: '#d4d4d8' }}>{status}</span>}
        </div>
      </form>
    </div>
  );
}
