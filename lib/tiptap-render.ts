import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

export function tiptapToHtml(json: string | null | undefined): string {
  if (!json) return "";
  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    return generateHTML(parsed, [StarterKit, Link]);
  } catch {
    // Fallback: treat as plain text
    if (typeof json === "string") {
      const escaped = json
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p>${escaped}</p>`;
    }
    return "";
  }
}

export function tiptapToPlainText(json: string | null | undefined): string {
  if (!json) return "";
  try {
    const doc = typeof json === "string" ? JSON.parse(json) : json;
    const walk = (node: { type?: string; text?: string; content?: unknown[] }): string => {
      if (node.type === "text") return node.text ?? "";
      if (Array.isArray(node.content)) {
        return (node.content as { type?: string; text?: string; content?: unknown[] }[])
          .map(walk)
          .join(node.type === "paragraph" ? "" : " ");
      }
      return "";
    };
    return walk(doc).trim();
  } catch {
    return typeof json === "string" ? json : "";
  }
}
