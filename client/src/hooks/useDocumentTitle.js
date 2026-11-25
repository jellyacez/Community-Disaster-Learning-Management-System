import { useEffect } from "react";
import { useBranding } from "./useBranding";

// "<page> | <system name>". Before branding is known on a first visit, the page part alone.
export default function useDocumentTitle(page) {
  const { name } = useBranding();
  const title = name ? (page ? `${page} | ${name}` : name) : page;
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
