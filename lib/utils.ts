import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SALESPERSON_URL =
  process.env.NEXT_PUBLIC_SALESPERSON_URL ??
  "https://taylorproducts.net/meet-your-salesperson/";

export function spURL(business: string, product?: string) {
  const content = product ? `${business}-${product}` : business;
  const params = new URLSearchParams({
    utm_source: "equipment-finder",
    utm_medium: "web",
    utm_campaign: "equipment-finder",
    utm_content: content,
  });
  return `${SALESPERSON_URL}?${params.toString()}`;
}

export function plainTextToTiptap(text: string): string {
  if (!text) {
    return JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
  }
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  });
}
