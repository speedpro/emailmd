/** @format */

import MarkdownIt from "markdown-it";
import attrs from "markdown-it-attrs";
import taskLists from "markdown-it-task-lists";
import { full as emoji } from "markdown-it-emoji";
import deflist from "markdown-it-deflist";
import mark from "markdown-it-mark";
import sub from "markdown-it-sub";
import sup from "markdown-it-sup";
import { registerDirectives } from "./directives/index.ts";

const md = new MarkdownIt({ html: true, linkify: true });
md.use(attrs);
md.use(taskLists);
md.use(emoji);
md.use(deflist);
md.use(mark);
md.use(sub);
md.use(sup);
registerDirectives(md);

// Matches template tags that should pass through markdown-it untouched.
// Matches template tags that could break markdown-it link/URL parsing.
// Excludes ERB/EJS (<% %>) since markdown-it HTML-encodes those safely.
//
// Note: this shielding protects tags from *markdown-it's* linkify/URL parsing,
// which runs before MJML ever sees the document. MJML 5's `templateSyntax`
// option (set in mjml.ts) protects `{{ }}` from MJML's PostCSS pass. The two
// layers are complementary — both are needed to preserve `[text]({{ url }})`
// end-to-end through the pipeline.
const TEMPLATE_TAG_RE =
  /(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\$\{[\s\S]*?\}|%%[\s\S]*?%%)/g;

function shieldTemplateTags(input: string): { text: string; tags: string[] } {
  const tags: string[] = [];
  const text = input.replace(TEMPLATE_TAG_RE, (match) => {
    const idx = tags.length;
    tags.push(match);
    return `EMAILMDTPL${idx}ENDTPL`;
  });
  return { text, tags };
}

function restoreTemplateTags(html: string, tags: string[]): string {
  if (tags.length === 0) return html;
  return html.replace(
    /EMAILMDTPL(\d+)ENDTPL/g,
    (_, idx) => tags[parseInt(idx, 10)] ?? _,
  );
}

export function parseMarkdown(markdown: string): string {
  const { text: shielded, tags } = shieldTemplateTags(markdown);
  let html = md.render(shielded);
  html = restoreTemplateTags(html, tags);

  // Replace <input> checkboxes with Unicode characters for email safety
  // (email clients strip <input> elements)
  html = html.replace(
    /<input class="task-list-item-checkbox" checked="" disabled="" type="checkbox">/g,
    "\u2611 ",
  );
  html = html.replace(
    /<input class="task-list-item-checkbox" disabled="" type="checkbox">/g,
    "\u2610 ",
  );

  return html;
}
