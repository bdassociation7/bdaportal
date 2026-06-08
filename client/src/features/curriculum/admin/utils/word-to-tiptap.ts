/**
 * Word to TipTap Converter
 * Converts .docx files to TipTap JSON format using mammoth.js
 * Runs entirely in the browser — no server required.
 */
import mammoth from 'mammoth';
import type { RichContent, ContentNode } from '@/entities/curriculum';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface WordImportResult {
  success: boolean;
  content?: RichContent;
  rawHtml?: string;
  warnings?: string[];
  error?: string;
}

// ─────────────────────────────────────────────
// Main converter
// ─────────────────────────────────────────────

/**
 * Convert a .docx File object to TipTap JSON
 */
export async function convertWordToTipTap(file: File): Promise<WordImportResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h3:fresh",
          "p[style-name='List Paragraph'] => li:fresh",
        ],
      }
    );

    const rawHtml = result.value;
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);

    const tiptapContent = htmlToTipTap(rawHtml);

    return {
      success: true,
      content: tiptapContent,
      rawHtml,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to parse Word document',
    };
  }
}

// ─────────────────────────────────────────────
// HTML → TipTap JSON parser
// ─────────────────────────────────────────────

function htmlToTipTap(html: string): RichContent {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes: ContentNode[] = [];

  for (const child of Array.from(doc.body.childNodes)) {
    const node = parseNode(child as HTMLElement);
    if (node) nodes.push(node);
  }

  // Ensure there is at least one paragraph so TipTap doesn't error
  if (nodes.length === 0) {
    nodes.push({ type: 'paragraph', content: [] });
  }

  return { type: 'doc', content: nodes };
}

function parseNode(el: HTMLElement): ContentNode | null {
  if (!el || el.nodeType === Node.TEXT_NODE) return null;

  const tag = el.tagName?.toLowerCase();

  switch (tag) {
    case 'h1':
      return heading(el, 1);
    case 'h2':
      return heading(el, 2);
    case 'h3':
    case 'h4':
      return heading(el, 3);
    case 'p':
      return paragraph(el);
    case 'ul':
      return list(el, 'bulletList');
    case 'ol':
      return list(el, 'orderedList');
    case 'blockquote':
      return blockquote(el);
    case 'table':
      return parseTable(el);
    case 'hr':
      return { type: 'horizontalRule' };
    default:
      // Wrap unknown block-level elements as paragraphs
      if (el.textContent?.trim()) {
        return paragraph(el);
      }
      return null;
  }
}

// ─────────────────────────────────────────────
// Node builders
// ─────────────────────────────────────────────

function heading(el: HTMLElement, level: 1 | 2 | 3): ContentNode {
  return {
    type: 'heading',
    attrs: { level },
    content: parseInline(el),
  };
}

function paragraph(el: HTMLElement): ContentNode {
  const inline = parseInline(el);
  return {
    type: 'paragraph',
    content: inline.length > 0 ? inline : undefined,
  };
}

function list(el: HTMLElement, listType: 'bulletList' | 'orderedList'): ContentNode {
  const items: ContentNode[] = [];
  for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
    items.push({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: parseInline(li as HTMLElement),
        },
      ],
    });
  }
  return { type: listType, content: items };
}

function blockquote(el: HTMLElement): ContentNode {
  return {
    type: 'blockquote',
    content: [paragraph(el)],
  };
}

function parseTable(el: HTMLElement): ContentNode {
  const rows: ContentNode[] = [];
  const trEls = el.querySelectorAll('tr');

  trEls.forEach((tr, rowIndex) => {
    const cells: ContentNode[] = [];
    const cellEls = tr.querySelectorAll('td, th');

    cellEls.forEach((cell) => {
      cells.push({
        type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
        attrs: { colspan: 1, rowspan: 1, colwidth: null },
        content: [
          {
            type: 'paragraph',
            content: parseInline(cell as HTMLElement),
          },
        ],
      });
    });

    rows.push({ type: 'tableRow', content: cells });
  });

  return { type: 'table', content: rows };
}

// ─────────────────────────────────────────────
// Inline content parser (bold, italic, links, text)
// ─────────────────────────────────────────────

function parseInline(el: Element): ContentNode[] {
  const nodes: ContentNode[] = [];

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text) {
        nodes.push({ type: 'text', text });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toLowerCase();

      if (tag === 'strong' || tag === 'b') {
        const inner = parseInline(childEl);
        inner.forEach((n) => {
          if (n.type === 'text') {
            n.marks = [...(n.marks || []), { type: 'bold' }];
          }
        });
        nodes.push(...inner);
      } else if (tag === 'em' || tag === 'i') {
        const inner = parseInline(childEl);
        inner.forEach((n) => {
          if (n.type === 'text') {
            n.marks = [...(n.marks || []), { type: 'italic' }];
          }
        });
        nodes.push(...inner);
      } else if (tag === 'a') {
        const href = childEl.getAttribute('href') || '';
        const inner = parseInline(childEl);
        inner.forEach((n) => {
          if (n.type === 'text') {
            n.marks = [...(n.marks || []), { type: 'link', attrs: { href, target: '_blank' } }];
          }
        });
        nodes.push(...inner);
      } else if (tag === 'code') {
        const text = childEl.textContent || '';
        if (text) {
          nodes.push({ type: 'text', text, marks: [{ type: 'code' }] });
        }
      } else if (tag === 'br') {
        nodes.push({ type: 'hardBreak' });
      } else {
        // Recurse into any other inline element
        nodes.push(...parseInline(childEl));
      }
    }
  }

  return nodes;
}

// ─────────────────────────────────────────────
// Filename parser — extracts module/lesson info
// from naming convention: M09_L1_EN.docx
// ─────────────────────────────────────────────

export interface ParsedFilename {
  moduleIndex: number | null;
  lessonIndex: number | null;
  language: 'en' | 'ar' | null;
  valid: boolean;
}

export function parseWordFilename(filename: string): ParsedFilename {
  // Normalise: remove extension, uppercase
  const base = filename.replace(/\.(docx?|DOCX?)$/i, '').toUpperCase();

  // Pattern: M<nn>_L<n>_<EN|AR>   e.g. M09_L1_EN  or  M9_L3_AR
  const match = base.match(/M(\d{1,2})_L([123])_(EN|AR)/);

  if (!match) {
    return { moduleIndex: null, lessonIndex: null, language: null, valid: false };
  }

  return {
    moduleIndex: parseInt(match[1], 10),
    lessonIndex: parseInt(match[2], 10) as 1 | 2 | 3,
    language: match[3].toLowerCase() as 'en' | 'ar',
    valid: true,
  };
}
