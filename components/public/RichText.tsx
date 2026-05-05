import { tiptapToHtml } from "@/lib/tiptap-render";
import { cn } from "@/lib/utils";

export function RichText({
  content,
  className,
}: {
  content: string | null | undefined;
  className?: string;
}) {
  const html = tiptapToHtml(content);
  if (!html) return null;
  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
