'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminSidebar, { type Section } from './AdminSidebar';
import { useGalleries } from './useGalleries';
import { useModals } from './tabs/ModalsTab';
import styles from './AdminShell.module.css';
import type { PageView } from './tabs/SitePagesTab';

const COLLAPSE_KEY = 'akiwumi-admin-sidebar-collapsed';
function subscribeCollapsed(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('admin-sidebar-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('admin-sidebar-change', callback);
  };
}
function readCollapsed() {
  try { return window.localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}
type AdminState = {
  galleries: ReturnType<typeof useGalleries>;
  modals: ReturnType<typeof useModals>;
  section: Section;
  modalId: string | null;
  setModalId: React.Dispatch<React.SetStateAction<string | null>>;
  pageView: PageView;
  setPageView: React.Dispatch<React.SetStateAction<PageView>>;
  galleryId: string | null;
  setGalleryId: React.Dispatch<React.SetStateAction<string | null>>;
  go: (section: Section) => void;
  openGallery: (id: string) => void;
};
const AdminContext = createContext<AdminState | null>(null);
export function useAdminShell() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('Admin content requires AdminShell');
  return value;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const galleries = useGalleries();
  const modals = useModals();
  const [section, setSection] = useState<Section>('galleries');
  const [modalId, setModalId] = useState<string | null>(null);
  const [pageView, setPageView] = useState<PageView>(null);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? '')).catch(() => {});
  }, []);

  const toggleCollapsed = () => {
    try { window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '0' : '1'); } catch { /* ignore */ }
    window.dispatchEvent(new Event('admin-sidebar-change'));
  };

  const go = (next: Section) => {
    setSection(next);
    setGalleryId(null);
    setModalId(null);
    setPageView(null);
    setMobileOpen(false);
    if (pathname !== '/admin/dashboard') router.push('/admin/dashboard');
  };

  const openGallery = (id: string) => {
    setSection('galleries');
    setGalleryId(id);
    setMobileOpen(false);
    if (pathname !== '/admin/dashboard') router.push('/admin/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };


  const activeSection = pathname.startsWith('/admin/dashboard/registrations')
    ? 'registrations'
    : pathname.startsWith('/admin/dashboard/customers') ? 'customers'
      : section;
  return (
    <AdminContext.Provider value={{ galleries, modals, section, galleryId, setGalleryId, go, openGallery, modalId, setModalId, pageView, setPageView }}>
    <div className={styles.shell}>
      {mobileOpen && <div className={styles.scrim} onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <AdminSidebar
        section={activeSection}
        onSection={go}
        galleries={galleries.galleries}
        selectedGalleryId={galleryId}
        onSelectGallery={openGallery}
        onReorderGalleries={galleries.reorder}
        activeModalCount={modals.liveCount}
        userEmail={userEmail}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <main className={styles.main}>
        <div className={styles.mobileBar}>
          <button type="button" className={styles.iconButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
          <strong>Akiwumi admin</strong>
          <span style={{ width: 40 }} />
        </div>

        {children}
      </main>
    </div>
    </AdminContext.Provider>
  );
}
