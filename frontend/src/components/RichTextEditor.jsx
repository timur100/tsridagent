import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, List, ListOrdered, Link as LinkIcon, ImageIcon, Undo, Redo
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const RichTextEditor = ({ value, onChange, placeholder = 'Ihre Nachricht...' }) => {
  const { theme } = useTheme();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${
          theme === 'dark' ? 'prose-invert' : ''
        }`,
      },
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt('Bild-URL oder fügen Sie Bild aus Zwischenablage ein:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt('Link-URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`rich-text-editor border rounded-lg ${
      theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-300'
    }`}>
      {/* Toolbar */}
      <div className={`flex flex-wrap gap-1 p-2 border-b ${
        theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            editor.isActive('bold') ? 'bg-gray-300 dark:bg-gray-600' : ''
          }`}
          title="Fett"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            editor.isActive('italic') ? 'bg-gray-300 dark:bg-gray-600' : ''
          }`}
          title="Kursiv"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            editor.isActive('bulletList') ? 'bg-gray-300 dark:bg-gray-600' : ''
          }`}
          title="Aufzählungsliste"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            editor.isActive('orderedList') ? 'bg-gray-300 dark:bg-gray-600' : ''
          }`}
          title="Nummerierte Liste"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            editor.isActive('link') ? 'bg-gray-300 dark:bg-gray-600' : ''
          }`}
          title="Link einfügen"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          title="Bild einfügen"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          title="Rückgängig"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          title="Wiederherstellen"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className={`p-3 min-h-[120px] ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        <EditorContent editor={editor} />
      </div>

      {/* Custom Styles */}
      <style>{`
        .ProseMirror {
          min-height: 120px;
          outline: none;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
        }
        
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .dark-theme .ProseMirror a {
          color: #60a5fa;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        
        .ProseMirror strong {
          font-weight: bold;
        }
        
        .ProseMirror em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
