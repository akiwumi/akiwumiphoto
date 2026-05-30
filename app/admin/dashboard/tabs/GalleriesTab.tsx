'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Reorder } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { DEMO_GALLERIES, DEMO_IMAGES } from '@/lib/demo-data';
import type { Gallery, GalleryImage } from '@/types';

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const PLACEHOLDER = ['your-project', 'your-anon'];
function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return url.startsWith('https://') && !PLACEHOLDER.some((p) => url.includes(p)) && key.length > 20;
}

export default function GalleriesTab() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setGalleries(DEMO_GALLERIES);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setGalleries(data || []);
      setIsDemoMode(false);
    } catch {
      setGalleries(DEMO_GALLERIES);
      setIsDemoMode(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGalleries(); }, [fetchGalleries]);

  const handleReorder = useCallback((newOrder: Gallery[]) => {
    setGalleries(newOrder);
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    reorderTimer.current = setTimeout(async () => {
      await Promise.all(
        newOrder.map((g, i) => supabase.from('galleries').update({ sort_order: i }).eq('id', g.id))
      );
    }, 600);
  }, []);

  const selectedGallery = galleries.find((g) => g.id === selectedId) || null;

  const handleCreate = async () => {
    if (isDemoMode) return;
    const { data } = await supabase
      .from('galleries')
      .insert({ title: 'New Gallery', slug: `gallery-${Date.now()}`, sort_order: galleries.length, published: true })
      .select()
      .single();
    if (data) {
      await fetchGalleries();
      setSelectedId(data.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemoMode) {
      alert('Connect Supabase to delete galleries.');
      return;
    }
    if (!confirm('Delete this gallery and all its images? This cannot be undone.')) return;
    await supabase.from('gallery_images').delete().eq('gallery_id', id);
    await supabase.from('galleries').delete().eq('id', id);
    setSelectedId(null);
    fetchGalleries();
  };

  const handleSeedToDatabase = async () => {
    if (!isSupabaseConfigured()) {
      alert('Configure Supabase credentials in .env.local first.');
      return;
    }
    if (!confirm('Seed all 6 demo galleries into Supabase? This will create them as real editable galleries.')) return;
    for (const g of DEMO_GALLERIES) {
      const { data: created } = await supabase
        .from('galleries')
        .insert({
          title: g.title,
          slug: g.slug,
          description: g.description,
          cover_image: g.cover_image,
          sort_order: g.sort_order,
          published: g.published,
        })
        .select()
        .single();
      if (created) {
        const imgs = DEMO_IMAGES[g.id] || [];
        for (const img of imgs) {
          await supabase.from('gallery_images').insert({
            gallery_id: created.id,
            storage_path: img.storage_path,
            title: img.title,
            description: img.description,
            sort_order: img.sort_order,
          });
        }
      }
    }
    await fetchGalleries();
  };

  return (
    <div className="flex h-full overflow-hidden flex-col">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ background: '#1a1000', borderBottom: '1px solid #E8001C33' }}
        >
          <span className="text-xs" style={{ color: '#E8001C' }}>
            Demo mode — changes will not be saved until Supabase is configured
          </span>
          <button
            onClick={handleSeedToDatabase}
            className="text-xs uppercase px-3 py-1 text-white"
            style={{ background: '#E8001C', letterSpacing: '0.1em', fontFamily: 'inherit' }}
          >
            Seed to Database
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — gallery list */}
        <div
          className="w-56 flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden"
          style={{ minWidth: 200 }}
        >
          <div className="p-3 border-b border-white/10">
            <p className="text-grey-mid text-xs uppercase mb-2" style={{ letterSpacing: '0.12em' }}>
              Galleries ({galleries.length})
            </p>
            <button
              onClick={handleCreate}
              disabled={isDemoMode}
              className="w-full h-8 text-white text-xs uppercase font-medium"
              style={{
                background: isDemoMode ? '#444' : '#E8001C',
                letterSpacing: '0.1em',
                fontFamily: 'inherit',
                cursor: isDemoMode ? 'not-allowed' : 'pointer',
              }}
            >
              + New Gallery
            </button>
          </div>

          <Reorder.Group
            as="div"
            axis="y"
            values={galleries}
            onReorder={handleReorder}
            className="flex-1 overflow-y-auto"
            style={{ padding: 0, margin: 0 }}
          >
            {loading && <p className="text-grey-mid text-xs p-3">Loading…</p>}
            {galleries.map((g) => (
              <Reorder.Item
                key={g.id}
                value={g}
                as="div"
                className="border-b border-white/5"
                style={{ listStyle: 'none', cursor: 'grab' }}
                whileDrag={{ backgroundColor: 'rgba(255,255,255,0.10)', zIndex: 10 }}
              >
                <button
                  onClick={() => setSelectedId(g.id)}
                  className="w-full text-left px-3 py-3 hover:bg-white/5 transition-colors"
                  style={{
                    background: selectedId === g.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                    fontFamily: 'inherit',
                    cursor: 'inherit',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="#444" className="flex-shrink-0">
                      <circle cx="2" cy="2" r="1.2" /><circle cx="6" cy="2" r="1.2" />
                      <circle cx="2" cy="6" r="1.2" /><circle cx="6" cy="6" r="1.2" />
                      <circle cx="2" cy="10" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                    </svg>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: g.published ? '#22c55e' : '#666' }}
                    />
                    <span className="text-white text-xs truncate">{g.title}</span>
                    {isDemoMode && (
                      <span className="text-xs flex-shrink-0" style={{ color: '#E8001C', fontSize: '0.6rem' }}>
                        DEMO
                      </span>
                    )}
                  </div>
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="p-2 border-t border-white/10 text-grey-mid text-xs">
            <span className="block">● published</span>
            <span className="block">○ draft</span>
          </div>
        </div>

        {/* Right panel — gallery editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedGallery ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-grey-mid text-sm">Select a gallery to edit</p>
            </div>
          ) : (
            <GalleryEditor
              gallery={selectedGallery}
              isDemoMode={isDemoMode}
              onSave={fetchGalleries}
              onDelete={() => handleDelete(selectedGallery.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GalleryEditor({
  gallery,
  isDemoMode,
  onSave,
  onDelete,
}: {
  gallery: Gallery;
  isDemoMode: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    title: gallery.title,
    slug: gallery.slug,
    description: gallery.description || '',
    published: gallery.published,
  });
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    if (isDemoMode) {
      setImages(DEMO_IMAGES[gallery.id] || []);
      return;
    }
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('sort_order', { ascending: true });
    setImages(data || []);
  }, [gallery.id, isDemoMode]);

  useEffect(() => {
    setForm({
      title: gallery.title,
      slug: gallery.slug,
      description: gallery.description || '',
      published: gallery.published,
    });
    fetchImages();
  }, [gallery, fetchImages]);

  const handleTitleChange = (title: string) => {
    setForm((p) => ({ ...p, title, slug: slugify(title) }));
  };

  const handleSave = async () => {
    if (isDemoMode) { setMsg('Connect Supabase to save.'); setTimeout(() => setMsg(''), 2000); return; }
    setSaving(true);
    const { error } = await supabase
      .from('galleries')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', gallery.id);
    setSaving(false);
    setMsg(error ? 'Error saving.' : 'Saved.');
    onSave();
    setTimeout(() => setMsg(''), 2000);
  };

  const handlePublishToggle = async () => {
    if (isDemoMode) return;
    const newVal = !form.published;
    setForm((p) => ({ ...p, published: newVal }));
    await supabase.from('galleries').update({ published: newVal }).eq('id', gallery.id);
    onSave();
  };

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

  const handleUpload = async (files: FileList | File[] | null) => {
    if (!files || (files as FileList | File[]).length === 0 || isDemoMode) return;
    const fileArr = Array.from(files as FileList);
    const invalid = fileArr.filter((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid.length > 0) {
      alert(`Only JPG and PNG files are allowed. Rejected: ${invalid.map((f) => f.name).join(', ')}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const valid = fileArr.filter((f) => ALLOWED_TYPES.includes(f.type));
    setUploadProgress({ done: 0, total: valid.length });
    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const safeName = `${Date.now()}-${i}.${ext}`;
      const path = `galleries/${gallery.id}/${safeName}`;
      const { data: uploadData, error } = await supabase.storage
        .from('gallery-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (!error && uploadData) {
        const { data: urlData } = supabase.storage.from('gallery-images').getPublicUrl(uploadData.path);
        await supabase.from('gallery_images').insert({
          gallery_id: gallery.id,
          storage_path: urlData.publicUrl,
          sort_order: images.length + i,
        });
      }
      setUploadProgress({ done: i + 1, total: valid.length });
    }
    await fetchImages();
    if (!gallery.cover_image && images.length === 0) {
      const { data: first } = await supabase
        .from('gallery_images')
        .select('storage_path')
        .eq('gallery_id', gallery.id)
        .order('sort_order')
        .limit(1)
        .single();
      if (first) await supabase.from('galleries').update({ cover_image: first.storage_path }).eq('id', gallery.id);
    }
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onSave();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isDemoMode) return;
    handleUpload(e.dataTransfer.files);
  };

  const handleSetCover = async (imagePath: string) => {
    if (isDemoMode) return;
    await supabase.from('galleries').update({ cover_image: imagePath }).eq('id', gallery.id);
    onSave();
  };

  const handleDeleteImage = async (imageId: string) => {
    if (isDemoMode) return;
    const img = images.find((i) => i.id === imageId);
    if (img) {
      // Extract storage path from the full public URL
      const url = new URL(img.storage_path);
      const storagePath = url.pathname.split('/object/public/gallery-images/')[1];
      if (storagePath) await supabase.storage.from('gallery-images').remove([storagePath]);
    }
    await supabase.from('gallery_images').delete().eq('id', imageId);
    fetchImages();
  };

  const handleImageFieldUpdate = async (imageId: string, field: 'title' | 'description', value: string) => {
    if (isDemoMode) return;
    await supabase.from('gallery_images').update({ [field]: value }).eq('id', imageId);
  };

  const INPUT = {
    background: '#111',
    border: '1px solid #444',
    color: isDemoMode ? '#888' : '#fff',
    padding: '8px 12px',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
  };

  const LABEL = {
    display: 'block',
    color: '#666',
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: 4,
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-bold uppercase text-base" style={{ letterSpacing: '0.08em' }}>
          {isDemoMode ? `${gallery.title} (Demo)` : 'Edit Gallery'}
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={`/gallery/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-grey-mid hover:text-white transition-colors uppercase"
            style={{ letterSpacing: '0.1em' }}
          >
            Preview →
          </a>
          <button
            onClick={onDelete}
            className="text-xs uppercase px-3 py-1.5 border border-red text-red hover:bg-red hover:text-white transition-colors"
            style={{ letterSpacing: '0.1em', fontFamily: 'inherit' }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div>
          <label style={LABEL}>Gallery Title</label>
          <input
            style={INPUT}
            value={form.title}
            readOnly={isDemoMode}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
        </div>

        <div>
          <label style={LABEL}>Slug (URL path)</label>
          <input
            style={INPUT}
            value={form.slug}
            readOnly={isDemoMode}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          />
          <p className="text-grey-mid text-xs mt-1">/gallery/{form.slug}</p>
        </div>

        <div>
          <label style={LABEL}>Description</label>
          <textarea
            style={{ ...INPUT, minHeight: 80, resize: 'vertical' }}
            value={form.description}
            readOnly={isDemoMode}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-3">
          <label style={{ ...LABEL, margin: 0 }}>Published</label>
          <button
            onClick={handlePublishToggle}
            disabled={isDemoMode}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: form.published ? '#22c55e' : '#444', fontFamily: 'inherit', cursor: isDemoMode ? 'not-allowed' : 'pointer' }}
            aria-label="Toggle published"
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: form.published ? 'calc(100% - 22px)' : 2 }}
            />
          </button>
          <span className="text-grey-mid text-xs">{form.published ? 'Live on homepage' : 'Draft — hidden'}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 h-9 text-white text-xs uppercase font-medium"
          style={{ background: isDemoMode ? '#444' : '#E8001C', letterSpacing: '0.1em', fontFamily: 'inherit', opacity: saving ? 0.6 : 1, cursor: isDemoMode ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <span className="text-grey-mid text-xs self-center">{msg}</span>}
      </div>

      <div className="h-px bg-white/10 mb-6" />

      {/* Images */}
      <div className="mb-4">
        <h3 className="text-white text-sm uppercase font-medium mb-3" style={{ letterSpacing: '0.08em' }}>
          Images ({images.length})
        </h3>
        {!isDemoMode && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <div
              onClick={() => !uploadProgress && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors mb-4"
              style={{
                minHeight: 96,
                borderColor: dragOver ? '#E8001C' : uploadProgress ? '#444' : 'rgba(255,255,255,0.2)',
                background: dragOver ? 'rgba(232,0,28,0.06)' : 'transparent',
                cursor: uploadProgress ? 'default' : 'pointer',
                padding: '20px 16px',
              }}
            >
              {uploadProgress ? (
                <>
                  <div className="w-full max-w-xs bg-white/10 rounded-full overflow-hidden" style={{ height: 3 }}>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%`,
                        background: '#E8001C',
                      }}
                    />
                  </div>
                  <span className="text-grey-mid text-xs uppercase" style={{ letterSpacing: '0.1em' }}>
                    Uploading {uploadProgress.done} of {uploadProgress.total}…
                  </span>
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="text-grey-mid text-xs uppercase text-center" style={{ letterSpacing: '0.1em' }}>
                    Drop images here or click to browse
                    <br />
                    <span style={{ opacity: 0.5 }}>JPG · PNG · Select multiple</span>
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((img) => (
          <ImageCard
            key={img.id}
            image={img}
            isDemoMode={isDemoMode}
            isCover={gallery.cover_image === img.storage_path}
            onSetCover={() => handleSetCover(img.storage_path)}
            onDelete={() => handleDeleteImage(img.id)}
            onUpdate={handleImageFieldUpdate}
          />
        ))}
      </div>
    </div>
  );
}

function ImageCard({
  image,
  isDemoMode,
  isCover,
  onSetCover,
  onDelete,
  onUpdate,
}: {
  image: GalleryImage;
  isDemoMode: boolean;
  isCover: boolean;
  onSetCover: () => void;
  onDelete: () => void;
  onUpdate: (id: string, field: 'title' | 'description', value: string) => void;
}) {
  const [title, setTitle] = useState(image.title || '');
  const [desc, setDesc] = useState(image.description || '');

  const INPUT_SM = {
    background: '#111',
    border: '1px solid #333',
    color: isDemoMode ? '#888' : '#fff',
    padding: '4px 8px',
    fontFamily: 'inherit',
    fontSize: '0.75rem',
    outline: 'none',
    width: '100%',
    marginTop: 4,
  };

  return (
    <div className="bg-black/40 border border-white/10">
      <div className="relative aspect-square">
        <Image
          src={image.storage_path}
          alt={image.title || 'Gallery image'}
          fill
          unoptimized
          className="object-cover"
          sizes="200px"
        />
        {isCover && (
          <div
            className="absolute top-1 left-1 px-1.5 py-0.5 text-white text-xs"
            style={{ background: '#E8001C', fontSize: '0.6rem', letterSpacing: '0.1em' }}
          >
            COVER
          </div>
        )}
      </div>

      <div className="p-2">
        <input
          style={INPUT_SM}
          placeholder="Title"
          value={title}
          readOnly={isDemoMode}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onUpdate(image.id, 'title', title)}
        />
        <input
          style={INPUT_SM}
          placeholder="Description"
          value={desc}
          readOnly={isDemoMode}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => onUpdate(image.id, 'description', desc)}
        />

        {!isDemoMode && (
          <div className="flex gap-1 mt-2">
            <button
              onClick={onSetCover}
              className="flex-1 py-1 text-xs uppercase text-grey-mid hover:text-white transition-colors border border-white/20 hover:border-white/40"
              style={{ fontFamily: 'inherit', letterSpacing: '0.08em' }}
            >
              ★ Cover
            </button>
            <button
              onClick={onDelete}
              className="py-1 px-2 text-xs text-red hover:bg-red hover:text-white transition-colors border border-red/40"
              style={{ fontFamily: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
