import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { ComponentProps, ComponentRef, ReactNode } from "react";
import { cloneElement, forwardRef, isValidElement } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Icon } from "../icon/icon.js";
import { Slot } from "../slot/index.js";

/**
 * The breadcrumb landmark. Renders a `<nav>` with a default
 * `aria-label="Breadcrumb"` per the WAI-ARIA breadcrumb pattern — pass your
 * own `aria-label` to override it (e.g. for localization or when a page has
 * multiple breadcrumb trails). Carries no visual styling of its own.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"nav">, ComponentProps<"nav"> & WithAsChild & WithDataSlot>(
	({ asChild, children, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "nav";

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "breadcrumb")}
				aria-label="Breadcrumb"
				{...props}
			>
				{children}
			</Comp>
		);
	},
);
Root.displayName = "Breadcrumb";

/**
 * The ordered list of crumbs. Renders an `<ol>` — an **ordered** list, because
 * the order of the items is the hierarchy, from the root to the current page.
 * Lays crumbs out inline with wrapping and muted, small text.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const List = forwardRef<ComponentRef<"ol">, ComponentProps<"ol"> & WithAsChild & WithDataSlot>(
	({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "ol";

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "breadcrumb-list")}
				className={cx("text-muted flex flex-wrap items-center gap-1.5 text-sm", className)}
				{...props}
			>
				{children}
			</Comp>
		);
	},
);
List.displayName = "BreadcrumbList";

/**
 * A single crumb. Renders an `<li>` (`role="listitem"`) that lays out its
 * content — a `Breadcrumb.Link` or `Breadcrumb.Page` — inline.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const Item = forwardRef<ComponentRef<"li">, ComponentProps<"li"> & WithAsChild & WithDataSlot>(
	({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "li";

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "breadcrumb-item")}
				className={cx("inline-flex items-center gap-1.5", className)}
				{...props}
			>
				{children}
			</Comp>
		);
	},
);
Item.displayName = "BreadcrumbItem";

/**
 * A link to an ancestor page in the hierarchy. Renders an `<a>` by default;
 * the component is router-agnostic — use `asChild` to compose the styling
 * onto your app router's link (e.g. react-router's `<Link>`) so client-side
 * navigation kicks in.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 *
 * @example
 * ```tsx
 * <Breadcrumb.Link asChild>
 * 	<Link to={href("/endpoints")}>Endpoints</Link>
 * </Breadcrumb.Link>
 * ```
 */
const Link = forwardRef<ComponentRef<"a">, ComponentProps<"a"> & WithAsChild & WithDataSlot>(
	({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "a";

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "breadcrumb-link")}
				className={cx("hover:text-strong transition-colors", className)}
				{...props}
			>
				{children}
			</Comp>
		);
	},
);
Link.displayName = "BreadcrumbLink";

/**
 * The current page — the last crumb in the trail. Renders a `<span>` (not a
 * link; the user is already here) with `aria-current="page"`. The ARIA is the
 * part's whole contract, so `aria-current` is always emitted and is not
 * overridable via props.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const Page = forwardRef<ComponentRef<"span">, ComponentProps<"span"> & WithAsChild & WithDataSlot>(
	({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "span";
		// Slot merges child props over slot props, so with asChild the enforced
		// ARIA must be cloned onto the child element itself to stay un-overridable.
		const content =
			asChild && isValidElement<ComponentProps<"span">>(children)
				? cloneElement(children, { "aria-current": "page" })
				: children;

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "breadcrumb-page")}
				className={cx("text-strong", className)}
				{...props}
				aria-current="page"
			>
				{content}
			</Comp>
		);
	},
);
Page.displayName = "BreadcrumbPage";

/**
 * The props for `Breadcrumb.Separator`. When `asChild` is set, `children` is
 * required: the child element is what gets rendered, so an `asChild` separator
 * without children would clone the default caret icon into the list — invalid
 * `<ol>` content. The union makes that misuse a compile error.
 */
type BreadcrumbSeparatorProps = Omit<ComponentProps<"li">, "children"> &
	(
		| {
				asChild: true;
				children: ReactNode;
		  }
		| {
				asChild?: false | undefined;
				children?: ReactNode;
		  }
	);

/**
 * A purely visual divider between crumbs, hidden from assistive technology.
 * Renders an `<li>` with `role="presentation"` and `aria-hidden="true"` — a
 * listitem sibling of `Breadcrumb.Item` elements per the APG breadcrumb
 * pattern, so it never counts as a crumb. Children default to a size-3.5
 * caret icon (`<Icon svg={<CaretRightIcon />} className="size-3.5" />`); pass
 * your own children (e.g. a slash) to replace it. With `asChild`, children
 * are required — the child element is what renders.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const Separator = forwardRef<ComponentRef<"li">, BreadcrumbSeparatorProps & WithDataSlot>(
	({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "li";
		// Slot merges child props over slot props, so with asChild the enforced
		// ARIA must be cloned onto the child element itself to stay un-overridable.
		const content =
			asChild && isValidElement<ComponentProps<"li">>(children)
				? cloneElement(children, { role: "presentation", "aria-hidden": "true" })
				: (children ?? <Icon svg={<CaretRightIcon />} className="size-3.5" />);

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "breadcrumb-separator")}
				className={className}
				{...props}
				role="presentation"
				aria-hidden="true"
			>
				{content}
			</Comp>
		);
	},
);
Separator.displayName = "BreadcrumbSeparator";

/**
 * Compound component for WAI-ARIA breadcrumb navigation — the path from a
 * root to the current page as an ordered list of links inside a labeled
 * `<nav>` landmark. Router-agnostic: compose `Breadcrumb.Link` onto your app
 * router's link via `asChild`.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * Composition:
 * ```
 * Breadcrumb.Root
 * └── Breadcrumb.List
 *     ├── Breadcrumb.Item
 *     │   └── Breadcrumb.Link
 *     ├── Breadcrumb.Separator
 *     └── Breadcrumb.Item
 *         └── Breadcrumb.Page
 * ```
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const Breadcrumb = {
	/**
	 * The breadcrumb landmark. Renders a `<nav>` with a default
	 * `aria-label="Breadcrumb"` — pass your own `aria-label` to override it.
	 * Carries no visual styling of its own.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
	 *
	 * @example
	 * ```tsx
	 * <Breadcrumb.Root>
	 * 	<Breadcrumb.List>
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
	 * 		</Breadcrumb.Item>
	 * 	</Breadcrumb.List>
	 * </Breadcrumb.Root>
	 * ```
	 */
	Root,
	/**
	 * The ordered list of crumbs. Renders an `<ol>` — the order of the items
	 * is the hierarchy, from the root to the current page.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
	 *
	 * @example
	 * ```tsx
	 * <Breadcrumb.Root>
	 * 	<Breadcrumb.List>
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
	 * 		</Breadcrumb.Item>
	 * 	</Breadcrumb.List>
	 * </Breadcrumb.Root>
	 * ```
	 */
	List,
	/**
	 * A single crumb. Renders an `<li>` containing a `Breadcrumb.Link` or
	 * `Breadcrumb.Page`.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
	 *
	 * @example
	 * ```tsx
	 * <Breadcrumb.Root>
	 * 	<Breadcrumb.List>
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
	 * 		</Breadcrumb.Item>
	 * 	</Breadcrumb.List>
	 * </Breadcrumb.Root>
	 * ```
	 */
	Item,
	/**
	 * A link to an ancestor page. Renders an `<a>` by default; use `asChild`
	 * to compose onto your app router's link (e.g. react-router's `<Link>`).
	 *
	 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
	 *
	 * @example
	 * ```tsx
	 * <Breadcrumb.Root>
	 * 	<Breadcrumb.List>
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
	 * 		</Breadcrumb.Item>
	 * 	</Breadcrumb.List>
	 * </Breadcrumb.Root>
	 * ```
	 */
	Link,
	/**
	 * The current page — the last crumb. Renders a `<span>` (not a link) with
	 * `aria-current="page"`; the ARIA is the part's whole contract and is not
	 * overridable.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
	 *
	 * @example
	 * ```tsx
	 * <Breadcrumb.Root>
	 * 	<Breadcrumb.List>
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
	 * 		</Breadcrumb.Item>
	 * 	</Breadcrumb.List>
	 * </Breadcrumb.Root>
	 * ```
	 */
	Page,
	/**
	 * A purely visual divider between crumbs, hidden from assistive
	 * technology (`role="presentation"` + `aria-hidden`). Children default to
	 * a caret icon; pass your own (e.g. a slash) to replace it.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
	 *
	 * @example
	 * ```tsx
	 * <Breadcrumb.Root>
	 * 	<Breadcrumb.List>
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
	 * 		</Breadcrumb.Item>
	 * 		<Breadcrumb.Separator />
	 * 		<Breadcrumb.Item>
	 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
	 * 		</Breadcrumb.Item>
	 * 	</Breadcrumb.List>
	 * </Breadcrumb.Root>
	 * ```
	 */
	Separator,
} as const;

export {
	//,
	Breadcrumb,
};
