/** @format */

import type MarkdownIt from "markdown-it";
import { registerCallout } from "./callout.ts";
import { registerCentered } from "./centered.ts";
import { registerHighlight } from "./highlight.ts";
import { registerHeader } from "./header.ts";
import { registerFooter } from "./footer.ts";
import { registerHero } from "./hero.ts";

export function registerDirectives(md: MarkdownIt): void {
  registerCallout(md);
  registerCentered(md);
  registerHighlight(md);
  registerHeader(md);
  registerFooter(md);
  registerHero(md);
}
