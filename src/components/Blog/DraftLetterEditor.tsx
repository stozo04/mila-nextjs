"use client";
import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  FaBold, FaItalic, FaUnderline, FaStrikethrough, FaHeading,
  FaListUl, FaListOl, FaQuoteRight, FaUndo, FaRedo,
} from "react-icons/fa";
import { Blog } from "@/types/blog";

type Props = {
  slug: string;
  initialHtml: string;
  onSaved: (blog: Blog) => void;
  onCancel: () => void;
};

const toggles = [
  { label: 'Bold', icon: FaBold, mark: 'bold', run: (e: Editor) => e.chain().focus().toggleBold().run() },
  { label: 'Italic', icon: FaItalic, mark: 'italic', run: (e: Editor) => e.chain().focus().toggleItalic().run() },
  { label: 'Underline', icon: FaUnderline, mark: 'underline', run: (e: Editor) => e.chain().focus().toggleUnderline().run() },
  { label: 'Strikethrough', icon: FaStrikethrough, mark: 'strike', run: (e: Editor) => e.chain().focus().toggleStrike().run() },
  { label: 'Heading', icon: FaHeading, mark: 'heading', run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Bullet list', icon: FaListUl, mark: 'bulletList', run: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered list', icon: FaListOl, mark: 'orderedList', run: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Quote', icon: FaQuoteRight, mark: 'blockquote', run: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
] as const;

export default function DraftLetterEditor({ slug, initialHtml, onSaved, onCancel }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } })],
    content: initialHtml,
    immediatelyRender: false,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'blog-content draft-editor-content',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Draft letter text',
      },
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => e && {
      active: Object.fromEntries(toggles.map(t => [t.mark, t.mark === 'heading' ? e.isActive('heading', { level: 2 }) : e.isActive(t.mark)])),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    },
  });

  const handleSave = async () => {
    if (!editor || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const html = editor.isEmpty ? '' : editor.getHTML();
      const response = await fetch(`/api/blog/${encodeURIComponent(slug)}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(data.blog);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Unable to save the draft. Your text is still in the editor; try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="draft-editor mb-4">
      {/* Keep focus (and the selection) in the letter when a toolbar button is clicked. */}
      <div className="draft-editor-toolbar" role="toolbar" aria-label="Formatting" onMouseDown={e => e.preventDefault()}>
        {toggles.map(({ label, icon: Icon, mark, run }) => (
          <button key={mark} type="button" className="btn btn-sm btn-outline-secondary" title={label} aria-label={label}
            aria-pressed={!!state?.active[mark]} disabled={!editor} onClick={() => editor && run(editor)}>
            <Icon aria-hidden />
          </button>
        ))}
        <span className="draft-editor-divider" aria-hidden />
        <button type="button" className="btn btn-sm btn-outline-secondary" title="Undo" aria-label="Undo"
          disabled={!state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}><FaUndo aria-hidden /></button>
        <button type="button" className="btn btn-sm btn-outline-secondary" title="Redo" aria-label="Redo"
          disabled={!state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}><FaRedo aria-hidden /></button>
      </div>
      <p className="draft-editor-hint text-muted small mb-2">Emoji: press Win + . (Windows), Ctrl + Cmd + Space (Mac), or use your phone&apos;s emoji key.</p>
      <EditorContent editor={editor} />
      {error && <p className="alert alert-danger mt-3 mb-0" role="alert">{error}</p>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isSaving}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!editor || isSaving}>
          {isSaving ? 'Saving…' : 'Save Draft'}
        </button>
      </div>
      <style jsx global>{`
        .draft-editor-toolbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px; }
        .draft-editor-toolbar .btn { width: auto; min-width: 36px; }
        .draft-editor-toolbar .btn[aria-pressed='true'] { background-color: var(--bs-secondary); color: #fff; }
        .draft-editor-divider { width: 1px; align-self: stretch; background: var(--bs-border-color); margin: 0 4px; }
        .draft-editor-content { min-height: 320px; border: 1px solid var(--bs-border-color); border-radius: 8px; padding: 16px; outline: none; }
        .draft-editor-content:focus { border-color: var(--bs-primary); box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15); }
        .draft-editor-content blockquote { border-left: 3px solid var(--bs-border-color); padding-left: 12px; color: var(--bs-secondary-color); }
      `}</style>
    </div>
  );
}
