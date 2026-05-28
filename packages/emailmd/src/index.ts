/** @format */

export type { Theme } from "./theme.ts";
export type { WrapperFn, WrapperMeta } from "./mjml.ts";
export type { Segment, SegmentType } from "./segmenter.ts";
export {
  defaultTheme,
  lightTheme,
  darkTheme,
  mergeTheme,
  resolveBaseTheme,
} from "./theme.ts";
export {
  extractFrontmatter,
  frontmatterToThemeOverrides,
} from "./frontmatter.ts";
export { buildHead, segmentsToMjml } from "./mjml.ts";
export { defaultWrapper } from "./wrappers/default.ts";

import { mergeTheme, resolveBaseTheme, type Theme } from "./theme.ts";
import {
  extractFrontmatter,
  frontmatterToThemeOverrides,
  frontmatterToFonts,
} from "./frontmatter.ts";
import { parseMarkdown } from "./parser.ts";
import { segment } from "./segmenter.ts";
import { renderMjml, type WrapperFn, type WrapperMeta } from "./mjml.ts";
import { resolveWrapper } from "./wrappers/index.ts";
import { toPlainText } from "./plaintext.ts";

/** Options for the {@link render} function. */
export interface RenderOptions {
  /** Theme overrides. Merged with defaults; frontmatter values take precedence. */
  theme?: Partial<Theme>;
  /** Wrapper template. Built-in names or a custom {@link WrapperFn}. */
  wrapper?: "default" | WrapperFn;
  /** Minify the output HTML. Default: `false`. Useful for staying under Gmail's 102KB clip limit. */
  minify?: boolean;
  /**
   * Custom web fonts as a map of family name → URL (rendered as `<mj-font>` tags).
   * Frontmatter `fonts:` entries merge on top of this map (per-family, frontmatter wins).
   */
  fonts?: Record<string, string>;
  /** MJML validation level. Default: `'soft'`. */
  validationLevel?: "skip" | "soft" | "strict";
  /**
   * Custom template delimiters preserved during compilation. Passed through to MJML.
   * Default: `[{ prefix: '{{', suffix: '}}' }, { prefix: '[[', suffix: ']]' }]`.
   */
  templateSyntax?: Array<{ prefix: string; suffix: string }>;
  /**
   * Sanitize template variables inside CSS before minification.
   * Only takes effect when `minify` is `true`. Default: `false`.
   */
  sanitizeStyles?: boolean;
  /** Pretty-print the output HTML. Ignored when `minify` is `true`. Default: `false`. */
  beautify?: boolean;
}

/**
 * Non-fatal issue encountered during {@link render}. Rendering still produces
 * valid `html`/`text` output; warnings let callers surface parse problems to
 * end users (e.g. a banner in an editor UI).
 */
export interface RenderWarning {
  /** Which render stage produced the warning. */
  stage: "frontmatter";
  /** Human-readable message. */
  message: string;
  /** Original `Error`, when one was thrown internally. */
  cause?: Error;
}

/** Object returned by {@link render}. */
export interface RenderResult {
  /** Complete email-safe HTML document. */
  html: string;
  /** Plain text version for the text/plain MIME part. */
  text: string;
  /** Extracted frontmatter metadata (preheader and any custom keys). */
  meta: {
    preheader?: string;
    [key: string]: unknown;
  };
  /**
   * Non-fatal issues encountered while rendering. Omitted when empty.
   * See {@link RenderWarning}.
   */
  warnings?: RenderWarning[];
}

/**
 * Render markdown (with optional YAML frontmatter) into email-safe HTML.
 *
 * @param markdown - Markdown string, optionally with YAML frontmatter.
 * @param options  - Theme and wrapper overrides.
 * @returns An object with `html`, `text`, and `meta` properties.
 *
 * @example
 * ```ts
 * const { html, text, meta } = await render(`
 * ---
 * preheader: Welcome!
 * ---
 * # Hello
 * Thanks for signing up.
 * `);
 * ```
 */
export async function render(
  markdown: string,
  options?: RenderOptions,
): Promise<RenderResult> {
  const {
    meta,
    content,
    error: frontmatterError,
  } = extractFrontmatter(markdown);
  const baseTheme = resolveBaseTheme(meta.theme as string | undefined);
  const frontmatterOverrides = frontmatterToThemeOverrides(meta);
  const theme = mergeTheme(
    { ...options?.theme, ...frontmatterOverrides },
    baseTheme,
  );
  const parsedHtml = parseMarkdown(content);
  const segments = segment(parsedHtml);

  const wrapperFn = resolveWrapper(options?.wrapper);

  const wrapperMeta: WrapperMeta = {
    preheader: meta.preheader as string | undefined,
  };

  const frontmatterFonts = frontmatterToFonts(meta);
  const mergedFonts =
    options?.fonts || frontmatterFonts
      ? { ...options?.fonts, ...frontmatterFonts }
      : undefined;

  const html = await renderMjml(segments, theme, wrapperMeta, wrapperFn, {
    minify: options?.minify,
    fonts: mergedFonts,
    validationLevel: options?.validationLevel,
    templateSyntax: options?.templateSyntax,
    sanitizeStyles: options?.sanitizeStyles,
    beautify: options?.beautify,
  });
  const text = toPlainText(parsedHtml);

  const warnings: RenderWarning[] = [];
  if (frontmatterError) {
    warnings.push({
      stage: "frontmatter",
      message: frontmatterError.message,
      cause: frontmatterError,
    });
  }

  return {
    html,
    text,
    meta: { ...meta },
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
