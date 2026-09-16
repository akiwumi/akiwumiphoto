import type { Modifier } from '@dnd-kit/core';

/** Sidebar lists only move up and down (saves adding @dnd-kit/modifiers). */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
