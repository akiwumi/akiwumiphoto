import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Renders the admin's lightly formatted text without injecting HTML:
 * blank lines separate blocks; "## " and "### " start headings, "- " lines
 * make a list, "> " a quote; inline **bold**, *italic* and [text](link).
 */
export default function PageBody({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.startsWith('### ')) return <h3 key={i}>{inline(block.slice(4))}</h3>;
        if (block.startsWith('## ')) return <h2 key={i}>{inline(block.slice(3))}</h2>;
        const lines = block.split('\n');
        if (lines.every((l) => /^[-*] /.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        if (lines.every((l) => l.startsWith('>'))) return <blockquote key={i}>{withBreaks(lines.map((l) => l.replace(/^>\s?/, '')))}</blockquote>;
        return <p key={i}>{withBreaks(lines)}</p>;
      })}
    </div>
  );
}

function withBreaks(lines: string[]): ReactNode[] {
  return lines.flatMap((line, i) => (i === 0 ? [inline(line, i)] : [<br key={`br${i}`} />, inline(line, i)]));
}

const SAFE_LINK = /^(\/(?!\/)|#|https?:\/\/|mailto:)/;

function inline(text: string, keyPrefix: number | string = 0): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${match.index}`;
    if (match[1] !== undefined) parts.push(<strong key={key}>{match[1]}</strong>);
    else if (match[2] !== undefined) parts.push(<em key={key}>{match[2]}</em>);
    else if (SAFE_LINK.test(match[4])) {
      const href = match[4];
      parts.push(href.startsWith('/') || href.startsWith('#')
        ? <Link key={key} href={href}>{match[3]}</Link>
        : <a key={key} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">{match[3]}</a>);
    } else parts.push(match[3]);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span key={String(keyPrefix)}>{parts}</span>;
}
