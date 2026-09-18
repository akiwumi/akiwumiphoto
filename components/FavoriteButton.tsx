'use client';

import { useFavorites, toggleFavorite } from '@/lib/favorites-store';

export default function FavoriteButton({ imageId, className = '' }: { imageId: string; className?: string }) {
  const favorites = useFavorites();
  const active = favorites.includes(imageId);
  return (
    <button
      type="button"
      className={`favorite-button ${className}`}
      aria-pressed={active}
      aria-label={active ? 'Remove from favourites' : 'Save to favourites'}
      onClick={(event) => {
        event.stopPropagation();
        toggleFavorite(imageId);
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M20.8 8.7c0 5.2-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
      </svg>
      <span>{active ? 'Saved' : 'Favourite'}</span>
    </button>
  );
}

