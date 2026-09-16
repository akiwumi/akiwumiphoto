import Image from 'next/image';
import PageBody from './PageBody';
import { isEmptyBlock, type BlockImage, type PageBlock } from '@/lib/page-blocks';

/** Content column is about 720px; wide 1100px; full the whole page width. */
const SIZES = {
  text: '(max-width: 800px) 100vw, 720px',
  wide: '(max-width: 1200px) 100vw, 1100px',
  full: '100vw',
  half: '(max-width: 800px) 100vw, 50vw',
  grid2: '(max-width: 700px) 100vw, 50vw',
  grid3: '(max-width: 700px) 100vw, 33vw',
};

function Photo({ image, sizes, eager }: { image: BlockImage; sizes: string; eager: boolean }) {
  return (
    <Image
      src={image.url}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
     
    />
  );
}

/**
 * Renders a created page's blocks. Plain server markup: images are sized and
 * lazily loaded by next/image, and nothing here needs JavaScript in the browser.
 * `eagerFirstImage` loads the first image at once when it is likely on screen.
 */
export default function PageBlocks({ blocks, eagerFirstImage = false, className = 'page-blocks' }: {
  blocks: PageBlock[]; eagerFirstImage?: boolean; className?: string;
}) {
  const visible = blocks.filter((b) => !isEmptyBlock(b));
  const firstImageBlock = eagerFirstImage ? visible.findIndex((b) => b.type !== 'text' && b.type !== 'quote' && b.type !== 'divider') : -1;

  return (
    <div className={className}>
      {visible.map((block, index) => {
        const eager = index === firstImageBlock && index < 3;
        switch (block.type) {
          case 'text':
            return <PageBody key={block.id} text={block.text} className="pb-text" />;
          case 'image':
            return (
              <figure key={block.id} className={`pb-image pb-image-${block.size}`}>
                <Photo image={block.image!} sizes={SIZES[block.size]} eager={eager} />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          case 'image_text':
            return (
              <section key={block.id} className={`pb-split ${block.side === 'right' ? 'pb-split-right' : ''}`}>
                {block.image && <div className="pb-split-image"><Photo image={block.image} sizes={SIZES.half} eager={eager} /></div>}
                <PageBody text={block.text} className="pb-split-text" />
              </section>
            );
          case 'gallery':
            return (
              <div key={block.id} className={`pb-gallery pb-gallery-${block.columns}`}>
                {block.images.map((image, i) => (
                  <Photo key={`${image.url}-${i}`} image={image} sizes={block.columns === 2 ? SIZES.grid2 : SIZES.grid3} eager={eager && i < block.columns} />
                ))}
              </div>
            );
          case 'quote':
            return (
              <blockquote key={block.id} className="pb-quote">
                <p>{block.text}</p>
                {block.attribution && <footer>— {block.attribution}</footer>}
              </blockquote>
            );
          case 'divider':
            return <hr key={block.id} className="pb-divider" />;
        }
      })}
    </div>
  );
}
