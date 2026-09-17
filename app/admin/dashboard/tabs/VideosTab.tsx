'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EllipsisVertical, Eye, EyeOff, ExternalLink, Film, GripVertical, Pencil, Trash2 } from 'lucide-react';
import styles from '../AdminShell.module.css';
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; handleReorder(arrayMove(videos, videos.findIndex(v => v.id === active.id), videos.findIndex(v => v.id === over.id))); };
  return <div className={styles.contentPad}>{loading && <p className={styles.empty}>Loading videos…</p>}{!loading && videos.length === 0 && <p className={styles.empty}>No videos yet.</p>}<div className={styles.toolbar}><span className={styles.subtitle}>Drag cards to set the Film page order.</span><button type="button" className={styles.primaryButton} onClick={handleCreate}>+ Add video</button></div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={videos.map(v => v.id)} strategy={rectSortingStrategy}><div className={styles.cardGrid}>{videos.map(v => <VideoCard key={v.id} video={v} selected={selectedId === v.id} onOpen={() => setSelectedId(v.id)} onDelete={() => handleDelete(v.id)} />)}</div></SortableContext></DndContext>{selected && <div className={styles.panel} style={{ marginTop: 32 }}><VideoEditor video={selected} onSave={fetchVideos} onDelete={() => handleDelete(selected.id)} /></div>}</div>;
}

function VideoCard({ video, selected, onOpen, onDelete }: { video: Video; selected: boolean; onOpen: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });
  return <article ref={setNodeRef} className={`${styles.card} ${isDragging ? styles.dragging : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}><button type="button" className={styles.cardButton} onClick={onOpen} aria-label={`Edit ${video.title}`}>{video.thumbnail ? <Image src={video.thumbnail} alt="" fill unoptimized sizes="(max-width: 860px) 100vw, 45vw" /> : <span className={styles.cardEmpty}><Film size={40} /></span>}<span className={styles.cardShade} /><span className={styles.cardText}><span className={styles.cardMeta}>{video.published ? 'Published' : 'Draft'} <i /> Film</span><span className={styles.cardTitle}>{video.title}</span></span></button>{!video.published && <span className={styles.draftTag}>Draft</span>}<div className={styles.cardTools}><button type="button" ref={setActivatorNodeRef} className={`${styles.cardIcon} ${styles.cardGrip}`} aria-label={`Move ${video.title}`} {...attributes} {...listeners}><GripVertical size={18} /></button><button type="button" className={styles.cardIcon} onClick={onOpen} aria-label="Edit video"><Pencil size={17} /></button></div></article>;
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

  const INPUT = { background: '#111', border: '1px solid #444', color: '#fff', padding: '8px 12px', fontFamily: 'inherit', fontSize: 'var(--body-size)', outline: 'none', width: '100%' };
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
        {msg && <span className="text-grey-mid text-base self-center">{msg}</span>}
      </div>
    </div>
  );
}
