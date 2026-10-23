"use client";

import {
	RadioGroup as DropdownMenuPrimitiveRadioGroup,
	RadioItem as DropdownMenuPrimitiveRadioItem,
} from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { useId } from "react";
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
import { Icon } from "../icon/icon.js";
import { IconSwap } from "../icon/icon-swap.js";
import { ThemeIcon } from "../icons/theme.js";
import { Skeleton } from "../skeleton/index.js";
import { useAppliedTheme, useForcedTheme, useTheme } from "../theme/theme-provider.js";
import type { ResolvedTheme, Theme } from "../theme/themes.js";
import {
	$resolvedTheme,
	getThemeToStore,
	getToggledTheme,
	isResolvedTheme,
	resolvedThemes,
} from "../theme/themes.js";

/**
 * The accessible name of each theme segment. Typed as a complete
 * `Record<ResolvedTheme, string>` so adding a new theme to the
 * `resolvedThemes` tuple without a name is a compile error here.
 */
const themeNames: Record<ResolvedTheme, string> = {
	light: "Light",
	dark: "Dark",
};

/**
 * The switcher icon for each applied theme. The switcher keeps each icon
 * mounted, so a theme change swaps the icon with a transition.
 */
const appliedThemeIcons = {
	light: <ThemeIcon theme="light" />,
	dark: <ThemeIcon theme="dark" />,
} satisfies Record<ResolvedTheme, ReactNode>;

/**
 * The props for the `ThemeDropdownMenuRadioGroup` component.
 */
type ThemeDropdownMenuRadioGroupProps = WithStyleProps & {
	/**
	 * The visible label of the row, which also names the radio group. Set it
	 * for localization.
	 *
	 * @default "Theme"
	 */
	label?: string;
};

/**
 * Must render inside a `DropdownMenu.Content` or `DropdownMenu.SubContent` —
 * the type system cannot express this constraint, so it is on you to uphold it.
 *
 * The light/dark toggle for an existing menu, such as an account menu: one
 * "Theme" row with a Light and a Dark segment. It is the menu form of
 * `ThemeSwitcher`. Each segment is a `role="menuitemradio"`, and the applied
 * theme is `aria-checked`. A choice that matches the OS preference stores
 * `"system"` instead of a pin, as a `ThemeSwitcher` click does. The menu stays
 * open, and the new theme grows in a circle from the chosen segment.
 *
 * Reads and writes the theme via `useTheme`, so it must render inside a
 * `ThemeProvider`. Under a provider with `forceTheme`, it checks the forced
 * theme and both segments are disabled. For a control in a header or
 * toolbar, use `ThemeSwitcher` instead.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"theme-dropdown-menu-radio-group"` | On the row, which is the radio group. |
 * | `data-slot` | `"theme-dropdown-menu-radio-group-label"` | On the `<span>` that holds the `label`. |
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher#themedropdownmenuradiogroup
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Account</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *     <ThemeDropdownMenuRadioGroup />
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
function ThemeDropdownMenuRadioGroup({
	className,
	label = "Theme",
	style,
}: ThemeDropdownMenuRadioGroupProps) {
	const [, setTheme] = useTheme();
	const appliedTheme = useAppliedTheme();
	const forcedTheme = useForcedTheme();
	const prefersDarkMode = useMatchesMediaQuery("(prefers-color-scheme: dark)");
	const labelId = useId();

	return (
		<DropdownMenuPrimitiveRadioGroup
			aria-labelledby={labelId}
			data-slot="theme-dropdown-menu-radio-group"
			className={cx("flex items-center gap-2 py-1 pl-2 pr-1", className)}
			style={style}
			value={appliedTheme}
		>
			<span
				id={labelId}
				data-slot="theme-dropdown-menu-radio-group-label"
				className="flex-1 text-sm text-strong"
			>
				{label}
			</span>
			<span className="flex gap-0.5 rounded-md border border-form p-0.5">
				{resolvedThemes.map((theme) => (
					<DropdownMenuPrimitiveRadioItem
						key={theme}
						aria-label={themeNames[theme]}
						textValue={themeNames[theme]}
						value={$resolvedTheme(theme)}
						disabled={forcedTheme != null}
						className={cx(
							"flex size-7 cursor-pointer items-center justify-center rounded text-muted outline-hidden",
							"data-highlighted:bg-active-menu-item data-highlighted:text-strong",
							"aria-checked:bg-accent-500/10 aria-checked:text-accent-600",
							"data-disabled:cursor-default data-disabled:opacity-50",
						)}
						onSelect={(event) => {
							// Why keep the menu open: the user sees the segment change under the reveal.
							event.preventDefault();
							if (theme === appliedTheme) {
								return;
							}
							const update = () =>
								setTheme(getThemeToStore({ appliedTheme: theme, prefersDarkMode }));
							const origin = event.currentTarget;
							if (origin instanceof Element) {
								swapTheme(update, { origin });
							} else {
								update();
							}
						}}
					>
						<Icon svg={<ThemeIcon theme={theme} />} className="size-4" />
					</DropdownMenuPrimitiveRadioItem>
				))}
			</span>
		</DropdownMenuPrimitiveRadioGroup>
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
 * an existing menu, use `ThemeDropdownMenuRadioGroup`.
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
					swapTheme(
						() => {
							// Why read `<html>`: the browser runs the update in a later frame, so a
							// second click can come first. `setTheme` writes the applied theme at once.
							const applied = document.documentElement.dataset.appliedTheme;
							setTheme(
								isResolvedTheme(applied)
									? getToggledTheme({ theme: applied, prefersDarkMode })
									: nextTheme,
							);
						},
						{ origin: event.currentTarget },
					);
				}
			}}
			{...props}
		/>
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
	ThemeDropdownMenuRadioGroup,
	ThemeSwitcher,
};

export type {
	//,
	ThemeDropdownMenuRadioGroupProps,
	ThemeSwitcherProps,
};
