'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GalleriesTab from './tabs/GalleriesTab';
import VideosTab from './tabs/VideosTab';
import PagesTab from './tabs/PagesTab';

type Tab = 'galleries' | 'videos' | 'pages' | 'settings';

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>('galleries');
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const TAB_STYLE = (tab: Tab) => ({
    padding: '8px 16px',
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #E8001C' : '2px solid transparent',
    color: activeTab === tab ? '#E8001C' : '#666',
    transition: 'all 150ms',
    fontFamily: 'inherit',
  });

  return (
    <div className="min-h-screen bg-grey-dark text-white flex flex-col">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 border-b border-white/10"
        style={{ height: 56, minHeight: 56, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <span className="text-white font-bold text-sm uppercase" style={{ letterSpacing: '0.12em' }}>
          AKIWUMI ADMIN
        </span>

        <div className="flex items-center gap-1">
          {(['galleries', 'videos', 'pages', 'settings'] as Tab[]).map((tab) => (
            <button key={tab} style={TAB_STYLE(tab)} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="ml-4 px-3 py-1 text-xs uppercase text-grey-mid hover:text-white transition-colors"
            style={{ letterSpacing: '0.12em', fontFamily: 'inherit' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'galleries' && <GalleriesTab />}
        {activeTab === 'videos' && <VideosTab />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function SettingsTab() {
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
    <div className="p-6 max-w-md">
      <h2 className="text-white font-bold uppercase mb-4" style={{ letterSpacing: '0.08em' }}>Settings</h2>
      <form onSubmit={handleChange} className="flex flex-col gap-3">
        <label className="text-grey-mid text-xs uppercase" style={{ letterSpacing: '0.1em' }}>New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 px-3 bg-black text-white text-sm"
          style={{ border: '1px solid #666', outline: 'none', fontFamily: 'inherit' }}
        />
        <label className="text-grey-mid text-xs uppercase" style={{ letterSpacing: '0.1em' }}>Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-10 px-3 bg-black text-white text-sm"
          style={{ border: '1px solid #666', outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          type="submit"
          className="h-10 px-6 text-white text-xs uppercase font-medium mt-1"
          style={{ background: '#E8001C', letterSpacing: '0.12em', fontFamily: 'inherit' }}
        >
          Update Password
        </button>
        {status && <p className="text-sm text-grey-mid">{status}</p>}
      </form>
    </div>
  );
}
