"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { useMatchesMediaQuery } from "../../hooks/use-matches-media-query.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { WithStyleProps } from "../../types/with-style-props.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { BrowserOnly } from "../browser-only/browser-only.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonProps,
} from "../button/icon-button.js";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { Icon } from "../icon/icon.js";
import { IconSwap } from "../icon/icon-swap.js";
import { ThemeIcon } from "../icons/theme.js";
import { Skeleton } from "../skeleton/index.js";
import { useAppliedTheme, useForcedTheme, useTheme } from "../theme/theme-provider.js";
import type { ResolvedTheme, Theme } from "../theme/themes.js";
import { getToggledTheme, isResolvedTheme } from "../theme/themes.js";

/**
 * The switcher icon for each applied theme. The switcher keeps each icon
 * mounted, so a theme change swaps the icon with a transition.
 */
const appliedThemeIcons = {
	light: <ThemeIcon theme="light" />,
	dark: <ThemeIcon theme="dark" />,
} satisfies Record<ResolvedTheme, ReactNode>;

/**
 * The props for the `ThemeDropdownMenuItem` component.
 */
type ThemeDropdownMenuItemProps = WithStyleProps & {
	/**
	 * The visible label and accessible name of the item. Set it for
	 * localization.
	 *
	 * @default "Dark mode"
	 */
	label?: string;
};

/**
 * Must render inside a `DropdownMenu.Content` or `DropdownMenu.SubContent` —
 * the type system cannot express this constraint, so it is on you to uphold it.
 *
 * The light/dark toggle for an existing menu, such as an account menu: one
 * "Dark mode" row with a switch. It is the menu form of `ThemeSwitcher`. The
 * row is a `role="menuitemcheckbox"`, checked when the applied theme is dark,
 * and a choice flips the theme the same way a `ThemeSwitcher` click does. The
 * menu stays open, and the new theme grows in a circle from the switch.
 *
 * Reads and writes the theme via `useTheme`, so it must render inside a
 * `ThemeProvider`. Under a provider with `forceTheme`, it shows the forced
 * theme and is disabled. For a control in a header or toolbar, use
 * `ThemeSwitcher` instead.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"theme-dropdown-menu-item"` | On the item element. |
 * | `data-slot` | `"theme-dropdown-menu-item-label"` | On the `<span>` that holds the `label`. |
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher#themedropdownmenuitem
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Account</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *     <ThemeDropdownMenuItem />
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
function ThemeDropdownMenuItem({
	className,
	label = "Dark mode",
	style,
}: ThemeDropdownMenuItemProps) {
	const [theme, setTheme] = useTheme();
	const appliedTheme = useAppliedTheme();
	const forcedTheme = useForcedTheme();
	const prefersDarkMode = useMatchesMediaQuery("(prefers-color-scheme: dark)");
	const switchRef = useRef<HTMLSpanElement>(null);

	return (
		<DropdownMenu.Item
			role="menuitemcheckbox"
			aria-checked={appliedTheme === "dark"}
			data-slot="theme-dropdown-menu-item"
			className={cx("group gap-2", className)}
			disabled={forcedTheme != null}
			style={style}
			onSelect={(event) => {
				// Why keep the menu open: the user sees the switch flip under the reveal.
				event.preventDefault();
				const origin = switchRef.current;
				if (origin != null) {
					toggleTheme({ origin, prefersDarkMode, setTheme, theme });
				}
			}}
		>
			<Icon svg={<ThemeIcon theme="dark" />} className="text-muted" />
			<span data-slot="theme-dropdown-menu-item-label" className="flex-1">
				{label}
			</span>
			<span
				ref={switchRef}
				aria-hidden
				className={cx(
					"flex h-5 w-9 shrink-0 items-center rounded-full bg-gray-400",
					"group-aria-checked:bg-accent-600",
				)}
			>
				<span
					className={cx(
						"block size-4 translate-x-0.5 rounded-full bg-[#fff] shadow-md",
						"transition-transform duration-200 ease-out-strong motion-reduce:transition-none",
						"group-aria-checked:translate-x-4.5",
					)}
				/>
			</span>
		</DropdownMenu.Item>
	);
}

/**
 * The props for the `ThemeSwitcher` component. Forwards `IconButton`'s props,
 * except the parts the switcher owns: `icon` (the SSR-safe themed icon) and
 * `intent` (always `"neutral"`). `asChild` and `children` are removed: the
 * switcher renders only its icon (the `label` renders as `aria-label`), so
 * both would be silently meaningless. `appearance` and `label` become optional
 * with theme-switcher defaults.
 */
type ThemeSwitcherProps = Omit<
	IconButtonProps,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label"
> &
	WithDataSlot & {
		/**
		 * The visual style of the `IconButton`. Optional here: `ThemeSwitcher`
		 * defaults to `"ghost"` so it sits quietly in headers and toolbars.
		 *
		 * @default "ghost"
		 */
		appearance?: IconButtonAppearance;
		/**
		 * The accessible name of the button, rendered as its `aria-label`. When
		 * omitted, the name says which theme the next click shows, such as
		 * "Switch to dark theme" or "Switch to light theme (system default)".
		 * Set it for localization.
		 */
		label?: string;
	};

/**
 * The canonical theme control for headers and toolbars: an `IconButton`
 * (ghost by default) that shows the applied theme and flips between light and
 * dark on each click. The new theme grows in a circle from the button in a
 * view transition, and swaps at once under reduced motion. It stores three
 * states with two visible ones. A click
 * shows the opposite of the applied theme, and stores `"system"` instead of a
 * pin when that opposite matches the OS preference. So a second click always
 * returns the user to the OS default.
 *
 * Reads and writes the theme via `useTheme`, so it must render inside a
 * `ThemeProvider`. Under a provider with `forceTheme`, it shows the forced
 * theme and is disabled, because a click cannot change what the page shows. The icon is SSR-safe: a `Skeleton` renders until
 * hydration, then the icon of the applied theme. To put the same control in
 * an existing menu, use `ThemeDropdownMenuItem`.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 * @see https://lea.verou.me/blog/2026/dark-mode-toggles/
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <header>
 *     <ThemeSwitcher />
 *   </header>
 * </ThemeProvider>
 * ```
 *
 * @example
 * ```tsx
 * <ThemeSwitcher appearance="outlined" label="Cambiar tema" />
 * ```
 */
function ThemeSwitcher({
	appearance = "ghost",
	"data-slot": dataSlot,
	disabled,
	label,
	onClick,
	...props
}: ThemeSwitcherProps) {
	const [theme, setTheme] = useTheme();
	const appliedTheme = useAppliedTheme();
	const forcedTheme = useForcedTheme();
	const prefersDarkMode = useMatchesMediaQuery("(prefers-color-scheme: dark)");
	// Why gate on hydration: the server cannot read the OS preference, so the
	// default name stays generic until the client knows which theme comes next.
	const isHydrated = useIsHydrated();
	const nextTheme = getToggledTheme({ theme, prefersDarkMode });
	const defaultLabel = isHydrated ? toggleLabel(nextTheme, { prefersDarkMode }) : "Toggle theme";

	return (
		<IconButton
			appearance={appearance}
			data-slot={joinDataSlot(dataSlot, "theme-switcher")}
			disabled={forcedTheme != null || disabled}
			intent="neutral"
			icon={
				<BrowserOnly
					fallback={
						// Why a span: the fallback renders inside a <button>, whose content
						// model forbids a <div>.
						<Skeleton asChild className="rounded-full size-5">
							<span />
						</Skeleton>
					}
				>
					{() => <IconSwap active={appliedTheme} icons={appliedThemeIcons} />}
				</BrowserOnly>
			}
			label={label ?? (forcedTheme != null ? "Theme set by this page" : defaultLabel)}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					toggleTheme({ origin: event.currentTarget, prefersDarkMode, setTheme, theme });
				}
			}}
			{...props}
		/>
	);
}

/**
 * Shows the opposite of the applied theme in a swap that grows from `origin`.
 * When that opposite matches the OS preference, it stores `"system"`.
 *
 * Why read `<html>`: the browser runs the update in a later frame, so a
 * second press can come first. `setTheme` writes the applied theme at once.
 */
function toggleTheme({
	origin,
	prefersDarkMode,
	setTheme,
	theme,
}: {
	origin: Element;
	prefersDarkMode: boolean;
	setTheme: (theme: Theme) => void;
	theme: Theme;
}) {
	swapTheme(
		() => {
			const applied = document.documentElement.dataset.appliedTheme;
			setTheme(
				getToggledTheme({ theme: isResolvedTheme(applied) ? applied : theme, prefersDarkMode }),
			);
		},
		{ origin },
	);
}

/**
 * Counts theme swaps. A newer swap replaces a running one, so only the newest
 * one clears the `<html>` attribute.
 */
let themeTransitionCount = 0;

/**
 * Runs `update` inside a view transition, and grows the new theme in a circle
 * from `origin` over the old one. It runs `update` at once when the browser has
 * no view transitions, when the user prefers reduced motion, or when the page
 * is hidden.
 *
 * Why `flushSync`: React must commit the new icon and label before the browser
 * takes the snapshot of the new theme.
 *
 * Why the click listener: while a view transition runs, the browser sends each
 * pointer event to `<html>`, so a click on the page would be lost. A click ends
 * the transition at once, then goes to the element under the pointer.
 */
function swapTheme(update: () => void, { origin }: { origin: Element }) {
	if (
		typeof document.startViewTransition !== "function" ||
		getPrefersReducedMotion() ||
		document.visibilityState !== "visible"
	) {
		update();
		return;
	}

	const html = document.documentElement;
	const circle = revealCircle(origin.getBoundingClientRect(), {
		width: window.innerWidth,
		height: window.innerHeight,
	});

	html.dataset.themeTransition = "";
	const transition = document.startViewTransition(() => flushSync(update));
	const transitionNumber = ++themeTransitionCount;

	function onClick(event: MouseEvent) {
		if (event.target !== html) {
			return;
		}
		transition.skipTransition();
		const target = document.elementFromPoint(event.clientX, event.clientY);
		if (target != null && target !== html) {
			target.dispatchEvent(new MouseEvent("click", event));
		}
	}
	document.addEventListener("click", onClick, { capture: true });

	transition.ready.then(
		() =>
			html.animate(
				{ clipPath: [circle.from, circle.to] },
				// Why not `ease-out-strong` in 300ms: the covered area grows with the
				// square of the radius, so that curve flips most of the screen in about
				// 40ms, like a flash. See `docs/motion.md` § Exceptions.
				{ duration: 400, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
			),
		// A skipped transition rejects `ready`; the theme is already applied.
		() => {},
	);

	void transition.finished.finally(() => {
		document.removeEventListener("click", onClick, { capture: true });
		if (transitionNumber === themeTransitionCount) {
			delete html.dataset.themeTransition;
		}
	});
}

/**
 * Returns the start and end `clip-path` of the reveal: a circle centered on
 * `origin` that grows until it covers the farthest corner of the viewport.
 *
 * @example
 * revealCircle({ left: 0, top: 0, width: 20, height: 20 }, { width: 100, height: 100 })
 * // { from: "circle(0px at 10px 10px)", to: "circle(127.28px at 10px 10px)" }
 */
function revealCircle(
	origin: Pick<DOMRect, "left" | "top" | "width" | "height">,
	viewport: { width: number; height: number },
) {
	const x = origin.left + origin.width / 2;
	const y = origin.top + origin.height / 2;
	const radius = Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y));
	const at = `at ${x}px ${y}px`;

	return {
		from: `circle(0px ${at})`,
		to: `circle(${Math.round(radius * 100) / 100}px ${at})`,
	};
}

/**
 * Names the theme the next click shows. A click that returns to `"system"`
 * says so, because the stored preference changes even though only the
 * colors are visible.
 */
function toggleLabel(nextTheme: Theme, { prefersDarkMode }: { prefersDarkMode: boolean }) {
	if (nextTheme === "system") {
		return prefersDarkMode
			? "Switch to dark theme (system default)"
			: "Switch to light theme (system default)";
	}

	return `Switch to ${nextTheme} theme`;
}

export {
	//,
	revealCircle,
	ThemeDropdownMenuItem,
	ThemeSwitcher,
};

export type {
	//,
	ThemeDropdownMenuItemProps,
	ThemeSwitcherProps,
};
