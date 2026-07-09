import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Main } from "../main/main.js";
import { Slot } from "../slot/index.js";

/**
 * The outer frame of a centered page flow. Renders a `<div>` with
 * `flex min-h-full flex-col` so it fills its nearest sized ancestor and stacks
 * `CenteredLayout.Body` (which grows) above `CenteredLayout.Footer` (which is
 * pinned). Consumers whose host requires an exact height can merge `h-full`
 * via `className` — `cx` is tailwind-merge-backed, so the override is
 * deterministic.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <SkipToMainLink />
 *   <CenteredLayout.Body>
 *     <a href="https://ngrok.com">
 *       <NgrokWordmarkIcon className="h-auto w-24" />
 *     </a>
 *     <CenteredLayout.Content>
 *       <SignInCard />
 *     </CenteredLayout.Content>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher />
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const Root = ({ asChild, children, className, ...props }: ComponentProps<"div"> & WithAsChild) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="centered-layout"
			className={cx("flex min-h-full flex-col", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Root.displayName = "CenteredLayout";

/**
 * The growing, centered region of the layout. Renders a `<div>` with
 * `flex flex-1 flex-col items-center justify-center gap-6 py-4` so its
 * children are centered in the space left over by `CenteredLayout.Footer`.
 *
 * By convention the brand mark (a fully-styled logo/wordmark anchor) is the
 * **first child** of `Body` — there is deliberately no `Logo` part because it
 * would own nothing: vertical spacing comes from `Body`'s `gap-6`, and the
 * mark arrives as already-styled JSX.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <SkipToMainLink />
 *   <CenteredLayout.Body>
 *     <a href="https://ngrok.com">
 *       <NgrokWordmarkIcon className="h-auto w-24" />
 *     </a>
 *     <CenteredLayout.Content>
 *       <SignInCard />
 *     </CenteredLayout.Content>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher />
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const Body = ({ asChild, children, className, ...props }: ComponentProps<"div"> & WithAsChild) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="centered-layout-body"
			className={cx("flex flex-1 flex-col items-center justify-center gap-6 py-4", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Body.displayName = "CenteredLayoutBody";

/**
 * Props for `CenteredLayout.Content` — the `<main>` element's props plus the
 * `renderMain` landmark switch.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <SkipToMainLink />
 *   <CenteredLayout.Body>
 *     <a href="https://ngrok.com">
 *       <NgrokWordmarkIcon className="h-auto w-24" />
 *     </a>
 *     <CenteredLayout.Content>
 *       <SignInCard />
 *     </CenteredLayout.Content>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher />
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
type CenteredLayoutContentProps = ComponentProps<"main"> & {
	/**
	 * Whether to render the mantle `Main` landmark (`<main id="main" tabIndex={-1}>`)
	 * as the content element. Exactly one element in a document may be the Main
	 * landmark — pass `false` when this layout is composed inside a shell that
	 * already renders one, and a plain `<div>` is rendered instead.
	 *
	 * @default true
	 */
	renderMain?: boolean;
};

/**
 * The primary content slot of the layout. By default it renders the mantle
 * `Main` landmark — a `<main id="main" tabIndex={-1} data-slot="main">` that a
 * `SkipToMainLink` can focus. Exactly one element in a document may be the
 * Main landmark: pass `renderMain={false}` when composing inside a shell that
 * already renders one, and a plain `<div data-slot="centered-layout-content">`
 * is rendered instead.
 *
 * This part deliberately does not support `asChild`: polymorphism is handled
 * by the `renderMain` contract, and `asChild` would clone `Main`'s landmark
 * props onto arbitrary children.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <SkipToMainLink />
 *   <CenteredLayout.Body>
 *     <a href="https://ngrok.com">
 *       <NgrokWordmarkIcon className="h-auto w-24" />
 *     </a>
 *     <CenteredLayout.Content>
 *       <SignInCard />
 *     </CenteredLayout.Content>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher />
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const Content = ({ className, ref, renderMain = true, ...props }: CenteredLayoutContentProps) => {
	if (renderMain) {
		return <Main {...props} className={className} ref={ref} />;
	}

	return (
		<div
			data-slot="centered-layout-content"
			className={className}
			{...props}
			// Why: props are typed against `<main>`, whose object-ref form
			// (`RefObject<HTMLElement>`) is not assignable to the div's
			// `RefObject<HTMLDivElement>` (mutable `current` is invariant). Function
			// refs ARE assignable, so they pass through untouched — preserving the
			// consumer's stable ref identity across renders (no detach/re-attach
			// churn); only object refs go through an adapter.
			ref={
				typeof ref === "function"
					? ref
					: (node) => {
							if (ref != null) {
								ref.current = node;
							}
						}
			}
		/>
	);
};
Content.displayName = "CenteredLayoutContent";

/**
 * A pinned utility strip at the bottom of the layout — a theme switcher,
 * legal links, and similar page furniture. Renders a semantic `<footer>`
 * (a page-level frame, so it is exposed as a `contentinfo` landmark — unlike
 * `Card.Footer`'s generic div) with `flex shrink-0 items-center px-4 py-4`.
 * It sits **outside** the centered `flex-1` region — which is exactly why
 * `Body` exists as a separate part. Optional: omitting it is fine.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <SkipToMainLink />
 *   <CenteredLayout.Body>
 *     <a href="https://ngrok.com">
 *       <NgrokWordmarkIcon className="h-auto w-24" />
 *     </a>
 *     <CenteredLayout.Content>
 *       <SignInCard />
 *     </CenteredLayout.Content>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher />
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const Footer = ({
	asChild,
	children,
	className,
	...props
}: ComponentProps<"footer"> & WithAsChild) => {
	const Comp = asChild ? Slot : "footer";

	return (
		<Comp
			data-slot="centered-layout-footer"
			className={cx("flex shrink-0 items-center px-4 py-4", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Footer.displayName = "CenteredLayoutFooter";

/**
 * A viewport-filling centered page flow for sign-in, sign-up, onboarding,
 * 404, and other focused full-page states. It owns structure only — the
 * flex/overflow skeleton, region ordering, and the Main-landmark wiring.
 * App state (routing, sessions) never enters it; links and brand marks
 * arrive as composed JSX.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * Composition:
 * ```
 * CenteredLayout.Root
 * ├── CenteredLayout.Body
 * │   └── CenteredLayout.Content
 * └── CenteredLayout.Footer
 * ```
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <SkipToMainLink />
 *   <CenteredLayout.Body>
 *     <a href="https://ngrok.com">
 *       <NgrokWordmarkIcon className="h-auto w-24" />
 *     </a>
 *     <CenteredLayout.Content>
 *       <SignInCard />
 *     </CenteredLayout.Content>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher />
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const CenteredLayout = {
	/**
	 * The outer frame of a centered page flow. Fills its nearest sized ancestor
	 * (`min-h-full`) and stacks `Body` (which grows) above `Footer` (pinned).
	 * Merge `h-full` via `className` when the host requires an exact height.
	 *
	 * @see https://mantle.ngrok.com/layouts/centered-layout
	 *
	 * @example
	 * ```tsx
	 * <CenteredLayout.Root>
	 *   <SkipToMainLink />
	 *   <CenteredLayout.Body>
	 *     <a href="https://ngrok.com">
	 *       <NgrokWordmarkIcon className="h-auto w-24" />
	 *     </a>
	 *     <CenteredLayout.Content>
	 *       <SignInCard />
	 *     </CenteredLayout.Content>
	 *   </CenteredLayout.Body>
	 *   <CenteredLayout.Footer>
	 *     <ThemeSwitcher />
	 *   </CenteredLayout.Footer>
	 * </CenteredLayout.Root>
	 * ```
	 */
	Root,
	/**
	 * The growing, centered region of the layout. By convention the brand mark
	 * (a fully-styled logo/wordmark anchor) is its **first child** — spacing
	 * comes from `Body`'s `gap-6`, so no dedicated `Logo` part exists.
	 *
	 * @see https://mantle.ngrok.com/layouts/centered-layout
	 *
	 * @example
	 * ```tsx
	 * <CenteredLayout.Root>
	 *   <SkipToMainLink />
	 *   <CenteredLayout.Body>
	 *     <a href="https://ngrok.com">
	 *       <NgrokWordmarkIcon className="h-auto w-24" />
	 *     </a>
	 *     <CenteredLayout.Content>
	 *       <SignInCard />
	 *     </CenteredLayout.Content>
	 *   </CenteredLayout.Body>
	 *   <CenteredLayout.Footer>
	 *     <ThemeSwitcher />
	 *   </CenteredLayout.Footer>
	 * </CenteredLayout.Root>
	 * ```
	 */
	Body,
	/**
	 * The primary content slot. Renders the mantle `Main` landmark
	 * (`<main id="main" tabIndex={-1}>`) by default; pass `renderMain={false}`
	 * inside a shell that already owns the document's Main landmark to render a
	 * plain `<div>` instead. Exactly one element in a document may be the Main
	 * landmark.
	 *
	 * @see https://mantle.ngrok.com/layouts/centered-layout
	 *
	 * @example
	 * ```tsx
	 * <CenteredLayout.Root>
	 *   <SkipToMainLink />
	 *   <CenteredLayout.Body>
	 *     <a href="https://ngrok.com">
	 *       <NgrokWordmarkIcon className="h-auto w-24" />
	 *     </a>
	 *     <CenteredLayout.Content>
	 *       <SignInCard />
	 *     </CenteredLayout.Content>
	 *   </CenteredLayout.Body>
	 *   <CenteredLayout.Footer>
	 *     <ThemeSwitcher />
	 *   </CenteredLayout.Footer>
	 * </CenteredLayout.Root>
	 * ```
	 */
	Content,
	/**
	 * A pinned utility strip (theme switcher, legal links) rendered as a
	 * semantic `<footer>` (`contentinfo` landmark) outside the centered
	 * `flex-1` region. Optional — omitting it is fine.
	 *
	 * @see https://mantle.ngrok.com/layouts/centered-layout
	 *
	 * @example
	 * ```tsx
	 * <CenteredLayout.Root>
	 *   <SkipToMainLink />
	 *   <CenteredLayout.Body>
	 *     <a href="https://ngrok.com">
	 *       <NgrokWordmarkIcon className="h-auto w-24" />
	 *     </a>
	 *     <CenteredLayout.Content>
	 *       <SignInCard />
	 *     </CenteredLayout.Content>
	 *   </CenteredLayout.Body>
	 *   <CenteredLayout.Footer>
	 *     <ThemeSwitcher />
	 *   </CenteredLayout.Footer>
	 * </CenteredLayout.Root>
	 * ```
	 */
	Footer,
} as const;

export {
	//,
	CenteredLayout,
};

export type {
	//,
	CenteredLayoutContentProps,
};
