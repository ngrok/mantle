"use client";

import { CircleNotchIcon } from "@phosphor-icons/react/CircleNotch";
import { MoonIcon } from "@phosphor-icons/react/Moon";
import { SunIcon } from "@phosphor-icons/react/Sun";
import type { ComponentProps, ReactNode, RefCallback } from "react";
import { useCallback } from "react";
import { useMatchesMediaQuery } from "../../hooks/use-matches-media-query.js";
import { parseBooleanish } from "../../types/index.js";
import type { WithStyleProps } from "../../types/with-style-props.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { IconButtonAppearance, IconButtonProps } from "../button/icon-button.js";
import { iconButtonVariants } from "../button/icon-button-variants.js";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import { IconSwap } from "../icon/icon-swap.js";
import { useForcedTheme, useSetTheme, useTheme } from "../theme/theme-provider.js";
import type { Theme } from "../theme/themes.js";
import { getToggledTheme, isTheme } from "../theme/themes.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";

/**
 * The transition each icon of `AppliedThemeIcon` runs when the theme changes.
 */
const appliedThemeIconItem =
	"col-start-1 row-start-1 grid place-items-center motion-safe:transition-[opacity,scale,filter,visibility] motion-safe:duration-200 motion-safe:ease-out-strong";

/**
 * The sun and the moon in one cell. CSS shows the icon of the theme on
 * `<html>`, which the pre-paint script and `ThemeProvider` set, so the server
 * HTML is final and a theme change renders nothing.
 */
function AppliedThemeIcon({ className, ...props }: ComponentProps<"span">) {
	return (
		<span className={cx("inline-grid shrink-0 place-items-center", className)} {...props}>
			<span
				className={cx(
					appliedThemeIconItem,
					"root-dark:invisible root-dark:opacity-0 motion-safe:root-dark:scale-50 motion-safe:root-dark:blur-[2px] motion-safe:root-dark:duration-150",
				)}
			>
				<SunIcon className="size-5" />
			</span>
			<span
				className={cx(
					appliedThemeIconItem,
					"not-root-dark:invisible not-root-dark:opacity-0 motion-safe:not-root-dark:scale-50 motion-safe:not-root-dark:blur-[2px] motion-safe:not-root-dark:duration-150",
				)}
			>
				<MoonIcon className="size-5" />
			</span>
		</span>
	);
}

/**
 * The props for the `ThemeSwitcherIcon` component.
 */
type ThemeSwitcherIconProps = WithStyleProps;

/**
 * The `ThemeSwitcher` icon on its own: a sun or a moon for the applied theme,
 * which swaps with a transition when the theme changes. Put it anywhere in the
 * `children` of a `ThemeDropdownMenuItem`, or of a `DropdownMenu.Item` that
 * uses `useThemeToggle`, and the new theme grows in a circle from it.
 *
 * CSS shows the icon of the theme class on `<html>`, which
 * `PreventWrongThemeFlashScript` and `ThemeProvider` set. The server HTML is
 * therefore final, and a theme change renders nothing. It is decorative
 * (`aria-hidden`). Its box is the size of an `Icon`, so it lines up with the
 * icons of other menu rows.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"theme-switcher-icon"` | On the `<span>` that holds the icon. |
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher#themeswitchericon
 *
 * @example
 * ```tsx
 * <ThemeDropdownMenuItem>
 *   <ThemeSwitcherIcon />
 *   Theme
 * </ThemeDropdownMenuItem>
 * ```
 */
// Why no asChild: the part owns its only content, the icon swap.
function ThemeSwitcherIcon({ className, style }: ThemeSwitcherIconProps) {
	return (
		<span
			aria-hidden
			data-slot="theme-switcher-icon"
			className={cx("flex shrink-0 items-center justify-center text-muted", className)}
			style={style}
		>
			<AppliedThemeIcon />
		</span>
	);
}

/**
 * The value `useThemeToggle` returns.
 */
type ThemeToggle = {
	/**
	 * Whether a press cannot change the theme: `true` under a `ThemeProvider`
	 * with `forceTheme`. Pass it to the item as `disabled`.
	 */
	disabled: boolean;
	/**
	 * The accessible name of the next press, such as "Switch to dark theme" or
	 * "Switch to light theme (system default)".
	 */
	label: string;
	/**
	 * The `onSelect` handler for a `DropdownMenu.Item`. It flips the theme and
	 * keeps the menu open. The new theme grows in a circle from the
	 * `ThemeSwitcherIcon` in the item, else from the item.
	 */
	onSelect: (event: Event) => void;
};

/**
 * The light/dark toggle of `ThemeDropdownMenuItem` for a `DropdownMenu.Item`
 * that you compose yourself. A press flips the theme the same way a
 * `ThemeSwitcher` click does.
 *
 * Reads and writes the theme via `useTheme`, so it must run inside a
 * `ThemeProvider`. Call it in a component that menu content renders: menu
 * content mounts only on the client, so the OS preference in `label` is
 * always known.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher#usethemetoggle
 *
 * @example
 * ```tsx
 * function ThemeItem() {
 *   const toggle = useThemeToggle();
 *
 *   return (
 *     <DropdownMenu.Item disabled={toggle.disabled} onSelect={toggle.onSelect}>
 *       <ThemeSwitcherIcon />
 *       Theme
 *     </DropdownMenu.Item>
 *   );
 * }
 * ```
 */
function useThemeToggle(): ThemeToggle {
	const [theme, setTheme] = useTheme();
	const forcedTheme = useForcedTheme();
	const prefersDarkMode = useMatchesMediaQuery("(prefers-color-scheme: dark)");

	return {
		disabled: forcedTheme != null,
		label: toggleLabel(getToggledTheme({ theme, prefersDarkMode }), { prefersDarkMode }),
		onSelect: (event) => {
			// Why keep the menu open: the user sees the icon swap under the reveal.
			event.preventDefault();
			const item = event.currentTarget instanceof Element ? event.currentTarget : null;
			setTheme((current) => getToggledTheme({ theme: current, prefersDarkMode }), {
				origin: item?.querySelector('[data-slot~="theme-switcher-icon"]') ?? item,
			});
		},
	};
}

/**
 * The props for the `ThemeDropdownMenuItem` component. Set `label` or
 * `children`, not both.
 */
type ThemeDropdownMenuItemProps = WithStyleProps &
	(
		| {
				/**
				 * The visible label of the default row. When set, it is also the
				 * accessible name. When omitted, the label is "Theme", and the
				 * accessible name also says which theme the next press shows, such as
				 * "Theme: Switch to dark theme". Set it for localization.
				 */
				label?: string;
				children?: never;
		  }
		| {
				/**
				 * The content of the item, in place of the default row. Put a
				 * `ThemeSwitcherIcon` where the icon goes. The content is also the
				 * accessible name. Children that render nothing (`false`, `true`,
				 * or `""`) keep the default row.
				 */
				children: ReactNode;
				label?: never;
		  }
	);

/**
 * Must render inside a `DropdownMenu.Content` or `DropdownMenu.SubContent`.
 * The type system cannot express this constraint, so it is on you to uphold it.
 *
 * The light/dark toggle for an existing menu, such as an account menu: one
 * "Theme" row that ends in the `ThemeSwitcher` icon. It is the menu form of
 * `ThemeSwitcher`. A press flips the theme the same way a `ThemeSwitcher`
 * click does, and the icon swaps between the sun and the moon. The menu stays
 * open, and the new theme grows in a circle from the icon.
 *
 * To lay out the row yourself, such as with the icon first, pass `children`
 * and put a `ThemeSwitcherIcon` in them. To wire a `DropdownMenu.Item` of your
 * own, call `useThemeToggle`.
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
 * | `data-slot` | `"theme-dropdown-menu-item-label"` | On the `<span>` that holds the `label`. The item renders it only when `children` is omitted. |
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
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Account</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *     <ThemeDropdownMenuItem>
 *       <ThemeSwitcherIcon />
 *       Theme
 *     </ThemeDropdownMenuItem>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
function ThemeDropdownMenuItem({ children, className, label, style }: ThemeDropdownMenuItemProps) {
	const toggle = useThemeToggle();
	// Why not `children != null`: `false`, `true`, and `""` render nothing, so the
	// item would have no name.
	const hasChildren = children != null && typeof children !== "boolean" && children !== "";

	return (
		<DropdownMenu.Item
			aria-label={label == null && !hasChildren ? `Theme: ${toggle.label}` : undefined}
			data-slot="theme-dropdown-menu-item"
			className={cx("gap-2", className)}
			disabled={toggle.disabled}
			style={style}
			onSelect={toggle.onSelect}
		>
			{hasChildren ? (
				children
			) : (
				<>
					<span data-slot="theme-dropdown-menu-item-label" className="flex-1">
						{label ?? "Theme"}
					</span>
					<ThemeSwitcherIcon className="size-7" />
				</>
			)}
		</DropdownMenu.Item>
	);
}

/** The mounted switchers with no `label`, which take their name from `nameSwitchers`. */
const namedSwitchers = new Set<HTMLButtonElement>();
let stopNaming: (() => void) | undefined;

/**
 * Writes the default name, such as "Switch to dark theme", to the `aria-label`
 * of each switcher with no `label`. It reads the theme on `<html>`, so a theme
 * change renders nothing.
 */
function nameSwitchers() {
	const stored = document.documentElement.dataset.theme;
	const prefersDarkMode = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
	const name = toggleLabel(
		getToggledTheme({ theme: isTheme(stored) ? stored : "system", prefersDarkMode }),
		{ prefersDarkMode },
	);
	for (const button of namedSwitchers) {
		button.setAttribute("aria-label", name);
	}
}

/**
 * A ref callback that keeps the default name of a switcher current. One
 * observer of `<html>` and one media query listener serve every switcher on
 * the page.
 *
 * Why an `aria-label` and not only the CSS name: Testing Library, jsdom, and
 * happy-dom do not read CSS generated content, so a test could not find the
 * switcher by its role and name. The CSS name stays for the server HTML and a
 * page with no JavaScript.
 */
const nameSwitcher: RefCallback<HTMLButtonElement> = (button) => {
	if (button == null) {
		return undefined;
	}
	namedSwitchers.add(button);
	if (stopNaming == null) {
		const html = new MutationObserver(nameSwitchers);
		html.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme", "data-applied-theme"],
		});
		const media = window.matchMedia?.("(prefers-color-scheme: dark)");
		media?.addEventListener("change", nameSwitchers);
		stopNaming = () => {
			html.disconnect();
			media?.removeEventListener("change", nameSwitchers);
		};
	}
	nameSwitchers();
	return () => {
		namedSwitchers.delete(button);
		button.removeAttribute("aria-label");
		if (namedSwitchers.size === 0) {
			stopNaming?.();
			stopNaming = undefined;
		}
	};
};

/**
 * The props for the `ThemeSwitcher` component. Takes `IconButton`'s props,
 * except the parts the switcher owns: `icon` (the themed icon) and `intent`
 * (always `"neutral"`). `asChild` and `children` are removed: the switcher
 * renders only its icon and its name, so both would be silently meaningless. `appearance` and `label` become optional
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
		 * CSS writes it in the server HTML, and an `aria-label` holds it after
		 * mount, so a test finds the button by its role and name. Set it for
		 * localization.
		 */
		label?: string;
	};

/**
 * The canonical theme control for headers and toolbars: an icon button
 * (ghost by default) that shows the applied theme and flips between light and
 * dark on each click. The new theme grows in a circle from the button in a
 * view transition, and swaps at once under reduced motion. It stores three
 * states with two visible ones. A click
 * shows the opposite of the applied theme, and stores `"system"` instead of a
 * pin when that opposite matches the OS preference. So a second click always
 * returns the user to the OS default.
 *
 * Writes the theme via `useTheme`'s setter, so it must render inside a
 * `ThemeProvider`. CSS shows the icon and writes the name from the theme on
 * `<html>`, so the server HTML is final, the icon and the name are correct
 * before hydration, and a theme change renders nothing. A click needs React. Under a
 * provider with `forceTheme`, it shows the forced theme and is disabled,
 * because a click cannot change what the page shows. To put the same control
 * in an existing menu, use `ThemeDropdownMenuItem`.
 *
 * @useWhen Let the user switch between light and dark mode from a header, a toolbar, or an account
 * menu.
 *
 * @siblings
 * - `Switch`: the toggle controls a setting other than the theme.
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
	"aria-disabled": ariaDisabled,
	appearance = "ghost",
	className,
	"data-slot": dataSlot,
	disabled: disabledProp,
	isLoading = false,
	label,
	onClick,
	ref,
	size = "md",
	type,
	...props
}: ThemeSwitcherProps) {
	const setTheme = useSetTheme();
	const forcedTheme = useForcedTheme();
	const ariaLabel = label ?? (forcedTheme != null ? "Theme set by this page" : undefined);
	// Why a callback that changes with `ariaLabel`: React removes the attribute
	// when `label` goes away, and the new ref then writes the default name again.
	const defaultName = useCallback<RefCallback<HTMLButtonElement>>(
		(button) => (ariaLabel == null ? nameSwitcher(button) : undefined),
		[ariaLabel],
	);
	const composedRef = useComposedRefs(ref, defaultName);
	const disabled =
		forcedTheme != null ||
		parseBooleanish(disabledProp ?? isLoading) ||
		parseBooleanish(ariaDisabled);

	return (
		<button
			aria-disabled={disabled}
			className={cx(
				iconButtonVariants({ appearance, intent: "neutral", isLoading, size }),
				className,
			)}
			data-appearance={appearance}
			data-icon-button
			data-intent="neutral"
			data-loading={isLoading ? "" : undefined}
			data-size={size}
			data-slot={joinDataSlot(dataSlot, "theme-switcher", "icon-button")}
			{...props}
			// Why after the spread, and none by default: the server HTML takes its
			// name from CSS, and `nameSwitcher` writes the default after mount.
			aria-label={ariaLabel}
			disabled={disabled}
			ref={composedRef}
			// oxlint-disable-next-line react/button-has-type -- `type` defaults to "button" at runtime via the `?? "button"` fallback; the static analyzer can't resolve that expression.
			type={type ?? "button"}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					// Why read the OS preference here: the click is the only reader, so the
					// switcher holds no media query list between clicks.
					const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
					setTheme((current) => getToggledTheme({ theme: current, prefersDarkMode }), {
						origin: event.currentTarget,
					});
					// Why here and not only in the observer: with no view transition,
					// `<html>` changes during the click, and the observer renames the
					// switcher one microtask later. A read right after the click must
					// get the new name.
					nameSwitchers();
				}
			}}
		>
			<IconSwap
				active={isLoading ? "loading" : "idle"}
				icons={{
					idle: <AppliedThemeIcon />,
					loading: <CircleNotchIcon className="animate-spin" />,
				}}
			/>
			{/* Why CSS content: the name follows the theme with no render, and the
			page text that crawlers read holds no copy of it. */}
			{ariaLabel == null && <span className="sr-only theme-switcher-name" />}
		</button>
	);
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
	ThemeDropdownMenuItem,
	ThemeSwitcher,
	ThemeSwitcherIcon,
	useThemeToggle,
};

export type {
	//,
	ThemeDropdownMenuItemProps,
	ThemeSwitcherIconProps,
	ThemeSwitcherProps,
	ThemeToggle,
};
