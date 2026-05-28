'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Reorder } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { Video } from '@/types';

export default function VideosTab() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('videos').select('*').order('sort_order', { ascending: true });
    setVideos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleReorder = useCallback((newOrder: Video[]) => {
    setVideos(newOrder);
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    reorderTimer.current = setTimeout(async () => {
      await Promise.all(
        newOrder.map((v, i) => supabase.from('videos').update({ sort_order: i }).eq('id', v.id))
      );
    }, 600);
  }, []);

  const handleCreate = async () => {
    const { data } = await supabase
      .from('videos')
      .insert({ title: 'New Video', video_url: '', sort_order: videos.length })
      .select()
      .single();
    if (data) { await fetchVideos(); setSelectedId(data.id); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this video?')) return;
    await supabase.from('videos').delete().eq('id', id);
    setSelectedId(null);
    fetchVideos();
  };

  const selected = videos.find((v) => v.id === selectedId) || null;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-56 flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <p className="text-grey-mid text-xs uppercase mb-2" style={{ letterSpacing: '0.12em' }}>Videos</p>
          <button
            onClick={handleCreate}
            className="w-full h-8 text-white text-xs uppercase font-medium"
            style={{ background: '#E8001C', letterSpacing: '0.1em', fontFamily: 'inherit' }}
          >
            + Add Video
          </button>
        </div>
        <Reorder.Group
          as="div"
          axis="y"
          values={videos}
          onReorder={handleReorder}
          className="flex-1 overflow-y-auto"
          style={{ padding: 0, margin: 0 }}
        >
          {loading && <p className="text-grey-mid text-xs p-3">Loading…</p>}
          {videos.map((v) => (
            <Reorder.Item
              key={v.id}
              value={v}
              as="div"
              className="border-b border-white/5"
              style={{ listStyle: 'none', cursor: 'grab' }}
              whileDrag={{ backgroundColor: 'rgba(255,255,255,0.10)', zIndex: 10 }}
            >
              <button
                onClick={() => setSelectedId(v.id)}
                className="w-full text-left px-3 py-3 hover:bg-white/5 transition-colors"
                style={{ background: selectedId === v.id ? 'rgba(255,255,255,0.07)' : 'transparent', fontFamily: 'inherit', cursor: 'inherit' }}
              >
                <div className="flex items-center gap-2">
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="#444" className="flex-shrink-0">
                    <circle cx="2" cy="2" r="1.2" /><circle cx="6" cy="2" r="1.2" />
                    <circle cx="2" cy="6" r="1.2" /><circle cx="6" cy="6" r="1.2" />
                    <circle cx="2" cy="10" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                  </svg>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.published ? '#22c55e' : '#666' }} />
                  <span className="text-white text-xs truncate">{v.title}</span>
                </div>
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-grey-mid text-sm">Select or create a video</p>
          </div>
        ) : (
          <VideoEditor video={selected} onSave={fetchVideos} onDelete={() => handleDelete(selected.id)} />
        )}
      </div>
    </div>
  );
}

function VideoEditor({ video, onSave, onDelete }: { video: Video; onSave: () => void; onDelete: () => void }) {
  const [form, setForm] = useState({
    title: video.title,
    description: video.description || '',
    video_url: video.video_url,
    published: video.published,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [thumbnail, setThumbnail] = useState(video.thumbnail || '');
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ title: video.title, description: video.description || '', video_url: video.video_url, published: video.published });
    setThumbnail(video.thumbnail || '');
  }, [video]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('videos').update({ ...form, thumbnail, updated_at: new Date().toISOString() }).eq('id', video.id);
    setSaving(false);
    setMsg(error ? 'Error saving.' : 'Saved.');
    onSave();
    setTimeout(() => setMsg(''), 2000);
  };

  const handlePublishToggle = async () => {
    const newVal = !form.published;
    setForm((p) => ({ ...p, published: newVal }));
    await supabase.from('videos').update({ published: newVal }).eq('id', video.id);
    onSave();
  };

  const handleThumbUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setMsg('Only JPG and PNG files are supported.');
      return;
    }
    setUploadingThumb(true);
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const path = `videos/${video.id}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('photography').upload(path, file, { cacheControl: '3600', upsert: false });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('photography').getPublicUrl(data.path);
      setThumbnail(urlData.publicUrl);
    } else if (error) {
      setMsg(`Upload failed: ${error.message}`);
    }
    setUploadingThumb(false);
  };

  const INPUT = { background: '#111', border: '1px solid #444', color: '#fff', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none', width: '100%' };
  const LABEL = { display: 'block', color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 };

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-bold uppercase text-base" style={{ letterSpacing: '0.08em' }}>Edit Video</h2>
        <button onClick={onDelete} className="text-xs uppercase px-3 py-1.5 border border-red text-red hover:bg-red hover:text-white transition-colors" style={{ letterSpacing: '0.1em', fontFamily: 'inherit' }}>Delete</button>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div>
          <label style={LABEL}>Title</label>
          <input style={INPUT} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label style={LABEL}>Video URL (YouTube / Vimeo / Direct)</label>
          <input style={INPUT} value={form.video_url} onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div>
          <label style={LABEL}>Description</label>
          <textarea style={{ ...INPUT, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>

        {/* Thumbnail */}
        <div>
          <label style={LABEL}>Thumbnail</label>
          {thumbnail && (
            <div className="relative mb-2" style={{ aspectRatio: '16/9', maxWidth: 280 }}>
              <Image src={thumbnail} alt="Thumbnail" fill className="object-cover" sizes="280px" />
            </div>
          )}
          <input type="file" ref={thumbInputRef} className="hidden" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(e) => handleThumbUpload(e.target.files)} />
          <button onClick={() => thumbInputRef.current?.click()} disabled={uploadingThumb} className="px-4 h-8 text-xs uppercase text-grey-mid border border-white/20 hover:border-white/40 transition-colors" style={{ fontFamily: 'inherit', letterSpacing: '0.1em' }}>
            {uploadingThumb ? 'Uploading…' : 'Upload Thumbnail'}
          </button>
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <label style={{ ...LABEL, margin: 0 }}>Published</label>
          <button onClick={handlePublishToggle} className="relative w-12 h-6 rounded-full transition-colors" style={{ background: form.published ? '#22c55e' : '#444', fontFamily: 'inherit' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: form.published ? 'calc(100% - 22px)' : 2 }} />
          </button>
          <span className="text-grey-mid text-xs">{form.published ? 'Live' : 'Draft'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="px-6 h-9 text-white text-xs uppercase font-medium" style={{ background: '#E8001C', letterSpacing: '0.1em', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <span className="text-grey-mid text-xs self-center">{msg}</span>}
      </div>
    </div>
  );
}
