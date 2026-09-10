import type { CSSProperties, ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Retained for existing callers; content now appears immediately. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Reveal({ children, className, style }: RevealProps) {
  return <div className={className} style={style}>{children}</div>;
}
