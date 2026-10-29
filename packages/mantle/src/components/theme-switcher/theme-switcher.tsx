"use client";

import type { ReactNode } from "react";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { useMatchesMediaQuery } from "../../hooks/use-matches-media-query.js";
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
import { IconSwap } from "../icon/icon-swap.js";
import { ThemeIcon } from "../icons/theme.js";
import { Skeleton } from "../skeleton/index.js";
import { useAppliedTheme, useForcedTheme, useTheme } from "../theme/theme-provider.js";
import type { ResolvedTheme, Theme } from "../theme/themes.js";
import { getToggledTheme } from "../theme/themes.js";

/**
 * The switcher icon for each applied theme. The switcher keeps each icon
 * mounted, so a theme change swaps the icon with a transition.
 */
const appliedThemeIcons = {
	light: <ThemeIcon theme="light" />,
	dark: <ThemeIcon theme="dark" />,
} satisfies Record<ResolvedTheme, ReactNode>;

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
 * Reads the applied theme via `useAppliedTheme`, so it must render inside a
 * `ThemeProvider`. It is decorative (`aria-hidden`). Its box is the size of an
 * `Icon`, so it lines up with the icons of other menu rows. It is SSR-safe: a
 * `Skeleton` renders until hydration, then the icon of the applied theme.
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
	const appliedTheme = useAppliedTheme();

	return (
		<span
			aria-hidden
			data-slot="theme-switcher-icon"
			className={cx("flex shrink-0 items-center justify-center text-muted", className)}
			style={style}
		>
			<BrowserOnly
				fallback={
					<Skeleton asChild className="rounded-full size-5">
						<span />
					</Skeleton>
				}
			>
				{() => <IconSwap active={appliedTheme} icons={appliedThemeIcons} />}
			</BrowserOnly>
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
 * Must render inside a `DropdownMenu.Content` or `DropdownMenu.SubContent` —
 * the type system cannot express this constraint, so it is on you to uphold it.
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
					setTheme((current) => getToggledTheme({ theme: current, prefersDarkMode }), {
						origin: event.currentTarget,
					});
				}
			}}
			{...props}
		/>
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
