/**
 * Lesson Content Component
 * Displays rich lesson content (JSON TipTap/Lexical)
 *
 * Each lesson belongs to ONE language only - no bilingual content.
 * Arabic lessons use content_ar, English lessons use content.
 * Renders TipTap/Lexical JSON structure
 */

import type { Json } from '@/shared/database.types';

interface LessonContentProps {
  content: Json;
  contentAr?: Json | null; // kept for backward compat, not used
}

export function LessonContent({ content }: LessonContentProps) {
  // Always display English content
  const displayContent = content;
  const isRTL = false;

  // Helper function to render TipTap/Lexical JSON content
  const renderContent = (jsonContent: Json): React.ReactNode => {
    if (!jsonContent || typeof jsonContent !== 'object' || !('type' in jsonContent)) {
      return (
        <div className="text-muted-foreground italic">
          No content available
        </div>
      );
    }

    // Basic TipTap/Lexical JSON rendering
    // In production, use proper TipTap/Lexical renderer
    const contentObj = jsonContent as Record<string, any>;
    if (contentObj.type === 'doc' && Array.isArray(contentObj.content)) {
      return (
        <div className="prose prose-lg max-w-none">
          {contentObj.content.map((node: any, index: number) => renderNode(node, index))}
        </div>
      );
    }

    // Fallback: display JSON pretty-printed
    return (
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        {JSON.stringify(jsonContent, null, 2)}
      </pre>
    );
  };

  // Render individual node (paragraph, heading, list, etc.)
  const renderNode = (node: any, index: number): React.ReactNode => {
    if (!node || !node.type) return null;

    switch (node.type) {
      case 'paragraph':
        return (
          <p key={index} className="mb-4">
            {renderInlineContent(node.content)}
          </p>
        );

      case 'heading':
        const level = node.attrs?.level || 2;
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag
            key={index}
            className={`font-bold mb-3 ${
              level === 1
                ? 'text-3xl'
                : level === 2
                ? 'text-2xl'
                : level === 3
                ? 'text-xl'
                : 'text-lg'
            }`}
          >
            {renderInlineContent(node.content)}
          </HeadingTag>
        );

      case 'bulletList':
        return (
          <ul key={index} className="list-disc list-inside mb-4 space-y-2">
            {node.content?.map((item: any, i: number) => (
              <li key={i}>{renderNode(item.content?.[0], i)}</li>
            ))}
          </ul>
        );

      case 'orderedList':
        return (
          <ol key={index} className="list-decimal list-inside mb-4 space-y-2">
            {node.content?.map((item: any, i: number) => (
              <li key={i}>{renderNode(item.content?.[0], i)}</li>
            ))}
          </ol>
        );

      case 'blockquote':
        return (
          <blockquote
            key={index}
            className="border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-4"
          >
            {renderInlineContent(node.content)}
          </blockquote>
        );

      case 'codeBlock':
        return (
          <pre key={index} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
            <code>{node.content?.[0]?.text || ''}</code>
          </pre>
        );

      case 'hardBreak':
        return <br key={index} />;

      case 'horizontalRule':
        return <hr key={index} className="my-6 border-gray-300" />;

      case 'image':
        return (
          <img
            key={index}
            src={node.attrs?.src}
            alt={node.attrs?.alt || 'Image'}
            className="max-w-full h-auto rounded-lg mb-4"
          />
        );

      default:
        // Fallback for unknown node types
        if (node.content) {
          return (
            <div key={index}>
              {node.content.map((child: any, i: number) => renderNode(child, i))}
            </div>
          );
        }
        return null;
    }
  };

  // Render inline content (text, bold, italic, links, etc.)
  const renderInlineContent = (content: any[]): React.ReactNode => {
    if (!content || !Array.isArray(content)) return null;

    return content.map((node, index) => {
      if (node.type === 'text') {
        let text: React.ReactNode = node.text;

        // Apply marks (bold, italic, code, etc.)
        if (node.marks && Array.isArray(node.marks)) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                text = <strong key={index}>{text}</strong>;
                break;
              case 'italic':
                text = <em key={index}>{text}</em>;
                break;
              case 'code':
                text = (
                  <code
                    key={index}
                    className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono"
                  >
                    {text}
                  </code>
                );
                break;
              case 'link':
                text = (
                  <a
                    key={index}
                    href={mark.attrs?.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {text}
                  </a>
                );
                break;
              case 'strike':
                text = <s key={index}>{text}</s>;
                break;
              case 'underline':
                text = <u key={index}>{text}</u>;
                break;
              default:
                break;
            }
          });
        }

        return <span key={index}>{text}</span>;
      }

      // Handle other inline nodes
      return renderNode(node, index);
    });
  };

  // Render the appropriate content based on lesson language
  // No tabs - each lesson is single-language
  return (
    <div className="lesson-content" dir="ltr">
      {renderContent(displayContent)}
    </div>
  );
}
