'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { addToBasket } from '@/lib/basket-store';
import { removeFavorite, useFavorites } from '@/lib/favorites-store';
import { defaultSize, isPurchasable } from '@/lib/print-availability';
import type { CatalogImage, PrintSize, SoldBySize } from '@/types';

interface Catalog {
  sizes: PrintSize[];
  images: CatalogImage[];
  sold: Record<string, SoldBySize>;
}

export default function FavoritesPanel({ compact = false }: { compact?: boolean }) {
  const favorites = useFavorites();
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    if (favorites.length === 0) return;
    let cancelled = false;
    fetch(`/api/prints/catalog?ids=${favorites.join(',')}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('load failed')))
      .then((data: Catalog) => { if (!cancelled) setCatalog(data); })
      .catch(() => { if (!cancelled) setCatalog(null); })
    return () => { cancelled = true; };
  }, [favorites]);

  if (favorites.length === 0) {
    return <section className={compact ? 'basket-favorites' : 'register-panel favorites-panel'}><h2 className="register-section-title">Favourites</h2><p>Save photographs while browsing to keep them here.</p></section>;
  }

  return (
    <section className={compact ? 'basket-favorites' : 'register-panel favorites-panel'} aria-labelledby={compact ? 'basket-favourites-title' : 'account-favourites-title'}>
      <h2 id={compact ? 'basket-favourites-title' : 'account-favourites-title'} className="register-section-title">Favourites</h2>
      <div className="favorites-list">
        {favorites.map((id) => {
          const image = catalog?.images.find((item) => item.id === id);
          if (!image) return <div key={id} className="favorite-card"><p>Photograph unavailable.</p><button type="button" onClick={() => removeFavorite(id)}>Remove</button></div>;
          const size = defaultSize(catalog?.sizes ?? [], catalog?.sold[id]);
          const purchasable = Boolean(size && image.forSale && isPurchasable(size, catalog?.sold[id]));
          const label = image.title || `${image.galleryTitle}, photo ${image.position}`;
          return (
            <article key={id} className="favorite-card">
              <Link href={`/gallery/${image.gallerySlug}`} className="favorite-thumb">
                {image.thumbnail && <Image src={image.thumbnail} alt={label} fill unoptimized sizes="120px" />}
              </Link>
              <div className="favorite-card-body">
                <Link href={`/gallery/${image.gallerySlug}`} className="favorite-card-title">{label}</Link>
                {purchasable ? <button type="button" className="favorite-action" onClick={() => { addToBasket(id, size!.id); removeFavorite(id); }}>Add to basket</button> : <p className="favorite-unavailable">Unavailable to purchase</p>}
                <button type="button" className="favorite-remove" onClick={() => removeFavorite(id)}>Remove</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
