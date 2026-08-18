import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { HugeiconsIcon } from '@hugeicons/react';
import { TextBoldIcon, TextItalicIcon, TextUnderlineIcon, LeftToRightListBulletIcon, LeftToRightListNumberIcon } from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const toggleStyle = (action, isActiveAction) => {
    return `p-2 rounded-md transition-colors ${
      editor.isActive(isActiveAction)
        ? 'bg-red-100 text-red-700'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`;
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={toggleStyle('bold', 'bold')}
        title="Bold"
      >
        <HugeiconsIcon icon={TextBoldIcon} className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={toggleStyle('italic', 'italic')}
        title="Italic"
      >
        <HugeiconsIcon icon={TextItalicIcon} className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={toggleStyle('underline', 'underline')}
        title="Underline"
      >
        <HugeiconsIcon icon={TextUnderlineIcon} className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={toggleStyle('bulletList', 'bulletList')}
        title="Bullet List"
      >
        <HugeiconsIcon icon={LeftToRightListBulletIcon} className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={toggleStyle('orderedList', 'orderedList')}
        title="Ordered List"
      >
        <HugeiconsIcon icon={LeftToRightListNumberIcon} className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function RichTextEditor({ value, onChange, placeholder, className = "" }) {
  const [, forceUpdate] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      Underline.configure(),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-4 ${className}`,
        placeholder: placeholder || "Start typing...",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      forceUpdate((prev) => prev + 1);
    },
    onTransaction: () => {
      forceUpdate((prev) => prev + 1);
    },
  });

  // Keep editor content in sync with external value changes (e.g., clearing the form)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent transition-all bg-white">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
