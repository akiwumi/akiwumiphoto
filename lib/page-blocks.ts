/**
 * Content blocks for pages made in the admin, stored as JSON in
 * site_pages.blocks. Every image carries its size so the page reserves the
 * space before it loads.
 */

export interface BlockImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export type PageBlock =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'image'; image: BlockImage | null; caption: string; size: 'text' | 'wide' | 'full' }
  | { id: string; type: 'image_text'; image: BlockImage | null; text: string; side: 'left' | 'right' }
  | { id: string; type: 'gallery'; images: BlockImage[]; columns: 2 | 3 }
  | { id: string; type: 'quote'; text: string; attribution: string }
  | { id: string; type: 'divider' };

export type BlockType = PageBlock['type'];

export const BLOCK_TYPES: { type: BlockType; label: string; hint: string }[] = [
  { type: 'text', label: 'Text', hint: 'Paragraphs, headings, lists and links' },
  { type: 'image', label: 'Image', hint: 'One photograph with a caption' },
  { type: 'image_text', label: 'Image + text', hint: 'A photograph beside a column of text' },
  { type: 'gallery', label: 'Photo grid', hint: 'Several photographs in two or three columns' },
  { type: 'quote', label: 'Quote', hint: 'A large pull quote' },
  { type: 'divider', label: 'Divider', hint: 'A thin line between sections' },
];

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `b${Date.now()}${Math.random().toString(36).slice(2)}`);

export function createBlock(type: BlockType): PageBlock {
  const id = newId();
  switch (type) {
    case 'text': return { id, type, text: '' };
    case 'image': return { id, type, image: null, caption: '', size: 'wide' };
    case 'image_text': return { id, type, image: null, text: '', side: 'left' };
    case 'gallery': return { id, type, images: [], columns: 3 };
    case 'quote': return { id, type, text: '', attribution: '' };
    case 'divider': return { id, type };
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

function parseImage(v: unknown): BlockImage | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const width = Number(o.width);
  const height = Number(o.height);
  if (typeof o.url !== 'string' || !/^https:\/\//.test(o.url) || !(width > 0) || !(height > 0)) return null;
  return { url: o.url, width, height, alt: str(o.alt) };
}

/** Keeps only well-formed blocks, so a bad row can never break a page. */
export function parseBlocks(value: unknown): PageBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): PageBlock[] => {
    if (!raw || typeof raw !== 'object') return [];
    const o = raw as Record<string, unknown>;
    const id = str(o.id) || newId();
    switch (o.type) {
      case 'text': return [{ id, type: 'text', text: str(o.text) }];
      case 'image': return [{ id, type: 'image', image: parseImage(o.image), caption: str(o.caption), size: o.size === 'text' || o.size === 'full' ? o.size : 'wide' }];
      case 'image_text': return [{ id, type: 'image_text', image: parseImage(o.image), text: str(o.text), side: o.side === 'right' ? 'right' : 'left' }];
      case 'gallery': return [{ id, type: 'gallery', images: Array.isArray(o.images) ? o.images.map(parseImage).filter((i): i is BlockImage => i !== null) : [], columns: o.columns === 2 ? 2 : 3 }];
      case 'quote': return [{ id, type: 'quote', text: str(o.text), attribution: str(o.attribution) }];
      case 'divider': return [{ id, type: 'divider' }];
      default: return [];
    }
  });
}

/** True when a block would render nothing, so the page skips it. */
export function isEmptyBlock(block: PageBlock): boolean {
  switch (block.type) {
    case 'text': case 'quote': return !block.text.trim();
    case 'image': return !block.image;
    case 'image_text': return !block.image && !block.text.trim();
    case 'gallery': return block.images.length === 0;
    case 'divider': return false;
  }
}

/** Plain text of the first text found, for descriptions. */
export function firstText(blocks: PageBlock[]): string {
  for (const b of blocks) {
    const text = b.type === 'text' || b.type === 'image_text' || b.type === 'quote' ? b.text : '';
    const plain = text.replace(/^#+\s|[*>\-[\]]|\(([^)]*)\)/gm, '').replace(/\s+/g, ' ').trim();
    if (plain) return plain.slice(0, 160);
  }
  return '';
}
