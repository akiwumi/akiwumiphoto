'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from './dnd-modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  Camera, Ellipsis, ExternalLink, FileText, Film, Frame, GripVertical, Images, LogOut,
  MessageSquareText, Newspaper, PanelLeftClose, PanelLeftOpen, Settings,
} from 'lucide-react';
import styles from './AdminShell.module.css';
import type { Gallery } from '@/types';

export type Section = 'galleries' | 'videos' | 'prints' | 'pages' | 'modals' | 'settings';

const PORTFOLIO: { id: Section; label: string; icon: typeof Images }[] = [
  { id: 'galleries', label: 'Galleries', icon: Images },
  { id: 'videos', label: 'Videos', icon: Film },
  { id: 'prints', label: 'Prints', icon: Frame },
  { id: 'pages', label: 'Pages', icon: FileText },
];

interface Props {
  section: Section;
  onSection: (section: Section) => void;
  galleries: Gallery[];
  selectedGalleryId: string | null;
  onSelectGallery: (id: string) => void;
  onReorderGalleries: (next: Gallery[]) => void;
  activeModalCount: number;
  userEmail: string;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
}

export default function AdminSidebar(props: Props) {
  const { section, onSection, galleries, collapsed } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => { if (!userRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = galleries.findIndex((g) => g.id === active.id);
    const to = galleries.findIndex((g) => g.id === over.id);
    props.onReorderGalleries(arrayMove(galleries, from, to));
  };

  const initials = (props.userEmail || 'A').slice(0, 1).toUpperCase();

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${props.mobileOpen ? styles.mobileOpen : ''}`}
      aria-label="Admin navigation"
    >
      <div className={styles.brandRow}>
        <a href="/" className={styles.brand} target="_blank" rel="noopener noreferrer" title="Open the site">
          <Camera size={24} strokeWidth={2.2} aria-hidden="true" />
          <span className={styles.brandLabel}>Akiwumi</span>
        </a>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.collapseToggle}`}
          onClick={props.onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className={styles.navScroll}>
        <p className={styles.sectionLabel}>Portfolio</p>
        {PORTFOLIO.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.navItem} ${section === id ? styles.active : ''}`}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => onSection(id)}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span className={styles.navLabel}>{label}</span>
            {id === 'galleries' && galleries.length > 0 && <span className={`${styles.badge} ${styles.badgeGreen}`}>{galleries.length}</span>}
          </button>
        ))}
        <a href="/admin/dashboard/registrations" className={styles.navItem}>
          <FileText size={20} aria-hidden="true" /><span className={styles.navLabel}>Print registrations</span>
        </a>

        {galleries.length > 0 && (
          <>
            <p className={styles.sectionLabel}>
              <span>Gallery order</span>
              <span className={styles.sectionHint}>drag to rearrange</span>
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
              <SortableContext items={galleries.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                <ol className={styles.galleryList}>
                  {galleries.map((gallery, index) => (
                    <SortableGallery
                      key={gallery.id}
                      gallery={gallery}
                      position={index + 1}
                      selected={section === 'galleries' && props.selectedGalleryId === gallery.id}
                      onSelect={() => props.onSelectGallery(gallery.id)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          </>
        )}

        <p className={styles.sectionLabel}>Other</p>
        <button
          type="button"
          className={`${styles.navItem} ${section === 'modals' ? styles.active : ''}`}
          aria-current={section === 'modals' ? 'page' : undefined}
          onClick={() => onSection('modals')}
          title={collapsed ? 'Modals' : undefined}
        >
          <MessageSquareText size={20} aria-hidden="true" />
          <span className={styles.navLabel}>Modals</span>
          {props.activeModalCount > 0 && <span className={styles.badge} aria-label={`${props.activeModalCount} live`}>{props.activeModalCount}</span>}
        </button>
        <a href="/news" target="_blank" rel="noopener noreferrer" className={styles.navItem} title={collapsed ? 'News page' : undefined}>
          <Newspaper size={20} aria-hidden="true" />
          <span className={styles.navLabel}>News page</span>
        </a>
        <button
          type="button"
          className={`${styles.navItem} ${section === 'settings' ? styles.active : ''}`}
          aria-current={section === 'settings' ? 'page' : undefined}
          onClick={() => onSection('settings')}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={20} aria-hidden="true" />
          <span className={styles.navLabel}>Settings</span>
        </button>
      </nav>

      <div className={styles.promo}>
        <strong>Your site is live</strong>
        <p>See your galleries and news the way visitors do.</p>
        <a href="/home" target="_blank" rel="noopener noreferrer">Open site <ExternalLink size={15} aria-hidden="true" /></a>
      </div>

      <div className={styles.user} ref={userRef}>
        <span className={styles.avatar} aria-hidden="true">{initials}</span>
        <span className={styles.userName}>Eugene A.<small>{props.userEmail || 'Administrator'}</small></span>
        <button type="button" className={styles.iconButton} aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <Ellipsis size={18} />
        </button>
        {menuOpen && (
          <div className={`${styles.menu} ${styles.menuUp}`} role="menu">
            <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); onSection('settings'); }}>
              <Settings size={16} aria-hidden="true" /> Change password
            </button>
            <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuDanger}`} onClick={props.onLogout}>
              <LogOut size={16} aria-hidden="true" /> Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function SortableGallery({ gallery, position, selected, onSelect }: {
  gallery: Gallery; position: number; selected: boolean; onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: gallery.id });
  return (
    <li
      ref={setNodeRef}
      className={`${styles.galleryItem} ${isDragging ? styles.dragging : ''} ${selected ? styles.selected : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // The whole row drags with the pointer; a click without movement still opens the gallery.
      onPointerDown={listeners?.onPointerDown as React.PointerEventHandler | undefined}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={styles.grip}
        aria-label={`Move ${gallery.title}, position ${position}. Press space, then the arrow keys.`}
        {...attributes}
        onKeyDown={listeners?.onKeyDown as React.KeyboardEventHandler | undefined}
      >
        <GripVertical size={15} aria-hidden="true" />
      </button>
      <button type="button" className={styles.galleryName} onClick={onSelect} title={gallery.published ? gallery.title : `${gallery.title} (draft)`}>
        <span className={`${styles.dot} ${gallery.published ? '' : styles.dotDraft}`} aria-hidden="true" />
        <span>{gallery.title}</span>
      </button>
    </li>
  );
}
