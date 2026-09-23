// Markup the draft letter editor (Tiptap StarterKit) can represent. Anything
// else would be silently dropped when the editor loads it, so it is refused.
const EDITABLE_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'h2', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr',
]);

export const MAX_LETTER_HTML_LENGTH = 200_000;

export function hasForeignMarkup(html: string) {
  for (const [, tag] of html.matchAll(/<\/?\s*([a-z][a-z0-9-]*)/gi)) {
    if (!EDITABLE_TAGS.has(tag.toLowerCase())) return true;
  }
  return /\sstyle\s*=|\son[a-z]+\s*=|javascript:/i.test(html);
}
