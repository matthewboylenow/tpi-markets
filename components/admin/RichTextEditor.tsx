"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "full" | "minimal";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  variant = "full",
}: {
  value: string | null;
  onChange: (json: string) => void;
  placeholder?: string;
  variant?: Variant;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: variant === "minimal" ? false : { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: variant === "full" ? undefined : false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write something...",
      }),
    ],
    content: value ? safeParse(value) : null,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none p-4 focus:outline-none min-h-[120px] rich-text",
      },
    },
  });

  if (!editor) {
    return (
      <div className="rounded-lg border border-tpi-ink/15 bg-white min-h-[160px]" />
    );
  }

  return (
    <div className="rounded-lg border border-tpi-ink/15 overflow-hidden bg-white">
      <Toolbar editor={editor} variant={variant} />
      <EditorContent editor={editor} />
    </div>
  );
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: s }] }] };
  }
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-md hover:bg-tpi-ink/5 text-tpi-stone hover:text-tpi-ink transition-colors",
        active && "bg-tpi-blue/10 text-tpi-blue"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, variant }: { editor: Editor; variant: Variant }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex items-center gap-0.5 border-b border-tpi-ink/10 px-2 py-1.5 bg-tpi-cream/50">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={setLink}
        title="Link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </ToolbarButton>
      <div className="w-px h-4 bg-tpi-ink/10 mx-1" />
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>
      {variant === "full" && (
        <>
          <div className="w-px h-4 bg-tpi-ink/10 mx-1" />
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}
