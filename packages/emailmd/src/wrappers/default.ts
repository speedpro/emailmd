/** @format */

import type { Theme } from "../theme.ts";
import type { Segment } from "../segmenter.ts";
import type { WrapperMeta } from "../mjml.ts";
import { buildHead, segmentsToMjml } from "../mjml.ts";

export function defaultWrapper(
  segments: Segment[],
  theme: Theme,
  meta?: WrapperMeta,
): string {
  const head = buildHead(theme, meta?.preheader);
  const body = segmentsToMjml(segments, theme);

  return `<mjml>
  ${head}
  <mj-body background-color="${theme.backgroundColor}" width="${theme.contentWidth}">
    ${body}
  </mj-body>
</mjml>`;
}
