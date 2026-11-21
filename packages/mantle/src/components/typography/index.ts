/**
 * Re-exports for the Typography component.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography
 */

import * as TypographyParts from "./typography-parts.js";

/**
 * Headings and paragraphs in mantle's type roles. Each part renders the element it is named for,
 * so an MDX `components` map assigns one part to each element. Each part reads a type-role token
 * (`--text-heading-xs` to `--text-heading-9xl`, `--text-paragraph-sm` to `--text-paragraph-lg`,
 * and `--font-heading`), whose steps follow Tailwind's `text-*` scale. A site sets its own scale
 * in CSS, and the markup stays the same. The parts are server components: they use
 * no hooks and no context, and ship no `"use client"`. `asChild` renders `Slot`, which is a client
 * component.
 *
 * @useWhen Show a heading or a paragraph of copy in the site's type scale, in JSX or as the MDX
 * `h1` to `h6` and `p` elements.
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
 * Typography
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
 * <Typography.H1>Endpoints</Typography.H1>
 * <Typography.P className="text-paragraph-lg">Each endpoint gets a public URL.</Typography.P>
 * <Typography.H2>Traffic policy</Typography.H2>
 * <Typography.P>Attach a traffic policy to filter, route, or rewrite requests.</Typography.P>
 *
 * // MDX: map each element to its part.
 * <MDXProvider components={{ h1: Typography.H1, h2: Typography.H2, p: Typography.P }}>
 *   <Content />
 * </MDXProvider>
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
} from "./typography.js";
