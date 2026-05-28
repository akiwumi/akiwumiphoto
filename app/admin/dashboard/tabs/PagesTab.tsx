'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type PageKey = 'about' | 'splash' | 'prints';

export default function PagesTab() {
  const [activePage, setActivePage] = useState<PageKey>('about');
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      const { data } = await supabase.from('page_content').select('page, key, value');
      const map: Record<string, string> = {};
      (data || []).forEach((row: { page: string; key: string; value: string }) => {
        map[`${row.page}__${row.key}`] = row.value || '';
      });
      setContent(map);
      setLoading(false);
    };
    fetchContent();
  }, []);

  const get = (page: string, key: string) => content[`${page}__${key}`] || '';
  const set = (page: string, key: string, value: string) =>
    setContent((p) => ({ ...p, [`${page}__${key}`]: value }));

  const save = async (page: string, updates: Record<string, string>) => {
    setSaving(true);
    for (const [key, value] of Object.entries(updates)) {
      await supabase
        .from('page_content')
        .upsert({ page, key, value }, { onConflict: 'page,key' });
    }
    setSaving(false);
    setMsg('Saved.');
    setTimeout(() => setMsg(''), 2000);
  };

  const handlePortraitUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setMsg('Only JPG and PNG files are supported.');
      return;
    }
    setUploadingPortrait(true);
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const path = `portrait/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('about-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('about-images').getPublicUrl(data.path);
      set('about', 'portrait_image', urlData.publicUrl);
    } else if (error) {
      setMsg(`Upload failed: ${error.message}`);
    }
    setUploadingPortrait(false);
  };

  const INPUT = { background: '#111', border: '1px solid #444', color: '#fff', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none', width: '100%' };
  const LABEL = { display: 'block', color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 };

  const TAB_BTN = (tab: PageKey) => ({
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    borderBottom: activePage === tab ? '2px solid #E8001C' : '2px solid transparent',
    color: activePage === tab ? '#E8001C' : '#666',
    fontFamily: 'inherit',
  });

  if (loading) return <div className="p-6 text-grey-mid text-sm">Loading…</div>;

  return (
    <div className="p-6">
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {(['about', 'splash', 'prints'] as PageKey[]).map((p) => (
          <button key={p} style={TAB_BTN(p)} onClick={() => setActivePage(p)}>{p}</button>
        ))}
      </div>

      {activePage === 'about' && (
        <div className="max-w-lg flex flex-col gap-4">
          <h3 className="text-white font-bold uppercase text-sm" style={{ letterSpacing: '0.08em' }}>About Page</h3>
          <div>
            <label style={LABEL}>Bio Text</label>
            <textarea
              style={{ ...INPUT, minHeight: 160, resize: 'vertical' }}
              value={get('about', 'bio')}
              onChange={(e) => set('about', 'bio', e.target.value)}
            />
          </div>
          <div>
            <label style={LABEL}>Portrait Image</label>
            {get('about', 'portrait_image') && (
              <div className="relative mb-2" style={{ aspectRatio: '3/4', maxWidth: 160 }}>
                <Image src={get('about', 'portrait_image')} alt="Portrait" fill className="object-cover" sizes="160px" unoptimized />
              </div>
            )}
            <input type="file" ref={portraitInputRef} className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handlePortraitUpload(e.target.files)} />
            <button onClick={() => portraitInputRef.current?.click()} disabled={uploadingPortrait} className="px-4 h-8 text-xs uppercase text-grey-mid border border-white/20 hover:border-white/40 transition-colors" style={{ fontFamily: 'inherit', letterSpacing: '0.1em' }}>
              {uploadingPortrait ? 'Uploading…' : 'Upload Portrait'}
            </button>
          </div>
          <button onClick={() => save('about', { bio: get('about', 'bio'), portrait_image: get('about', 'portrait_image') })} disabled={saving} className="px-6 h-9 text-white text-xs uppercase font-medium w-fit" style={{ background: '#E8001C', letterSpacing: '0.1em', fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {activePage === 'splash' && (
        <div className="max-w-lg flex flex-col gap-4">
          <h3 className="text-white font-bold uppercase text-sm" style={{ letterSpacing: '0.08em' }}>Splash Page</h3>
          <div>
            <label style={LABEL}>Title Text</label>
            <input style={INPUT} value={get('splash', 'title')} onChange={(e) => set('splash', 'title', e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label style={{ ...LABEL, margin: 0 }}>Ambient Music</label>
            <button
              onClick={() => set('splash', 'music_enabled', get('splash', 'music_enabled') === 'true' ? 'false' : 'true')}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: get('splash', 'music_enabled') === 'true' ? '#22c55e' : '#444', fontFamily: 'inherit' }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: get('splash', 'music_enabled') === 'true' ? 'calc(100% - 22px)' : 2 }} />
            </button>
          </div>
          <button onClick={() => save('splash', { title: get('splash', 'title'), music_enabled: get('splash', 'music_enabled') })} disabled={saving} className="px-6 h-9 text-white text-xs uppercase font-medium w-fit" style={{ background: '#E8001C', letterSpacing: '0.1em', fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {activePage === 'prints' && (
        <div className="max-w-lg flex flex-col gap-4">
          <h3 className="text-white font-bold uppercase text-sm" style={{ letterSpacing: '0.08em' }}>Prints Pricing</h3>
          {['small', 'medium', 'large', 'ultra'].map((size) => (
            <div key={size}>
              <label style={LABEL}>{size} Print Price</label>
              <input
                style={INPUT}
                value={get('prints', `${size}_price`)}
                onChange={(e) => set('prints', `${size}_price`, e.target.value)}
                placeholder="e.g. £350 or POA"
              />
            </div>
          ))}
          <button
            onClick={() => save('prints', Object.fromEntries(['small', 'medium', 'large', 'ultra'].map((s) => [`${s}_price`, get('prints', `${s}_price`)])))}
            disabled={saving}
            className="px-6 h-9 text-white text-xs uppercase font-medium w-fit"
            style={{ background: '#E8001C', letterSpacing: '0.1em', fontFamily: 'inherit' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {msg && <p className="text-grey-mid text-xs mt-4">{msg}</p>}
    </div>
  );
}
