import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

type TypographyRootProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * A container that styles the headings, paragraphs, and lists directly inside it with the
 * type-role tokens. Use it for HTML that no one maps to components, such as CMS or MDX output.
 * It renders a `div` with the `type-prose` utility; pass `asChild` to render an `article`.
 *
 * The container styles only its direct children, so a component inside it keeps its own
 * styles. The prose styles have no specificity, so a class on a child wins.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyroot
 *
 * @example
 * ```tsx
 * <Typography.Root>
 *   <Typography.H1>Endpoints</Typography.H1>
 *   <Typography.P className="text-lead">Each endpoint gets a public URL.</Typography.P>
 *   <Typography.H2>Traffic policy</Typography.H2>
 *   <Typography.P>Attach a traffic policy to filter, route, or rewrite requests.</Typography.P>
 * </Typography.Root>
 *
 * <Typography.Root asChild>
 *   <article dangerouslySetInnerHTML={{ __html: post.html }} />
 * </Typography.Root>
 * ```
 */
const Root = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: TypographyRootProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "typography")}
			className={cx("type-prose", className)}
			{...props}
		/>
	);
};

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
 * A level-one heading in the `text-heading-1` type role. Renders an `h1`. To give it the look
 * of another level, pass that role in `className`, such as `text-heading-3`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh1
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
const H1 = (props: TypographyHeadingProps) => (
	<Heading element="h1" slotName="typography-h1" roleClassName="text-heading-1" {...props} />
);

/**
 * A level-two heading in the `text-heading-2` type role. Renders an `h2`. To give it the look
 * of another level, pass that role in `className`, such as `text-heading-4`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh2
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
const H2 = (props: TypographyHeadingProps) => (
	<Heading element="h2" slotName="typography-h2" roleClassName="text-heading-2" {...props} />
);

/**
 * A level-three heading in the `text-heading-3` type role. Renders an `h3`. To give it the
 * look of another level, pass that role in `className`, such as `text-heading-4`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh3
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
const H3 = (props: TypographyHeadingProps) => (
	<Heading element="h3" slotName="typography-h3" roleClassName="text-heading-3" {...props} />
);

/**
 * A level-four heading in the `text-heading-4` type role. Renders an `h4`. To give it the look
 * of another level, pass that role in `className`, such as `text-heading-5`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh4
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
const H4 = (props: TypographyHeadingProps) => (
	<Heading element="h4" slotName="typography-h4" roleClassName="text-heading-4" {...props} />
);

/**
 * A level-five heading in the `text-heading-5` type role. Renders an `h5`. To give it the look
 * of another level, pass that role in `className`, such as `text-heading-4`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh5
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
const H5 = (props: TypographyHeadingProps) => (
	<Heading element="h5" slotName="typography-h5" roleClassName="text-heading-5" {...props} />
);

/**
 * A level-six heading in the `text-heading-6` type role, in uppercase. Renders an `h6`. To
 * give it the look of another level, pass that role in `className`, such as `text-heading-5`.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyh6
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
const H6 = (props: TypographyHeadingProps) => (
	<Heading
		element="h6"
		slotName="typography-h6"
		roleClassName="text-heading-6 uppercase"
		{...props}
	/>
);

type TypographyParagraphProps = ComponentProps<"p"> & WithAsChild & WithDataSlot;

/**
 * A paragraph in the `text-paragraph` type role and the body text color. Renders a `p`. Pass
 * `text-lead` in `className` for the larger lead paragraph under a page title.
 *
 * @see https://mantle.ngrok.com/components/data-display/typography#typographyp
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
			className={cx("text-paragraph text-body text-pretty wrap-break-word", className)}
			{...props}
		/>
	);
};

export {
	//,
	Root,
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
	TypographyRootProps,
};
