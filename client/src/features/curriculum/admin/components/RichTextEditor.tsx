import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import BaseImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Minus,
  Upload,
  X,
  Trash2,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import type { RichContent } from '@/entities/curriculum';

// ── Custom Image extension: adds 'style' attribute for float/alignment ──────
const Image = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('style') || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.style ? { style: attrs.style as string } : {},
      },
    };
  },
});

interface RichTextEditorProps {
  content: RichContent | null;
  onChange: (content: RichContent) => void;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
}

/**
 * Rich Text Editor Component — Full-featured TipTap editor
 * Supports: headings, bold, italic, underline, highlight, alignment,
 *           bullet/ordered lists, blockquote, code, links, images (URL + upload),
 *           image resize (drag handles) + image alignment toolbar,
 *           tables, horizontal rule, undo/redo, character count
 *
 * Toolbar is sticky so it stays visible while scrolling the content.
 * Custom floating toolbar appears next to selected text for quick formatting.
 * Image toolbar appears when clicking an image (size presets + alignment).
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing your lesson content here…',
  dir = 'ltr',
}: RichTextEditorProps) {
  const isRTL = dir === 'rtl';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // ── Floating bubble menu state ─────────────────────────────────────────
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [bubbleType, setBubbleType] = useState<'text' | 'image' | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        autolink: true,
        linkOnPaste: true,
      }),
      // ── Image with resize handles ────────────────────────────────────
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ['right', 'bottom', 'bottom-right'],
          minWidth: 60,
          minHeight: 40,
          alwaysPreserveAspectRatio: false,
        },
        HTMLAttributes: {
          class: 'tiptap-image rounded-lg shadow-sm',
        },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TextStyle,
      Highlight.configure({ multicolor: false }),
      CharacterCount,
      // ── Table support ────────────────────────────────────────────────
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow.configure({
        HTMLAttributes: { class: 'tiptap-table-row' },
      }),
      TableHeader.configure({
        HTMLAttributes: { class: 'tiptap-table-header' },
      }),
      TableCell.configure({
        HTMLAttributes: { class: 'tiptap-table-cell' },
      }),
    ],
    content: content || undefined,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as RichContent;
      onChange(json);
    },
    onSelectionUpdate: ({ editor }) => {
      // Update floating bubble menu position
      updateBubbleMenu(editor);
    },
    onBlur: () => {
      // Hide bubble menu on blur (small delay to allow button clicks)
      setTimeout(() => setBubblePos(null), 150);
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[450px] px-6 py-4 ${isRTL ? 'text-right' : ''}`,
        dir: dir,
      },
    },
  });

  // ── Update bubble menu position based on selection ─────────────────────
  const updateBubbleMenu = useCallback((ed: typeof editor) => {
    if (!ed || !editorWrapperRef.current) {
      setBubblePos(null);
      setBubbleType(null);
      return;
    }
    const { state, view } = ed;
    const { selection } = state;

    // Check if it's a NodeSelection (image)
    const isNodeSel = 'node' in selection;
    if (isNodeSel) {
      const node = state.doc.nodeAt(selection.from);
      if (node?.type.name === 'image') {
        try {
          const coords = view.coordsAtPos(selection.from);
          const wrapperRect = editorWrapperRef.current.getBoundingClientRect();
          setBubbleType('image');
          setBubblePos({
            top: coords.top - wrapperRect.top - 8,
            left: Math.max(4, coords.left - wrapperRect.left),
          });
        } catch {
          setBubblePos(null);
        }
        return;
      }
    }

    // Check if text is selected
    if (!selection.empty && !isNodeSel) {
      try {
        const { from, to } = selection;
        const startCoords = view.coordsAtPos(from);
        const endCoords = view.coordsAtPos(to);
        const wrapperRect = editorWrapperRef.current.getBoundingClientRect();
        const midX = (startCoords.left + endCoords.left) / 2;
        setBubbleType('text');
        setBubblePos({
          top: startCoords.top - wrapperRect.top - 8,
          left: Math.max(4, midX - wrapperRect.left - 160), // centre the menu
        });
      } catch {
        setBubblePos(null);
      }
      return;
    }

    setBubblePos(null);
    setBubbleType(null);
  }, []);

  // ── Link handling ──────────────────────────────────────────────────────
  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href || '';
    setLinkUrl(existing);
    setLinkDialogOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = url.startsWith('http') ? url : `https://${url}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  // ── Image URL handling ─────────────────────────────────────────────────
  const applyImageUrl = useCallback(() => {
    if (!editor) return;
    const url = imageUrl.trim();
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setImageDialogOpen(false);
    setImageUrl('');
  }, [editor, imageUrl]);

  // ── Image file upload (base64) ─────────────────────────────────────────
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) {
        editor.chain().focus().setImage({ src: base64 }).run();
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editor]);

  // ── Sync external content changes into editor (e.g. after Word import) ──
  useEffect(() => {
    if (!editor || !content) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const newJson = JSON.stringify(content);
    if (currentJson !== newJson) {
      editor.commands.setContent(content, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  // ── Toolbar button helper ──────────────────────────────────────────────
  const ToolBtn = ({
    onClick,
    active = false,
    disabled = false,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors text-gray-700 hover:bg-blue-100 hover:text-blue-700
        ${active ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : ''}
        ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-700' : ''}
      `}
    >
      {children}
    </button>
  );

  // ── Bubble menu button helper (compact, dark theme) ────────────────────
  const BubbleBtn = ({
    onClick,
    active = false,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors
        ${active
          ? 'bg-white text-gray-900'
          : 'text-gray-200 hover:bg-gray-600 hover:text-white'}
      `}
    >
      {children}
    </button>
  );

  const BubbleDivider = () => <div className="w-px h-4 bg-gray-500 mx-0.5 self-center" />;
  const Divider = () => <div className="w-px h-5 bg-gray-300 mx-0.5" />;

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  // ── Helper: detect NodeSelection (duck-typing, no external import needed) ──
  const isNodeSel = (sel: unknown): sel is { from: number; to: number } =>
    typeof sel === 'object' && sel !== null && 'node' in sel;

  // ── Image attribute setter — uses setNodeMarkup directly (works with NodeSelection) ──
  const setImageAttr = useCallback((attrs: Record<string, unknown>) => {
    if (!editor) return;
    const { state, view } = editor;
    const { selection } = state;
    // NodeSelection has a .node property; TextSelection does not
    if (!isNodeSel(selection)) return;
    const node = state.doc.nodeAt(selection.from);
    if (!node || node.type.name !== 'image') return;
    const tr = state.tr.setNodeMarkup(selection.from, undefined, {
      ...node.attrs,
      ...attrs,
    });
    view.dispatch(tr);
    view.focus();
  }, [editor]);

  const isImageSelected = isNodeSel(editor.state.selection) &&
    editor.state.doc.nodeAt(editor.state.selection.from)?.type.name === 'image';

  return (
    <>
      {/* ── Styles ────────────────────────────────────────────────────── */}
      <style>{`
        /* ── Table styles ─────────────────────────────────────────────── */
        .tiptap-table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.25rem 0;
          font-size: 0.9rem;
          overflow: hidden;
          border-radius: 6px;
          border: 1px solid #d1d5db;
        }
        .tiptap-table-header {
          background-color: #1e3a5f;
          color: #ffffff;
          font-weight: 600;
          padding: 10px 14px;
          text-align: left;
          border: 1px solid #1e3a5f;
        }
        .tiptap-table-cell {
          padding: 9px 14px;
          border: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .tiptap-table tr:nth-child(even) .tiptap-table-cell {
          background-color: #f8fafc;
        }
        .tiptap-table tr:hover .tiptap-table-cell {
          background-color: #eff6ff;
        }
        .tiptap-table .selectedCell {
          background-color: #dbeafe !important;
        }

        /* ── Image resize styles ──────────────────────────────────────── */
        .tiptap-image {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem auto;
          cursor: default;
        }
        /* TipTap v3 resize wrapper */
        .ProseMirror .tiptap-resizable-node-view-wrapper {
          display: inline-block;
          position: relative;
          max-width: 100%;
        }
        .ProseMirror .tiptap-resizable-node-view-wrapper.ProseMirror-selectednode {
          outline: 2px solid #3b82f6;
          border-radius: 6px;
        }
        /* Resize handles */
        .ProseMirror .tiptap-resizable-node-view-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #3b82f6;
          border: 2px solid #fff;
          border-radius: 50%;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .ProseMirror .tiptap-resizable-node-view-handle[data-direction="right"] {
          right: -5px; top: 50%; transform: translateY(-50%); cursor: ew-resize;
        }
        .ProseMirror .tiptap-resizable-node-view-handle[data-direction="bottom"] {
          bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize;
        }
        .ProseMirror .tiptap-resizable-node-view-handle[data-direction="bottom-right"] {
          bottom: -5px; right: -5px; cursor: nwse-resize;
        }

        /* ── Custom floating bubble menu ──────────────────────────────── */
        .tiptap-bubble-float {
          position: absolute;
          z-index: 50;
          transform: translateY(-100%);
          animation: bubbleFadeIn 0.12s ease-out;
          pointer-events: auto;
        }
        @keyframes bubbleFadeIn {
          from { opacity: 0; transform: translateY(calc(-100% + 4px)) scale(0.97); }
          to   { opacity: 1; transform: translateY(-100%) scale(1); }
        }
      `}</style>

      {/* ── Editor wrapper (relative for absolute bubble positioning) ──── */}
      <div ref={editorWrapperRef} className="relative border border-gray-300 rounded-xl shadow-sm">

        {/* ── Custom Floating Bubble Menu ────────────────────────────────── */}
        {bubblePos && bubbleType === 'text' && (
          <div
            className="tiptap-bubble-float flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-1.5 py-1"
            style={{ top: bubblePos.top, left: Math.max(4, Math.min(bubblePos.left, (editorWrapperRef.current?.offsetWidth ?? 800) - 340)) }}
          >
            <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
              <Heading1 className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
              <Heading2 className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
              <Heading3 className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleDivider />
            <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
              <Bold className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
              <Italic className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
              <UnderlineIcon className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
              <Highlighter className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
              <Code className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleDivider />
            <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
              <AlignLeft className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Centre">
              <AlignCenter className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
              <AlignRight className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleDivider />
            <BubbleBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
              <List className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
              <ListOrdered className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
              <Quote className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleDivider />
            <BubbleBtn onClick={openLinkDialog} active={editor.isActive('link')} title="Insert / Edit Link">
              <LinkIcon className="w-3.5 h-3.5" />
            </BubbleBtn>
            {editor.isActive('link') && (
              <BubbleBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
                <X className="w-3.5 h-3.5 text-red-400" />
              </BubbleBtn>
            )}
          </div>
        )}

        {/* ── Image Toolbar (appears when image is selected) ─────────────── */}
        {bubblePos && bubbleType === 'image' && (
          <div
            className="tiptap-bubble-float flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-1.5 py-1"
            style={{ top: bubblePos.top, left: Math.max(4, Math.min(bubblePos.left, (editorWrapperRef.current?.offsetWidth ?? 800) - 380)) }}
          >
            {/* Size presets */}
            <span className="text-gray-400 text-xs px-1 select-none">Size:</span>
            {[
              { label: 'S', width: 200, title: 'Small (200px)' },
              { label: 'M', width: 400, title: 'Medium (400px)' },
              { label: 'L', width: 600, title: 'Large (600px)' },
              { label: '100%', width: null, title: 'Full width' },
            ].map(({ label, width, title }) => (
              <button
                key={label}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setImageAttr({ width: width ?? undefined, height: undefined }); }}
                title={title}
                className="px-2 py-1 rounded text-xs font-medium text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}

            <BubbleDivider />

            {/* Alignment / Float */}
            <span className="text-gray-400 text-xs px-1 select-none">Layout:</span>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setImageAttr({ style: 'float:left; margin:0.5rem 1.25rem 0.5rem 0; clear:left;' }); }}
              title="Float Left — text wraps on right"
              className="p-1.5 rounded text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setImageAttr({ style: 'display:block; margin:1rem auto; float:none; clear:both;' }); }}
              title="Centre (no float)"
              className="p-1.5 rounded text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setImageAttr({ style: 'float:right; margin:0.5rem 0 0.5rem 1.25rem; clear:right;' }); }}
              title="Float Right — text wraps on left"
              className="p-1.5 rounded text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setImageAttr({ style: 'display:block; margin:1rem 0; float:none; clear:both;' }); }}
              title="Align left (no float)"
              className="p-1.5 rounded text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setImageAttr({ style: 'display:block; margin:1rem 0 1rem auto; float:none; clear:both;' }); }}
              title="Align right (no float)"
              className="p-1.5 rounded text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>

            <BubbleDivider />

            {/* Delete image */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteSelection().run(); }}
              title="Delete image"
              className="p-1.5 rounded text-red-400 hover:bg-red-900 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Sticky Toolbar ────────────────────────────────────────────── */}
        <div className="sticky top-[48px] z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-wrap items-center gap-0.5 shadow-sm rounded-t-xl">

          {/* History */}
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
            <Undo className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
            <Redo className="w-4 h-4" />
          </ToolBtn>

          <Divider />

          {/* Headings */}
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 className="w-4 h-4" />
          </ToolBtn>

          <Divider />

          {/* Text formatting */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <UnderlineIcon className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
            <Highlighter className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
            <Code className="w-4 h-4" />
          </ToolBtn>

          <Divider />

          {/* Alignment */}
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Centre">
            <AlignCenter className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
            <AlignRight className="w-4 h-4" />
          </ToolBtn>

          <Divider />

          {/* Lists */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <List className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Quote className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus className="w-4 h-4" />
          </ToolBtn>

          <Divider />

          {/* Link */}
          <ToolBtn onClick={openLinkDialog} active={editor.isActive('link')} title="Insert / Edit Link">
            <LinkIcon className="w-4 h-4" />
          </ToolBtn>
          {editor.isActive('link') && (
            <ToolBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
              <X className="w-4 h-4 text-red-500" />
            </ToolBtn>
          )}

          <Divider />

          {/* Image */}
          <ToolBtn onClick={() => setImageDialogOpen(true)} title="Insert Image by URL">
            <ImageIcon className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => fileInputRef.current?.click()} title="Upload Image from Device">
            <Upload className="w-4 h-4" />
          </ToolBtn>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Image quick actions (shown when image is selected) */}
          {isImageSelected && (
            <>
              <Divider />
              <span className="text-xs text-blue-600 font-medium px-1">Image selected — use toolbar above image</span>
            </>
          )}
        </div>

        {/* ── Link Dialog ───────────────────────────────────────────────── */}
        {linkDialogOpen && (
          <div className="sticky top-[96px] z-20 border-b border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
            <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setLinkDialogOpen(false); }}
              placeholder="https://example.com"
              className="flex-1 text-sm border border-blue-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button type="button" onClick={applyLink} className="text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
              Apply
            </button>
            <button type="button" onClick={() => setLinkDialogOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5">
              Cancel
            </button>
          </div>
        )}

        {/* ── Image URL Dialog ──────────────────────────────────────────── */}
        {imageDialogOpen && (
          <div className="sticky top-[96px] z-20 border-b border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
            <ImageIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
            <input
              autoFocus
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyImageUrl(); if (e.key === 'Escape') setImageDialogOpen(false); }}
              placeholder="https://example.com/image.png"
              className="flex-1 text-sm border border-green-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button type="button" onClick={applyImageUrl} className="text-sm font-medium bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
              Insert
            </button>
            <button type="button" onClick={() => setImageDialogOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5">
              Cancel
            </button>
          </div>
        )}

        {/* ── Editor Content ────────────────────────────────────────────── */}
        <div className="bg-white">
          <EditorContent editor={editor} />
        </div>

        {/* ── Status Bar ────────────────────────────────────────────────── */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500 rounded-b-xl">
          <span>{charCount.toLocaleString()} characters · {wordCount.toLocaleString()} words</span>
          <span className="text-gray-400">
            {editor.isActive('image') ? 'Image — click to resize or use toolbar' :
             editor.isActive('heading', { level: 1 }) ? 'Heading 1' :
             editor.isActive('heading', { level: 2 }) ? 'Heading 2' :
             editor.isActive('heading', { level: 3 }) ? 'Heading 3' :
             editor.isActive('bulletList') ? 'Bullet List' :
             editor.isActive('orderedList') ? 'Ordered List' :
             editor.isActive('blockquote') ? 'Blockquote' :
             editor.isActive('table') ? 'Table' :
             'Paragraph'}
          </span>
        </div>
      </div>
    </>
  );
}
