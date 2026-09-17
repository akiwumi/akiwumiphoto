'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminSidebar, { type Section } from '../AdminSidebar';
import { useGalleries } from '../useGalleries';
import styles from '../AdminShell.module.css';

export default function AdminRouteShell({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const galleries = useGalleries(); const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const [email, setEmail] = useState('');
  useEffect(() => { try { setCollapsed(window.localStorage.getItem('akiwumi-admin-sidebar-collapsed') === '1'); } catch {} supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || '')).catch(() => {}); }, []);
  const toggle = () => setCollapsed(v => { try { window.localStorage.setItem('akiwumi-admin-sidebar-collapsed', v ? '0' : '1'); } catch {} return !v; });
  const logout = async () => { await supabase.auth.signOut(); router.push('/admin'); };
  return <div className={styles.shell}>{mobileOpen && <div className={styles.scrim} onClick={() => setMobileOpen(false)} aria-hidden="true" />}<AdminSidebar section="galleries" onSection={() => router.push('/admin/dashboard')} galleries={galleries.galleries} selectedGalleryId={null} onSelectGallery={() => router.push('/admin/dashboard')} onReorderGalleries={galleries.reorder} activeModalCount={0} userEmail={email} onLogout={logout} collapsed={collapsed} onToggleCollapsed={toggle} mobileOpen={mobileOpen} /><main className={styles.main}><div className={styles.mobileBar}><button type="button" className={styles.iconButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18} /></button><strong>Akiwumi admin</strong><span style={{ width: 40 }} /></div>{children}</main></div>;
}
