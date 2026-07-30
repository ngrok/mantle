import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type CardProps = ComponentProps<"div"> & WithAsChild;

/**
 * A container that displays content in a box resembling a physical card. The
 * outermost part — every other `Card` part nests inside it.
 *
 * @see https://mantle.ngrok.com/components/structure/card#cardroot
 *
 * @example
 * ```tsx
 * <Card.Root>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 * </Card.Root>
 *
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>Card Title Here</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <p>Card footer</p>
 *   </Card.Footer>
 * </Card.Root>
 * ```
 */
const Root = ({ asChild = false, className, children, ref, ...rest }: CardProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="card"
			className={cx("border-card bg-card relative rounded-md border", className)}
			{...rest}
		>
			{children}
		</Component>
	);
};

/**
 * The main content of a card. Usually composed as a direct child of a `Card` component.
 *
 * @see https://mantle.ngrok.com/components/structure/card#cardbody
 *
 * @example
 * ```tsx
 * <Card.Root>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 * </Card.Root>
 *
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>Card Title Here</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <p>Card footer</p>
 *   </Card.Footer>
 * </Card.Root>
 * ```
 */
const Body = ({ asChild = false, className, children, ref, ...rest }: CardProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="card-body"
			className={cx("p-6 border-t border-card-muted first:border-t-0", className)}
			{...rest}
		>
			{children}
		</Component>
	);
};

/**
 * The band below `Card.Body`. Unless it is the first child, it draws a top border
 * dividing the two. Pass it as a direct child of `Card.Root`.
 *
 * @see https://mantle.ngrok.com/components/structure/card#cardfooter
 *
 * @example
 * ```tsx
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>Card Title Here</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <p>Card footer</p>
 *   </Card.Footer>
 * </Card.Root>
 * ```
 */
const Footer = ({ asChild = false, className, children, ref, ...rest }: CardProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="card-footer"
			className={cx("px-6 py-3 border-t border-card-muted first:border-t-0", className)}
			{...rest}
		>
			{children}
		</Component>
	);
};

/**
 * The band above `Card.Body` that holds `Card.Title`. Pass it as a direct child
 * of `Card.Root`.
 *
 * @see https://mantle.ngrok.com/components/structure/card#cardheader
 *
 * @example
 * ```tsx
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>Card Title Here</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <p>Card footer</p>
 *   </Card.Footer>
 * </Card.Root>
 * ```
 */
const Header = ({ asChild = false, className, children, ref, ...rest }: CardProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="card-header"
			className={cx("px-6 py-3 border-t border-card-muted first:border-t-0", className)}
			{...rest}
		>
			{children}
		</Component>
	);
};

type CardTitleProps = ComponentProps<"h3"> & WithAsChild;

/**
 * The heading inside `Card.Header`. Renders an `h3` by default — pass `asChild`
 * to fit the surrounding document outline. Keep it a heading element
 * (`h1`-`h6`) for accessibility.
 *
 * @see https://mantle.ngrok.com/components/structure/card#cardtitle
 *
 * @example
 * ```tsx
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>Card Title Here</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <p>Card footer</p>
 *   </Card.Footer>
 * </Card.Root>
 * ```
 */
const Title = ({ className, asChild, ref, ...props }: CardTitleProps) => {
	const Comp = asChild ? Slot : "h3";
	return (
		<Comp
			ref={ref}
			data-slot="card-title"
			className={cx("text-strong text-base font-medium", className)}
			{...props}
		/>
	);
};

/**
 * A container that displays content in a box resembling a physical card.
 *
 * @see https://mantle.ngrok.com/components/structure/card
 *
 * @example
 * Composition:
 * ```
 * Card.Root
 * ├── Card.Header
 * │   └── Card.Title
 * ├── Card.Body
 * └── Card.Footer
 * ```
 *
 * @example
 * ```tsx
 * <Card.Root>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 * </Card.Root>
 *
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>Card Title Here</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <p>Card footer</p>
 *   </Card.Footer>
 * </Card.Root>
 * ```
 */
const Card = {
	/**
	 * A container that displays content in a box resembling a physical card.
	 *
	 * @see https://mantle.ngrok.com/components/structure/card#cardroot
	 *
	 * @example
	 * ```tsx
	 * <Card.Root>
	 *   <Card.Body>
	 *     <p>Laborum in aute officia adipisicing elit velit.</p>
	 *   </Card.Body>
	 * </Card.Root>
	 * ```
	 */
	Root,
	/**
	 * The main content of a card.
	 *
	 * @see https://mantle.ngrok.com/components/structure/card#cardbody
	 *
	 * @example
	 * ```tsx
	 * <Card.Root>
	 *   <Card.Body>
	 *     <p>Laborum in aute officia adipisicing elit velit.</p>
	 *   </Card.Body>
	 * </Card.Root>
	 * ```
	 */
	Body,
	/**
	 * The band below `Card.Body`, divided from it by a top border.
	 *
	 * @see https://mantle.ngrok.com/components/structure/card#cardfooter
	 *
	 * @example
	 * ```tsx
	 * <Card.Root>
	 *   <Card.Header>
	 *     <Card.Title>Card Title Here</Card.Title>
	 *   </Card.Header>
	 *   <Card.Body>
	 *     <p>Laborum in aute officia adipisicing elit velit.</p>
	 *   </Card.Body>
	 *   <Card.Footer>
	 *     <p>Card footer</p>
	 *   </Card.Footer>
	 * </Card.Root>
	 * ```
	 */
	Footer,
	/**
	 * The band above `Card.Body` that holds `Card.Title`.
	 *
	 * @see https://mantle.ngrok.com/components/structure/card#cardheader
	 *
	 * @example
	 * ```tsx
	 * <Card.Root>
	 *   <Card.Header>
	 *     <Card.Title>Card Title Here</Card.Title>
	 *   </Card.Header>
	 *   <Card.Body>
	 *     <p>Laborum in aute officia adipisicing elit velit.</p>
	 *   </Card.Body>
	 *   <Card.Footer>
	 *     <p>Card footer</p>
	 *   </Card.Footer>
	 * </Card.Root>
	 * ```
	 */
	Header,
	/**
	 * The heading inside `Card.Header`. Renders an `h3` by default.
	 *
	 * @see https://mantle.ngrok.com/components/structure/card#cardtitle
	 *
	 * @example
	 * ```tsx
	 * <Card.Root>
	 *   <Card.Header>
	 *     <Card.Title>Card Title Here</Card.Title>
	 *   </Card.Header>
	 *   <Card.Body>
	 *     <p>Laborum in aute officia adipisicing elit velit.</p>
	 *   </Card.Body>
	 *   <Card.Footer>
	 *     <p>Card footer</p>
	 *   </Card.Footer>
	 * </Card.Root>
	 * ```
	 */
	Title,
} as const;

export {
	//,
	Card,
};

export type {
	//,
	CardProps,
	CardTitleProps,
};
