import type { ReactNode } from "react";

/**
 * Utility type for adding the optional `asChild` boolean prop to a component.
 */
type WithAsChild = {
	/**
	 * Use the `asChild` prop to compose component functionality onto alternative
	 * element types or your own React components.
	 *
	 * When `asChild` is set to `true`, mantle will not render a default DOM
	 * element, instead cloning the part's child and passing it the props and
	 * behavior required to make it functional.
	 *
	 * `asChild` can be used as deeply as you need to. This means it is a great way
	 * to compose multiple primitive's behavior together.
	 *
	 * @see https://mantle.ngrok.com/components/primitives/slot#usage-with-aschild
	 */
	asChild?: boolean;
};

/**
 * Utility type for adding the optional `asChild` boolean prop to a component
 * that is self-closing.
 * This is useful for components that do not have children, but still need to
 * support the `asChild` prop.
 */
type SelfClosingWithAsChild =
	| {
			/**
			 * Use the `asChild` prop to compose component functionality onto alternative
			 * element types or your own React components.
			 *
			 * When `asChild` is set to `true`, mantle will not render a default DOM
			 * element, instead cloning the part's child and passing it the props and
			 * behavior required to make it functional.
			 *
			 * `asChild` can be used as deeply as you need to. This means it is a great way
			 * to compose multiple primitive's behavior together.
			 *
			 * @see https://mantle.ngrok.com/components/primitives/slot#usage-with-aschild
			 */
			asChild: true;
			children: ReactNode;
	  }
	| {
			asChild?: false | undefined;
			children?: undefined;
	  };

export type {
	//,
	WithAsChild,
	SelfClosingWithAsChild,
};
