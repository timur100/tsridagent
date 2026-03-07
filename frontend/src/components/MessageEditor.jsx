/**
 * TipTap WYSIWYG Editor für Nachrichtenvorlagen
 * Unterstützt: Fett, Kursiv, Unterstrichen, Textausrichtung
 */

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from './ui/button';

const MenuButton = ({ onClick, isActive, children, title }) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    className={`h-8 w-8 p-0 ${isActive ? 'bg-[#d50c2d] text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
    title={title}
  >
    {children}
  </Button>
);

const MessageEditor = ({ value, onChange, placeholder = 'Nachricht eingeben...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable features we don't need
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[100px] p-3',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="bg-[#1a1a1a] border border-[#444] rounded-lg p-4 min-h-[150px] flex items-center justify-center">
        <span className="text-gray-500">Editor wird geladen...</span>
      </div>
    );
  }

  return (
    <div className="border border-[#444] rounded-lg overflow-hidden bg-[#1a1a1a]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-[#444] bg-[#262626]">
        {/* Text formatting */}
        <div className="flex items-center gap-0.5 border-r border-[#444] pr-2 mr-2">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Fett (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Kursiv (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Unterstrichen (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </MenuButton>
        </div>
        
        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Linksbündig"
          >
            <AlignLeft className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Zentriert"
          >
            <AlignCenter className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Rechtsbündig"
          >
            <AlignRight className="w-4 h-4" />
          </MenuButton>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="min-h-[120px]">
        <EditorContent 
          editor={editor} 
          className="[&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:text-white [&_.ProseMirror_p]:my-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-gray-500 [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none"
        />
      </div>
    </div>
  );
};

export default MessageEditor;
