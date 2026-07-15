import type { ComponentProps, ComponentRef } from "react";
import { forwardRef } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The outer frame of a centered page flow. Renders a `<div>` with
 * `flex min-h-full flex-col` so it fills its nearest sized ancestor and stacks
 * `CenteredLayout.Header` (pinned top), `CenteredLayout.Body` (which grows),
 * and `CenteredLayout.Footer` (pinned bottom). Consumers whose host requires
 * an exact height can merge `h-full` via `className` — `cx` is
 * tailwind-merge-backed, so the override is deterministic.
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
 *     <Main>
 *       <SignInCard />
 *     </Main>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher.Root>
 *       <ThemeSwitcher.Trigger />
 *       <ThemeSwitcher.Content />
 *     </ThemeSwitcher.Root>
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild & WithDataSlot>(
	({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "div";

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "centered-layout")}
				className={cx("flex min-h-full flex-col", className)}
				{...props}
			>
				{children}
			</Comp>
		);
	},
);
Root.displayName = "CenteredLayout";

/**
 * A utility strip at the top of the layout — an account chip, a close/dismiss
 * button, and similar page furniture for focused flows (checkout, plan
 * pickers). Renders a semantic `<header>` (a page-level frame, so it is
 * exposed as a `banner` landmark when not nested inside a sectioning element)
 * with `flex shrink-0 items-center px-4 py-4`. It sits **outside** the
 * centered `flex-1` region, mirroring `CenteredLayout.Footer`. Optional:
 * omitting it is fine.
 *
 * To pin it to the window while the page scrolls (e.g. a close button that
 * stays reachable), merge `sticky top-0 z-10` via `className` — prefer
 * `sticky` over `fixed`, which removes the strip from flow and underlaps the
 * content below it.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <CenteredLayout.Header className="sticky top-0 z-10 justify-between">
 *     <AccountChip />
 *     <IconButton appearance="ghost" intent="neutral" type="button" label="Close" icon={<XIcon />} />
 *   </CenteredLayout.Header>
 *   <CenteredLayout.Body>
 *     <div className="w-full max-w-5xl">
 *       <PlanPicker />
 *     </div>
 *   </CenteredLayout.Body>
 * </CenteredLayout.Root>
 * ```
 */
const Header = forwardRef<
	ComponentRef<"header">,
	ComponentProps<"header"> & WithAsChild & WithDataSlot
>(({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
	const Comp = asChild ? Slot : "header";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "centered-layout-header")}
			className={cx("flex shrink-0 items-center px-4 py-4", className)}
			{...props}
		>
			{children}
		</Comp>
	);
});
Header.displayName = "CenteredLayoutHeader";

/**
 * The growing, centered region of the layout. Renders a `<div>` with
 * `flex flex-1 flex-col items-center justify-center gap-6 py-4` so its
 * children are centered in the space left over by `CenteredLayout.Header`
 * and `CenteredLayout.Footer`. Content taller than the viewport top-flows
 * and the page scrolls, because `Root` grows (`min-h-full`) instead of
 * clipping.
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
 *     <Main>
 *       <SignInCard />
 *     </Main>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher.Root>
 *       <ThemeSwitcher.Trigger />
 *       <ThemeSwitcher.Content />
 *     </ThemeSwitcher.Root>
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const Body = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild & WithDataSlot>(
	({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
		const Comp = asChild ? Slot : "div";

		return (
			<Comp
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "centered-layout-body")}
				className={cx("flex flex-1 flex-col items-center justify-center gap-6 py-4", className)}
				{...props}
			>
				{children}
			</Comp>
		);
	},
);
Body.displayName = "CenteredLayoutBody";

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
 *     <Main>
 *       <SignInCard />
 *     </Main>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher.Root>
 *       <ThemeSwitcher.Trigger />
 *       <ThemeSwitcher.Content />
 *     </ThemeSwitcher.Root>
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const Footer = forwardRef<
	ComponentRef<"footer">,
	ComponentProps<"footer"> & WithAsChild & WithDataSlot
>(({ asChild, children, className, "data-slot": dataSlot, ...props }, ref) => {
	const Comp = asChild ? Slot : "footer";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "centered-layout-footer")}
			className={cx("flex shrink-0 items-center px-4 py-4", className)}
			{...props}
		>
			{children}
		</Comp>
	);
});
Footer.displayName = "CenteredLayoutFooter";

/**
 * A viewport-filling centered page flow for sign-in, sign-up, onboarding,
 * 404, checkout, and other focused full-page states. It owns structure only —
 * the flex/overflow skeleton and region ordering. App state (routing,
 * sessions) never enters it, and landmark semantics stay compositional:
 * brand marks, links, and the `Main` landmark arrive as composed JSX.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * Composition:
 * ```
 * CenteredLayout.Root
 * ├── CenteredLayout.Header
 * ├── CenteredLayout.Body
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
 *     <Main>
 *       <SignInCard />
 *     </Main>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher.Root>
 *       <ThemeSwitcher.Trigger />
 *       <ThemeSwitcher.Content />
 *     </ThemeSwitcher.Root>
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const CenteredLayout = {
	/**
	 * The outer frame of a centered page flow. Fills its nearest sized ancestor
	 * (`min-h-full`) and stacks `Header` (pinned top), `Body` (which grows),
	 * and `Footer` (pinned bottom). Merge `h-full` via `className` when the
	 * host requires an exact height.
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
	 *     <Main>
	 *       <SignInCard />
	 *     </Main>
	 *   </CenteredLayout.Body>
	 *   <CenteredLayout.Footer>
	 *     <ThemeSwitcher.Root>
	 *       <ThemeSwitcher.Trigger />
	 *       <ThemeSwitcher.Content />
	 *     </ThemeSwitcher.Root>
	 *   </CenteredLayout.Footer>
	 * </CenteredLayout.Root>
	 * ```
	 */
	Root,
	/**
	 * A utility strip at the top of the layout (account chip, close button)
	 * rendered as a semantic `<header>` (`banner` landmark) outside the
	 * centered `flex-1` region — the mirror of `Footer`. Merge
	 * `sticky top-0 z-10` via `className` to pin it to the window while the
	 * page scrolls. Optional — omitting it is fine.
	 *
	 * @see https://mantle.ngrok.com/layouts/centered-layout
	 *
	 * @example
	 * ```tsx
	 * <CenteredLayout.Root>
	 *   <CenteredLayout.Header className="sticky top-0 z-10 justify-between">
	 *     <AccountChip />
	 *     <IconButton appearance="ghost" intent="neutral" type="button" label="Close" icon={<XIcon />} />
	 *   </CenteredLayout.Header>
	 *   <CenteredLayout.Body>
	 *     <div className="w-full max-w-5xl">
	 *       <PlanPicker />
	 *     </div>
	 *   </CenteredLayout.Body>
	 * </CenteredLayout.Root>
	 * ```
	 */
	Header,
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
	 *     <Main>
	 *       <SignInCard />
	 *     </Main>
	 *   </CenteredLayout.Body>
	 *   <CenteredLayout.Footer>
	 *     <ThemeSwitcher.Root>
	 *       <ThemeSwitcher.Trigger />
	 *       <ThemeSwitcher.Content />
	 *     </ThemeSwitcher.Root>
	 *   </CenteredLayout.Footer>
	 * </CenteredLayout.Root>
	 * ```
	 */
	Body,
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
	 *     <Main>
	 *       <SignInCard />
	 *     </Main>
	 *   </CenteredLayout.Body>
	 *   <CenteredLayout.Footer>
	 *     <ThemeSwitcher.Root>
	 *       <ThemeSwitcher.Trigger />
	 *       <ThemeSwitcher.Content />
	 *     </ThemeSwitcher.Root>
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
