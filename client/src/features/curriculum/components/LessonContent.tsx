/**
 * Lesson Content Component
 * Displays rich lesson content (TipTap JSON) for the learner-facing view.
 * Full-featured renderer: headings, paragraphs, lists, tables, blockquotes,
 * code blocks, images, inline marks (bold, italic, underline, highlight, link).
 */

import React from 'react';
import type { Json } from '@/shared/database.types';

type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

interface LessonContentProps {
  content: Json;
  contentAr?: Json | null; // kept for backward compat, not used
  tocItems?: TocItem[];
}

type TipTapNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, any> }[];
};

/** Extract plain text from a TipTap inline content array */
function extractText(nodes: TipTapNode[] | undefined): string {
  if (!nodes) return '';
  return nodes.map((n) => n.text || extractText(n.content)).join('');
}

export function LessonContent({ content, tocItems = [] }: LessonContentProps) {
  const displayContent = content;

  // Build a map from heading text to its TOC id for anchor linking
  const tocIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    tocItems.forEach((item) => map.set(item.text, item.id));
    return map;
  }, [tocItems]);

  // ── Inline marks renderer ─────────────────────────────────────────────
  const renderInline = (nodes: TipTapNode[] | undefined, keyPrefix = ''): React.ReactNode => {
    if (!nodes) return null;
    return nodes.map((node, i) => {
      const key = `${keyPrefix}-${i}`;
      if (node.type === 'hardBreak') return <br key={key} />;
      if (node.type !== 'text') return renderNode(node, i);

      let el: React.ReactNode = node.text;
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              el = <strong key={key}>{el}</strong>; break;
            case 'italic':
              el = <em key={key}>{el}</em>; break;
            case 'underline':
              el = <u key={key}>{el}</u>; break;
            case 'strike':
              el = <s key={key}>{el}</s>; break;
            case 'code':
              el = <code key={key} className="bg-gray-100 text-rose-600 px-1.5 py-0.5 rounded text-[0.88em] font-mono">{el}</code>; break;
            case 'highlight':
              el = <mark key={key} className="bg-yellow-200 rounded px-0.5">{el}</mark>; break;
            case 'link':
              el = <a key={key} href={mark.attrs?.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{el}</a>; break;
            default: break;
          }
        }
      }
      return <span key={key}>{el}</span>;
    });
  };

  // ── Node renderer ─────────────────────────────────────────────────────
  const renderNode = (node: TipTapNode, index: number): React.ReactNode => {
    if (!node?.type) return null;
    const key = index;

    switch (node.type) {

      // ── Headings ──────────────────────────────────────────────────────
      case 'heading': {
        const level = node.attrs?.level || 2;
        const align = node.attrs?.textAlign;
        const style = align ? { textAlign: align as React.CSSProperties['textAlign'] } : undefined;
        const cls: Record<number, string> = {
          1: 'text-3xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200',
          2: 'text-2xl font-bold text-gray-900 mt-8 mb-3',
          3: 'text-xl font-semibold text-gray-800 mt-6 mb-2',
        };
        const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
        // Attach data-toc-id for TOC scroll targeting
        const headingText = extractText(node.content);
        const tocId = tocIdMap.get(headingText.trim());
        return (
          <Tag
            key={key}
            className={cls[level] || 'text-lg font-semibold mt-4 mb-2'}
            style={style}
            {...(tocId ? { 'data-toc-id': tocId } : {})}
          >
            {renderInline(node.content, `h${key}`)}
          </Tag>
        );
      }

      // ── Paragraph ─────────────────────────────────────────────────────
      case 'paragraph': {
        const align = node.attrs?.textAlign;
        const style = align ? { textAlign: align as React.CSSProperties['textAlign'] } : undefined;
        if (!node.content || node.content.length === 0) {
          return <div key={key} className="h-5" />;
        }
        return (
          <p key={key} className="text-gray-700 leading-[1.9] mb-5 text-[1.05rem]" style={style}>
            {renderInline(node.content, `p${key}`)}
          </p>
        );
      }

      // ── Bullet list ───────────────────────────────────────────────────
      case 'bulletList':
        return (
          <ul key={key} className="list-disc pl-7 mb-5 space-y-2 text-gray-700 text-[1.05rem]">
            {node.content?.map((item, i) => renderNode(item, i))}
          </ul>
        );

      // ── Ordered list ──────────────────────────────────────────────────
      case 'orderedList':
        return (
          <ol key={key} className="list-decimal pl-7 mb-5 space-y-2 text-gray-700 text-[1.05rem]">
            {node.content?.map((item, i) => renderNode(item, i))}
          </ol>
        );

      // ── List item ─────────────────────────────────────────────────────
      case 'listItem': {
        // Flatten paragraph wrapper so bullet and text are on the same line
        const itemContent: React.ReactNode[] = [];
        node.content?.forEach((child, i) => {
          if (child.type === 'paragraph') {
            child.content?.forEach((inline, j) => {
              itemContent.push(renderNode(inline, j));
            });
          } else {
            itemContent.push(renderNode(child, i));
          }
        });
        return <li key={key} className="leading-[1.85]">{itemContent}</li>;
      }

      // ── Blockquote ────────────────────────────────────────────────────
      case 'blockquote':
        return (
          <blockquote key={key} className="border-l-4 border-blue-400 bg-blue-50 pl-5 pr-4 py-3 rounded-r-lg italic text-gray-700 mb-5">
            {node.content?.map((child, i) => renderNode(child, i))}
          </blockquote>
        );

      // ── Code block ────────────────────────────────────────────────────
      case 'codeBlock':
        return (
          <pre key={key} className="bg-gray-900 text-gray-100 p-5 rounded-xl mb-6 overflow-x-auto text-sm leading-relaxed font-mono shadow-inner">
            <code>{node.content?.[0]?.text || ''}</code>
          </pre>
        );

      // ── Horizontal rule ───────────────────────────────────────────────
      case 'horizontalRule':
        return <hr key={key} className="my-8 border-gray-200" />;

      // ── Image ─────────────────────────────────────────────────────────
      case 'image':
        return (
          <figure key={key} className="mb-6">
            <img
              src={node.attrs?.src}
              alt={node.attrs?.alt || ''}
              title={node.attrs?.title}
              className="max-w-full h-auto rounded-lg shadow-sm mx-auto"
            />
            {node.attrs?.title && (
              <figcaption className="mt-2 text-sm text-gray-500 italic text-center">{node.attrs.title}</figcaption>
            )}
          </figure>
        );

      // ── Table ─────────────────────────────────────────────────────────
      case 'table':
        return (
          <div key={key} className="overflow-x-auto mb-8 rounded-xl shadow-sm border border-gray-200">
            <table className="w-full text-sm text-left border-collapse">
              <tbody>{node.content?.map((row, i) => renderNode(row, i))}</tbody>
            </table>
          </div>
        );

      case 'tableRow':
        return (
          <tr key={key} className="even:bg-gray-50 hover:bg-blue-50 transition-colors">
            {node.content?.map((cell, i) => renderNode(cell, i))}
          </tr>
        );

      case 'tableHeader':
        return (
          <th key={key} className="bg-[#1a2e4a] text-white font-semibold px-4 py-3 border border-gray-300 text-left">
            {node.content?.map((child, i) => renderNode(child, i))}
          </th>
        );

      case 'tableCell':
        return (
          <td key={key} className="px-4 py-3 border border-gray-200 text-gray-700 align-top">
            {node.content?.map((child, i) => renderNode(child, i))}
          </td>
        );

      // ── Text (inline) ─────────────────────────────────────────────────
      case 'text':
        return renderInline([node], `t${key}`);

      case 'hardBreak':
        return <br key={key} />;

      // ── Fallback ──────────────────────────────────────────────────────
      default:
        if (node.content) {
          return <div key={key}>{node.content.map((child, i) => renderNode(child, i))}</div>;
        }
        return null;
    }
  };

  // ── Root renderer ─────────────────────────────────────────────────────
  const renderContent = (jsonContent: Json): React.ReactNode => {
    if (!jsonContent || typeof jsonContent !== 'object' || !('type' in jsonContent)) {
      return <div className="text-muted-foreground italic">No content available</div>;
    }

    const doc = jsonContent as Record<string, any>;
    if (doc.type === 'doc' && Array.isArray(doc.content)) {
      return doc.content.map((node: TipTapNode, i: number) => renderNode(node, i));
    }

    return (
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        {JSON.stringify(jsonContent, null, 2)}
      </pre>
    );
  };

  return (
    <div className="lesson-content" dir="ltr">
      {renderContent(displayContent)}
    </div>
  );
}
