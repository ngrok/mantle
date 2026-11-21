// Why "use no memo": these parts hold no state, and compiled output imports a cache hook. That
// hook makes the build mark the chunk "use client", so a server component could not render them.
"use no memo";

import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

type TypographyHeadingProps = ComponentProps<"h1"> & WithAsChild & WithDataSlot;

type HeadingProps = TypographyHeadingProps & {
	/** The heading element to render. */
	element: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
	/** The part's own slot name. */
	slotName: string;
	/** The part's type-role classes. Each part passes a literal, so the Tailwind source scan finds it. */
	roleClassName: string;
};

/**
 * The render body that every heading part shares. Why `wrap-anywhere`: one long word, such as
 * `SandboxedOnClick`, is wider than a 320px screen, and `break-word` does not shrink a flex or
 * `w-fit` parent.
 */
const Heading = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	element,
	roleClassName,
	slotName,
	...props
}: HeadingProps) => {
	const Component = asChild ? Slot : element;

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, slotName)}
			className={cx(
				"font-heading text-strong text-balance wrap-anywhere",
				roleClassName,
				className,
			)}
			{...props}
		/>
	);
};

/**
 * A level-one heading, in the `text-heading-5xl` step by default. Renders an `h1`.
 * To set another size, pass a heading step in `className`, such as `text-heading-2xl`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh1
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
const H1 = (props: TypographyHeadingProps) => (
	<Heading element="h1" slotName="typography-h1" roleClassName="text-heading-5xl" {...props} />
);

/**
 * A level-two heading, in the `text-heading-3xl` step by default. Renders an `h2`.
 * To set another size, pass a heading step in `className`, such as `text-heading-xl`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh2
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
const H2 = (props: TypographyHeadingProps) => (
	<Heading element="h2" slotName="typography-h2" roleClassName="text-heading-3xl" {...props} />
);

/**
 * A level-three heading, in the `text-heading-2xl` step by default. Renders an `h3`.
 * To set another size, pass a heading step in `className`, such as `text-heading-xl`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh3
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
const H3 = (props: TypographyHeadingProps) => (
	<Heading element="h3" slotName="typography-h3" roleClassName="text-heading-2xl" {...props} />
);

/**
 * A level-four heading, in the `text-heading-xl` step by default. Renders an `h4`.
 * To set another size, pass a heading step in `className`, such as `text-heading-base`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh4
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
const H4 = (props: TypographyHeadingProps) => (
	<Heading element="h4" slotName="typography-h4" roleClassName="text-heading-xl" {...props} />
);

/**
 * A level-five heading, in the `text-heading-base` step by default. Renders an `h5`.
 * To set another size, pass a heading step in `className`, such as `text-heading-xl`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh5
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
const H5 = (props: TypographyHeadingProps) => (
	<Heading element="h5" slotName="typography-h5" roleClassName="text-heading-base" {...props} />
);

/**
 * A level-six heading, in the `text-heading-xs` step by default, in uppercase with wide letter spacing. Renders an `h6`.
 * To set another size, pass a heading step in `className`, such as `text-heading-sm`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh6
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
const H6 = (props: TypographyHeadingProps) => (
	<Heading
		element="h6"
		slotName="typography-h6"
		roleClassName="text-heading-xs uppercase tracking-widest"
		{...props}
	/>
);

type TypographyParagraphProps = ComponentProps<"p"> & WithAsChild & WithDataSlot;

/**
 * A paragraph in the `text-paragraph-base` step and the body text color. Renders a `p`. Pass
 * `text-paragraph-lg` in `className` for the lead paragraph under a page title, or
 * `text-paragraph-sm` for dense copy.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyp
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
const P = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: TypographyParagraphProps) => {
	const Component = asChild ? Slot : "p";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "typography-p")}
			className={cx("text-paragraph-base text-body text-pretty wrap-anywhere", className)}
			{...props}
		/>
	);
};

export {
	//,
	H1,
	H2,
	H3,
	H4,
	H5,
	H6,
	P,
};

export type {
	//,
	TypographyHeadingProps,
	TypographyParagraphProps,
};
