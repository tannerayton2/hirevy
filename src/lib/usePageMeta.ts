import { useEffect } from "react";

/**
 * Sets document.title and meta[name="description"] for the current page.
 * Creates the description tag if it doesn't exist. Restores nothing on unmount —
 * next page's usePageMeta call will overwrite.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    if (title) document.title = title;
    if (description != null) {
      let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
}
