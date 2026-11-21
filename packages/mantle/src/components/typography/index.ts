/**
 * Re-exports for the Typography component.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography
 */

import * as TypographyParts from "./typography-parts.js";

/**
 * Headings and paragraphs in mantle's type roles, plus a container for HTML that no one maps
 * to components. Each part reads a type-role token (`--text-heading-1` to `--text-heading-6`,
 * `--text-paragraph`, `--font-heading`), so a site sets its own scale in CSS and the markup
 * stays the same. The parts use no context, so they need no provider, and HTML with no React gets
 * the same styles from the classes.
 *
 * @useWhen Show a heading or a paragraph of copy in the site's type scale, or style CMS or MDX
 * HTML with it.
 *
 * @siblings
 * - `Card`: the heading is the title of a card; use `Card.Title`.
 * - `Dialog`: the heading is the title of a dialog; use `Dialog.Title`.
 * - `Code`: the text is a fragment of code.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography
 *
 * @example
 * Composition:
 * ```
 * Typography.Root
 * ├── Typography.H1
 * ├── Typography.H2
 * ├── Typography.H3
 * ├── Typography.H4
 * ├── Typography.H5
 * ├── Typography.H6
 * └── Typography.P
 * ```
 *
 * @example
 * ```tsx
 * <Typography.Root>
 *   <Typography.H1>Endpoints</Typography.H1>
 *   <Typography.P className="text-lead">Each endpoint gets a public URL.</Typography.P>
 *   <Typography.H2>Traffic policy</Typography.H2>
 *   <Typography.P>Attach a traffic policy to filter, route, or rewrite requests.</Typography.P>
 * </Typography.Root>
 * ```
 */
const Typography = TypographyParts;

export {
	//,
	Typography,
};

export type {
	//,
	TypographyHeadingProps,
	TypographyParagraphProps,
	TypographyRootProps,
} from "./typography.js";
