import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
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
} from 'lucide-react';
import type { RichContent } from '@/entities/curriculum';

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
 *           tables, horizontal rule, undo/redo, character count
 *
 * Toolbar is sticky so it stays visible while scrolling the content.
 * Floating bubble toolbar appears above selected text for quick formatting.
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing your lesson content here…',
  dir = 'ltr',
}: RichTextEditorProps) {
  const isRTL = dir === 'rtl';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Floating bubble toolbar position state
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);

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
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-4 shadow-sm',
        },
        allowBase64: true,
        resize: {
          enabled: true,
          minWidth: 60,
          minHeight: 40,
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
      const { selection } = editor.state;
      // Hide bubble if selection is empty or it's a node selection (e.g. image)
      if (selection.empty || ('node' in selection)) {
        setBubblePos(null);
        return;
      }
      // Calculate position using DOM selection
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setBubblePos(null);
        return;
      }
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = editorContainerRef.current?.getBoundingClientRect();
      if (!containerRect || rect.width === 0) {
        setBubblePos(null);
        return;
      }
      // Position bubble above the selection, centered horizontally
      const bubbleWidth = 310; // approximate width of bubble toolbar
      const rawLeft = rect.left - containerRect.left + rect.width / 2 - bubbleWidth / 2;
      setBubblePos({
        top: rect.top - containerRect.top - 52,
        left: Math.max(4, Math.min(rawLeft, containerRect.width - bubbleWidth - 4)),
      });
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[450px] px-6 py-4 ${isRTL ? 'text-right' : ''}`,
        dir: dir,
      },
    },
  });

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

  // ── Bubble toolbar button helper (dark theme) ──────────────────────────
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
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // prevent losing text selection
        onClick();
      }}
      className={`p-1 rounded transition-colors
        ${active
          ? 'bg-white text-gray-900'
          : 'text-gray-200 hover:bg-gray-700 hover:text-white'}
      `}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-gray-300 mx-0.5" />;
  const BubbleDivider = () => <div className="w-px h-4 bg-gray-600 mx-0.5 flex-shrink-0" />;

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <>
      {/* ── Table styles injected globally ────────────────────────────── */}
      <style>{`
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
        /* Selected cell highlight */
        .tiptap-table .selectedCell {
          background-color: #dbeafe !important;
        }
        /* ── Image resize handles ─────────────────────────────────── */
        .ProseMirror [data-resize-state] {
          position: relative;
          display: inline-block;
          line-height: 0;
        }
        .ProseMirror [data-resize-state] img {
          display: block;
        }
        /* Resize handle dots */
        .ProseMirror [data-resize-state] > [style*="position: absolute"] {
          width: 10px !important;
          height: 10px !important;
          background: #2563eb;
          border: 2px solid #fff;
          border-radius: 50%;
          z-index: 10;
          cursor: nwse-resize;
        }
        /* Show handles only when image is selected */
        .ProseMirror-selectednode [data-resize-state] > [style*="position: absolute"],
        [data-resize-state="true"] > [style*="position: absolute"] {
          opacity: 1;
        }
        /* Hide handles when not selected */
        .ProseMirror [data-resize-state="false"] > [style*="position: absolute"] {
          opacity: 0;
        }
        /* Blue ring on selected image */
        .ProseMirror-selectednode [data-resize-state] img {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>

      {/* ── Outer wrapper with relative positioning for bubble ────────── */}
      <div ref={editorContainerRef} className="border border-gray-300 rounded-xl shadow-sm relative">

        {/* ── Floating Bubble Toolbar ───────────────────────────────────── */}
        {bubblePos && (
          <div
            style={{
              position: 'absolute',
              top: bubblePos.top,
              left: bubblePos.left,
              zIndex: 50,
              pointerEvents: 'auto',
            }}
            className="flex items-center gap-0.5 bg-gray-900 text-white rounded-lg shadow-xl px-2 py-1.5 border border-gray-700 select-none"
            onMouseDown={(e) => e.preventDefault()}
          >
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Underline"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={editor.isActive('highlight')}
              title="Highlight"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleDivider />
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleDivider />
            <BubbleBtn
              onClick={openLinkDialog}
              active={editor.isActive('link')}
              title="Insert / Edit Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Inline Code"
            >
              <Code className="w-3.5 h-3.5" />
            </BubbleBtn>
          </div>
        )}

        {/* ── Sticky Toolbar ────────────────────────────────────────────── */}
        {/*
          sticky top-0 z-20 ensures the toolbar stays visible while the
          editor content scrolls within the parent container.
        */}
        <div className="sticky top-[48px] z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-wrap items-center gap-0.5 shadow-sm">

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
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
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
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
          <span>{charCount.toLocaleString()} characters · {wordCount.toLocaleString()} words</span>
          <span className="text-gray-400">
            {editor.isActive('heading', { level: 1 }) ? 'Heading 1' :
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
