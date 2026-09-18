import { useSyncExternalStore } from 'react';

const FAVORITES_KEY = 'akiwumi-favorites-v1';
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let favorites: string[] | null = null;

function readFavorites(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return EMPTY;
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string'))].slice(0, 200);
  } catch {
    return EMPTY;
  }
}

function currentFavorites() {
  if (favorites === null) favorites = readFavorites();
  return favorites;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener('storage', onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

function onStorage(event: StorageEvent) {
  if (event.key !== FAVORITES_KEY) return;
  favorites = readFavorites();
  emit();
}

function writeFavorites(next: string[]) {
  favorites = [...new Set(next)].slice(0, 200);
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Private mode or a full quota: favorites still work for this visit.
  }
  emit();
}

export function useFavorites() {
  return useSyncExternalStore(subscribe, currentFavorites, () => EMPTY);
}

export function isFavorite(imageId: string) {
  return currentFavorites().includes(imageId);
}

export function toggleFavorite(imageId: string) {
  const current = currentFavorites();
  writeFavorites(current.includes(imageId) ? current.filter((id) => id !== imageId) : [...current, imageId]);
}

export function removeFavorite(imageId: string) {
  writeFavorites(currentFavorites().filter((id) => id !== imageId));
}

