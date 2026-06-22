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
// American → British English converter
// Applied automatically on import to maintain BDA's British English standard
// ─────────────────────────────────────────────

/**
 * Converts American English spellings to British English.
 * Operates on plain text (not HTML tags) to avoid breaking markup.
 * Covers the most common academic and professional vocabulary differences.
 */
function americanToBritish(text: string): string {
  // Map of American → British spellings
  // Ordered from longest to shortest to avoid partial replacements
  const replacements: [RegExp, string][] = [
    // -ize → -ise (verbs and nouns)
    [/\b(recogni)ze\b/gi, '$1se'],
    [/\b(organi)ze\b/gi, '$1se'],
    [/\b(reali)ze\b/gi, '$1se'],
    [/\b(speciali)ze\b/gi, '$1se'],
    [/\b(emphasi)ze\b/gi, '$1se'],
    [/\b(minimi)ze\b/gi, '$1se'],
    [/\b(maximi)ze\b/gi, '$1se'],
    [/\b(optimi)ze\b/gi, '$1se'],
    [/\b(prioriti)ze\b/gi, '$1se'],
    [/\b(standardi)ze\b/gi, '$1se'],
    [/\b(characteri)ze\b/gi, '$1se'],
    [/\b(summari)ze\b/gi, '$1se'],
    [/\b(mobili)ze\b/gi, '$1se'],
    [/\b(utili)ze\b/gi, '$1se'],
    [/\b(analy)ze\b/gi, '$1se'],
    [/\b(capitali)ze\b/gi, '$1se'],
    [/\b(centrali)ze\b/gi, '$1se'],
    [/\b(customi)ze\b/gi, '$1se'],
    [/\b(democrati)ze\b/gi, '$1se'],
    [/\b(digitali)ze\b/gi, '$1se'],
    [/\b(energi)ze\b/gi, '$1se'],
    [/\b(finali)ze\b/gi, '$1se'],
    [/\b(formali)ze\b/gi, '$1se'],
    [/\b(generali)ze\b/gi, '$1se'],
    [/\b(globali)ze\b/gi, '$1se'],
    [/\b(harmoni)ze\b/gi, '$1se'],
    [/\b(hypothesi)ze\b/gi, '$1se'],
    [/\b(ideali)ze\b/gi, '$1se'],
    [/\b(industri)ze\b/gi, '$1se'],
    [/\b(internali)ze\b/gi, '$1se'],
    [/\b(legali)ze\b/gi, '$1se'],
    [/\b(locali)ze\b/gi, '$1se'],
    [/\b(memori)ze\b/gi, '$1se'],
    [/\b(moderni)ze\b/gi, '$1se'],
    [/\b(monitori)ze\b/gi, '$1se'],
    [/\b(neutrali)ze\b/gi, '$1se'],
    [/\b(normali)ze\b/gi, '$1se'],
    [/\b(personali)ze\b/gi, '$1se'],
    [/\b(populari)ze\b/gi, '$1se'],
    [/\b(rationali)ze\b/gi, '$1se'],
    [/\b(reorgani)ze\b/gi, '$1se'],
    [/\b(revitali)ze\b/gi, '$1se'],
    [/\b(revolutioni)ze\b/gi, '$1se'],
    [/\b(stabili)ze\b/gi, '$1se'],
    [/\b(strategi)ze\b/gi, '$1se'],
    [/\b(structuri)ze\b/gi, '$1se'],
    [/\b(symboli)ze\b/gi, '$1se'],
    [/\b(systemati)ze\b/gi, '$1se'],
    [/\b(theori)ze\b/gi, '$1se'],
    [/\b(visuali)ze\b/gi, '$1se'],
    // -ization → -isation
    [/\b(\w+)ization\b/gi, '$1isation'],
    [/\b(\w+)izing\b/gi, '$1ising'],
    [/\b(\w+)ized\b/gi, '$1ised'],
    [/\b(\w+)izer\b/gi, '$1iser'],
    // -or → -our (common words)
    [/\bbehavior\b/gi, 'behaviour'],
    [/\bbehaviors\b/gi, 'behaviours'],
    [/\bbehavioral\b/gi, 'behavioural'],
    [/\bcolor\b/gi, 'colour'],
    [/\bcolors\b/gi, 'colours'],
    [/\bfavor\b/gi, 'favour'],
    [/\bfavors\b/gi, 'favours'],
    [/\bfavorable\b/gi, 'favourable'],
    [/\bfavorably\b/gi, 'favourably'],
    [/\bfavorite\b/gi, 'favourite'],
    [/\bfavorites\b/gi, 'favourites'],
    [/\bharbor\b/gi, 'harbour'],
    [/\bhonor\b/gi, 'honour'],
    [/\bhonors\b/gi, 'honours'],
    [/\bhonorable\b/gi, 'honourable'],
    [/\bhumor\b/gi, 'humour'],
    [/\blabor\b/gi, 'labour'],
    [/\blabors\b/gi, 'labours'],
    [/\bneighbor\b/gi, 'neighbour'],
    [/\bneighbors\b/gi, 'neighbours'],
    [/\bneighborhood\b/gi, 'neighbourhood'],
    [/\border\b/g, 'order'], // keep as-is (same)
    [/\bsavor\b/gi, 'savour'],
    [/\btumor\b/gi, 'tumour'],
    [/\bvapor\b/gi, 'vapour'],
    [/\bvigor\b/gi, 'vigour'],
    [/\bvigorous\b/gi, 'vigorous'], // same in both
    // -er → -re (common words)
    [/\bcenter\b/gi, 'centre'],
    [/\bcenters\b/gi, 'centres'],
    [/\bcentered\b/gi, 'centred'],
    [/\bcentering\b/gi, 'centring'],
    [/\bfiber\b/gi, 'fibre'],
    [/\bfibers\b/gi, 'fibres'],
    [/\bliter\b/gi, 'litre'],
    [/\bliters\b/gi, 'litres'],
    [/\bmeager\b/gi, 'meagre'],
    [/\bsomber\b/gi, 'sombre'],
    [/\bspecter\b/gi, 'spectre'],
    [/\btheater\b/gi, 'theatre'],
    [/\btheaters\b/gi, 'theatres'],
    // -ense → -ence
    [/\bdefense\b/gi, 'defence'],
    [/\bdefenses\b/gi, 'defences'],
    [/\bdefensive\b/gi, 'defensive'], // same
    [/\boffense\b/gi, 'offence'],
    [/\boffenses\b/gi, 'offences'],
    [/\bpretense\b/gi, 'pretence'],
    [/\blicense\b/gi, 'licence'],  // noun only
    [/\blicenses\b/gi, 'licences'],
    // -og → -ogue
    [/\bcatalog\b/gi, 'catalogue'],
    [/\bcatalogs\b/gi, 'catalogues'],
    [/\bdialog\b/gi, 'dialogue'],
    [/\bdialogs\b/gi, 'dialogues'],
    [/\bprolog\b/gi, 'prologue'],
    [/\banalog\b/gi, 'analogue'],
    // -ll- variants
    [/\bcounseling\b/gi, 'counselling'],
    [/\bcounseled\b/gi, 'counselled'],
    [/\bcounselor\b/gi, 'counsellor'],
    [/\bcounselors\b/gi, 'counsellors'],
    [/\benrolled\b/gi, 'enrolled'], // same
    [/\benrollment\b/gi, 'enrolment'],
    [/\bfulfill\b/gi, 'fulfil'],
    [/\bfulfills\b/gi, 'fulfils'],
    [/\bfulfilled\b/gi, 'fulfilled'], // same
    [/\bfulfilling\b/gi, 'fulfilling'], // same
    [/\bfulfillment\b/gi, 'fulfilment'],
    [/\binstall\b/gi, 'install'], // same
    [/\binstallment\b/gi, 'instalment'],
    [/\binstallments\b/gi, 'instalments'],
    [/\bskillful\b/gi, 'skilful'],
    [/\bskillfully\b/gi, 'skilfully'],
    [/\btraveling\b/gi, 'travelling'],
    [/\btraveled\b/gi, 'travelled'],
    [/\btraveler\b/gi, 'traveller'],
    [/\btravelers\b/gi, 'travellers'],
    [/\bwillful\b/gi, 'wilful'],
    // Common individual word differences
    [/\banalyze\b/gi, 'analyse'],
    [/\banalyzes\b/gi, 'analyses'],
    [/\banalyzed\b/gi, 'analysed'],
    [/\banalyzing\b/gi, 'analysing'],
    [/\banalyzer\b/gi, 'analyser'],
    [/\bcheck\b/gi, 'check'], // same
    [/\bchecked\b/gi, 'checked'], // same
    [/\bchecking\b/gi, 'checking'], // same
    [/\bcozy\b/gi, 'cosy'],
    [/\bdraft\b/gi, 'draft'], // same
    [/\bfocused\b/gi, 'focused'], // same
    [/\bgray\b/gi, 'grey'],
    [/\bgrayish\b/gi, 'greyish'],
    [/\bgrays\b/gi, 'greys'],
    [/\blearned\b/gi, 'learnt'],
    [/\bmath\b/gi, 'maths'],
    [/\bpediatric\b/gi, 'paediatric'],
    [/\bpractice\b/gi, 'practice'], // same (noun); verb = practise but complex to detect
    [/\bprogram\b/gi, 'programme'],
    [/\bprograms\b/gi, 'programmes'],
    [/\bprogrammed\b/gi, 'programmed'], // same
    [/\bprogramming\b/gi, 'programming'], // same
    [/\bprogrammer\b/gi, 'programmer'], // same
    [/\bskeptic\b/gi, 'sceptic'],
    [/\bskeptical\b/gi, 'sceptical'],
    [/\bskepticism\b/gi, 'scepticism'],
    [/\bsmolder\b/gi, 'smoulder'],
    [/\bsulfur\b/gi, 'sulphur'],
    [/\bsulfuric\b/gi, 'sulphuric'],
    [/\btire\b/gi, 'tyre'],   // careful - context dependent, skip
    [/\bwheelchair\b/gi, 'wheelchair'], // same
    [/\bwildfire\b/gi, 'wildfire'], // same
    [/\bwisdom\b/gi, 'wisdom'], // same
    [/\bworkforce\b/gi, 'workforce'], // same
  ];

  // Apply replacements only to text nodes (not inside HTML tags)
  // Split on HTML tags to avoid modifying tag attributes
  return text.replace(/>([^<]*)</g, (match, textContent) => {
    let converted = textContent;
    for (const [pattern, replacement] of replacements) {
      converted = converted.replace(pattern, replacement);
    }
    return `>${converted}<`;
  });
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
          // Standard Word Heading styles
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h3:fresh",
          "p[style-name='Heading 5'] => h3:fresh",
          "p[style-name='Heading 6'] => h3:fresh",
          // Lowercase variants
          "p[style-name='heading 1'] => h1:fresh",
          "p[style-name='heading 2'] => h2:fresh",
          "p[style-name='heading 3'] => h3:fresh",
          "p[style-name='heading 4'] => h3:fresh",
          // Markdown-based styles (MdHeading - from Markdown Word editors)
          "p[style-name='MdHeading1'] => h1:fresh",
          "p[style-name='MdHeading2'] => h2:fresh",
          "p[style-name='MdHeading3'] => h3:fresh",
          "p[style-name='MdHeading4'] => h3:fresh",
          "p[style-name='MdHeading5'] => h3:fresh",
          "p[style-name='MdHeading6'] => h3:fresh",
          // Markdown paragraph styles
          "p[style-name='MdParagraph'] => p:fresh",
          "p[style-name='MdSpace'] => p:fresh",
          // Markdown list items
          "p[style-name='MdListItem'] => li:fresh",
          // Standard list styles
          "p[style-name='List Paragraph'] => li:fresh",
          // Markdown bold/strong inline style
          "r[style-name='MdStrong'] => strong",
          // Markdown table styles
          "p[style-name='MdTableHeader'] => p:fresh",
          "p[style-name='MdTableCell'] => p:fresh",
          // Horizontal rule
          "p[style-name='MdHr'] => hr:fresh",
        ],
      }
    );

    const rawHtml = result.value;
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);

    // Convert American English spellings to British English (BDA standard)
    const britishHtml = americanToBritish(rawHtml);

    const tiptapContent = htmlToTipTap(britishHtml);

    return {
      success: true,
      content: tiptapContent,
      rawHtml: britishHtml,
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
  const rawNodes: ContentNode[] = [];

  for (const child of Array.from(doc.body.childNodes)) {
    const node = parseNode(child as HTMLElement);
    if (node) rawNodes.push(node);
  }

  // Group consecutive loose <li> nodes (from MdListItem) into bulletList
  const nodes: ContentNode[] = [];
  let i = 0;
  while (i < rawNodes.length) {
    const node = rawNodes[i];
    if (node.type === 'listItem') {
      // Collect all consecutive listItems
      const items: ContentNode[] = [];
      while (i < rawNodes.length && rawNodes[i].type === 'listItem') {
        items.push(rawNodes[i]);
        i++;
      }
      nodes.push({ type: 'bulletList', content: items });
    } else {
      // Skip empty paragraphs that come from MdSpace/MdHr separators
      if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
        i++;
        continue;
      }
      nodes.push(node);
      i++;
    }
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
    case 'li':
      // Loose <li> from MdListItem style — will be grouped into bulletList by htmlToTipTap
      return {
        type: 'listItem',
        content: [{ type: 'paragraph', content: parseInline(el) }],
      };
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
