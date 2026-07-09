import type { ComponentProps, ComponentRef, HTMLAttributes } from "react";
import { forwardRef } from "react";
import type { WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type CardProps = ComponentProps<"div"> & WithAsChild;

/**
 * A container that can be used to display content in a box resembling a
 * physical card. The root component of the all Card components.
 *
 * @see https://mantle.ngrok.com/components/card#cardroot
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
const Root = forwardRef<ComponentRef<"div">, CardProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
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
	},
);
Root.displayName = "Card";

/**
 * The main content of a card. Usually composed as a direct child of a `Card` component.
 *
 * @see https://mantle.ngrok.com/components/card#cardbody
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
const Body = forwardRef<ComponentRef<"div">, CardProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
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
	},
);
Body.displayName = "CardBody";

/**
 * The footer container of a card. Usually composed as a direct child of a `Card` component.
 *
 * @see https://mantle.ngrok.com/components/card#cardfooter
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
const Footer = forwardRef<ComponentRef<"div">, CardProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
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
	},
);
Footer.displayName = "CardFooter";

/**
 * The header container of a card. Usually composed as a direct child of a `Card` component.
 *
 * @see https://mantle.ngrok.com/components/card#cardheader
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
const Header = forwardRef<ComponentRef<"div">, CardProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
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
	},
);
Header.displayName = "CardHeader";

type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & WithAsChild;

/**
 * The title of a card. Usually composed as a direct child of a `Card.Header`
 * component.
 * Renders as an `h3` element by default, but can be changed to any other
 * element by using the `asChild` prop. It is preferred to use a heading element
 * (h1-h6) for accessibility reasons.
 *
 * @see https://mantle.ngrok.com/components/card#cardtitle
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
const Title = forwardRef<HTMLHeadingElement, CardTitleProps>(
	({ className, asChild, ...props }, ref) => {
		const Comp = asChild ? Slot : "h3";
		return (
			<Comp
				ref={ref}
				data-slot="card-title"
				className={cx("text-strong text-base font-medium", className)}
				{...props}
			/>
		);
	},
);
Title.displayName = "CardTitle";

/**
 * A container that can be used to display content in a box resembling a
 * physical card.
 *
 * @see https://mantle.ngrok.com/components/card
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
	 * A container that can be used to display content in a box resembling a physical card.
	 *
	 * @see https://mantle.ngrok.com/components/card#cardroot
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
	 * @see https://mantle.ngrok.com/components/card#cardbody
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
	 * The footer container of a card.
	 *
	 * @see https://mantle.ngrok.com/components/card#cardfooter
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
	 * The header container of a card.
	 *
	 * @see https://mantle.ngrok.com/components/card#cardheader
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
	 * The title of a card.
	 *
	 * @see https://mantle.ngrok.com/components/card#cardtitle
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
