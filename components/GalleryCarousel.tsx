import Link from 'next/link';
import Image from 'next/image';
import type { Gallery } from '@/types';
import styles from './ProjectGrid.module.css';

export default function GalleryCarousel({ galleries }: { galleries: Gallery[] }) {
  if (!galleries.length) return <p className={styles.empty}>The gallery is coming soon. <Link href="/contact">Get in touch</Link></p>;
  return (
    <div className={styles.grid}>
      {galleries.map((gallery, index) => (
        <Link href={`/gallery/${gallery.slug}`} key={gallery.id} className={styles.card}>
          <div className={styles.image}>
            {gallery.cover_image && <Image src={gallery.cover_image} alt={gallery.title} fill unoptimized loading={index < 3 ? 'eager' : 'lazy'} sizes="(max-width: 700px) 100vw, 33vw" />}
            <div className={styles.caption}><span>{gallery.title}</span><span aria-hidden="true">↗</span></div>
          </div>
        </Link>
      ))}
    </div>
  );
}
