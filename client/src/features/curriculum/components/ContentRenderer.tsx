/**
 * ContentRenderer — Renders TipTap JSON content as polished HTML
 *
 * Supports: headings (h1–h3), paragraphs, bold, italic, underline, highlight,
 *           code (inline + block), links, images, bullet/ordered lists,
 *           blockquote, horizontal rule, tables (with header), hard breaks.
 *
 * Styled to match world-class LMS standards (Coursera / Udemy level).
 */

import React from 'react';
import type { RichContent } from '@/entities/curriculum';

interface ContentNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ContentNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

interface ContentRendererProps {
  content: RichContent | any;
}

// ─── Inline text node renderer ──────────────────────────────────────────────
function renderText(node: ContentNode, key: number): React.ReactNode {
  let el: React.ReactNode = node.text ?? '';

  if (!node.marks || node.marks.length === 0) return el;

  for (const mark of node.marks) {
    switch (mark.type) {
      case 'bold':
        el = <strong key={key} className="font-semibold text-gray-900">{el}</strong>;
        break;
      case 'italic':
        el = <em key={key}>{el}</em>;
        break;
      case 'underline':
        el = <u key={key}>{el}</u>;
        break;
      case 'highlight':
        el = <mark key={key} className="bg-yellow-200 text-gray-900 rounded px-0.5">{el}</mark>;
        break;
      case 'code':
        el = (
          <code key={key} className="bg-gray-100 text-rose-600 px-1.5 py-0.5 rounded text-[0.875em] font-mono border border-gray-200">
            {el}
          </code>
        );
        break;
      case 'link':
        el = (
          <a
            key={key}
            href={mark.attrs?.href}
            target={mark.attrs?.target || '_blank'}
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
          >
            {el}
          </a>
        );
        break;
      case 'textStyle':
        if (mark.attrs?.color) {
          el = <span key={key} style={{ color: mark.attrs.color }}>{el}</span>;
        }
        break;
    }
  }
  return el;
}

// ─── Block / inline node renderer ───────────────────────────────────────────
function renderNode(node: ContentNode, index: number): React.ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, i));

  switch (node.type) {
    // ── Text ──────────────────────────────────────────────────────────────
    case 'text':
      return renderText(node, index);

    case 'hardBreak':
      return <br key={index} />;

    // ── Headings ──────────────────────────────────────────────────────────
    case 'heading': {
      const level = node.attrs?.level ?? 2;
      const align = node.attrs?.textAlign;
      const style = align ? { textAlign: align as React.CSSProperties['textAlign'] } : undefined;
      const base = 'font-bold text-gray-900 leading-tight';
      const sizes: Record<number, string> = {
        1: 'text-3xl mt-10 mb-4 pb-3 border-b border-gray-200',
        2: 'text-2xl mt-8 mb-3',
        3: 'text-xl mt-6 mb-2',
      };
      const cls = `${base} ${sizes[level] ?? sizes[2]}`;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag key={index} className={cls} style={style}>{children}</Tag>;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────
    case 'paragraph': {
      const align = node.attrs?.textAlign;
      const style = align ? { textAlign: align as React.CSSProperties['textAlign'] } : undefined;
      if (!node.content || node.content.length === 0) {
        return <div key={index} className="h-4" />;
      }
      return (
        <p key={index} className="text-gray-700 leading-[1.85] mb-5 text-[1.05rem]" style={style}>
          {children}
        </p>
      );
    }

    // ── Lists ─────────────────────────────────────────────────────────────
    case 'bulletList':
      return (
        <ul key={index} className="list-disc pl-6 mb-5 space-y-2 text-gray-700 text-[1.05rem]">
          {children}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={index} className="list-decimal pl-6 mb-5 space-y-2 text-gray-700 text-[1.05rem]">
          {children}
        </ol>
      );

    case 'listItem':
      return (
        <li key={index} className="leading-[1.85] pl-1">
          {node.content?.map((child, i) => {
            if (child.type === 'paragraph') {
              return child.content?.map((inline, j) => renderNode(inline, j));
            }
            return renderNode(child, i);
          })}
        </li>
      );

    // ── Blockquote ────────────────────────────────────────────────────────
    case 'blockquote':
      return (
        <blockquote
          key={index}
          className="border-l-4 border-blue-500 bg-blue-50 pl-5 pr-4 py-3 my-6 rounded-r-lg italic text-gray-700 text-[1.02rem] leading-relaxed"
        >
          {children}
        </blockquote>
      );

    // ── Code block ────────────────────────────────────────────────────────
    case 'codeBlock':
      return (
        <pre
          key={index}
          className="bg-gray-900 text-gray-100 p-5 rounded-xl mb-6 overflow-x-auto text-sm leading-relaxed font-mono shadow-inner"
        >
          <code>{children}</code>
        </pre>
      );

    // ── Horizontal rule ───────────────────────────────────────────────────
    case 'horizontalRule':
      return <hr key={index} className="my-8 border-gray-200" />;

    // ── Image ─────────────────────────────────────────────────────────────
    case 'image':
      return (
        <figure key={index} className="my-6 text-center">
          <img
            src={node.attrs?.src}
            alt={node.attrs?.alt || ''}
            title={node.attrs?.title || ''}
            className="max-w-full mx-auto rounded-xl shadow-md"
          />
          {node.attrs?.title && (
            <figcaption className="mt-2 text-sm text-gray-500 italic">
              {node.attrs.title}
            </figcaption>
          )}
        </figure>
      );

    // ── Table ─────────────────────────────────────────────────────────────
    case 'table':
      return (
        <div key={index} className="my-6 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <tbody>
              {node.content?.map((row, i) => renderNode(row, i))}
            </tbody>
          </table>
        </div>
      );

    case 'tableRow': {
      const isHeaderRow = node.content?.some(c => c.type === 'tableHeader');
      if (isHeaderRow) {
        return (
          <tr key={index} className="bg-[#1e3a5f] text-white">
            {node.content?.map((cell, i) => renderNode(cell, i))}
          </tr>
        );
      }
      return (
        <tr key={index} className="border-t border-gray-200 even:bg-gray-50 hover:bg-blue-50 transition-colors">
          {node.content?.map((cell, i) => renderNode(cell, i))}
        </tr>
      );
    }

    case 'tableHeader':
      return (
        <th
          key={index}
          colSpan={node.attrs?.colspan ?? 1}
          rowSpan={node.attrs?.rowspan ?? 1}
          className="px-4 py-3 font-semibold text-white text-sm border-r border-blue-800 last:border-r-0"
        >
          {node.content?.map((child, i) => {
            if (child.type === 'paragraph') {
              return child.content?.map((inline, j) => renderNode(inline, j));
            }
            return renderNode(child, i);
          })}
        </th>
      );

    case 'tableCell':
      return (
        <td
          key={index}
          colSpan={node.attrs?.colspan ?? 1}
          rowSpan={node.attrs?.rowspan ?? 1}
          className="px-4 py-3 text-gray-700 border-r border-gray-200 last:border-r-0 align-top leading-relaxed"
        >
          {node.content?.map((child, i) => {
            if (child.type === 'paragraph') {
              return child.content?.map((inline, j) => renderNode(inline, j));
            }
            return renderNode(child, i);
          })}
        </td>
      );

    // ── doc root ──────────────────────────────────────────────────────────
    case 'doc':
      return <React.Fragment key={index}>{children}</React.Fragment>;

    default:
      if (node.content && node.content.length > 0) {
        return <React.Fragment key={index}>{children}</React.Fragment>;
      }
      return null;
  }
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ContentRenderer({ content }: ContentRendererProps) {
  if (!content || !content.content || content.content.length === 0) {
    return (
      <div className="text-gray-400 italic text-center py-12">
        No content available for this lesson yet.
      </div>
    );
  }

  return (
    <div className="lesson-content-body">
      {content.content.map((node: ContentNode, index: number) => renderNode(node, index))}
    </div>
  );
}
