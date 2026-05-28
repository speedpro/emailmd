/** @format */

import type MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import { MARKER_CENTERED_OPEN, MARKER_CENTERED_CLOSE } from "../constants.ts";
import { parseDirectiveParams, serializeMarkerAttrs } from "../params.ts";

export function registerCentered(md: MarkdownIt): void {
  md.use(container, "centered", {
    render(tokens: any[], idx: number) {
      if (tokens[idx].nesting === 1) {
        const params = parseDirectiveParams(
          tokens[idx].info.trim(),
          "centered",
        );
        const attrs = serializeMarkerAttrs(params);
        return MARKER_CENTERED_OPEN.slice(0, -3) + attrs + "-->\n";
      }
      return MARKER_CENTERED_CLOSE + "\n";
    },
  });
}
