"use client";

import type { ComponentProps, ReactNode } from "react";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { useMatchesMediaQuery } from "../../hooks/use-matches-media-query.js";
import type { WithStyleProps } from "../../types/with-style-props.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
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
import { useAppliedTheme, useTheme } from "../theme/theme-provider.js";
import type { ResolvedTheme, Theme } from "../theme/themes.js";
import { $theme, getToggledTheme, isTheme, themes } from "../theme/themes.js";

/**
 * Menu item labels for each mantle theme. Typed as a complete
 * `Record<Theme, string>` so adding a new theme to the `themes` tuple without
 * a label is a compile error here.
 */
const themeLabels: Record<Theme, string> = {
	system: "System Preference",
	light: "Light Mode",
	dark: "Dark Mode",
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
type ThemeDropdownMenuRadioGroupProps = WithStyleProps &
	Pick<ComponentProps<"div">, "aria-label" | "aria-labelledby">;

/**
 * Must render inside a `DropdownMenu.Content` or `DropdownMenu.SubContent` —
 * the type system cannot express this constraint, so it is on you to uphold it.
 *
 * The theme-selection radio group for mantle's theme system. Renders one
 * `role="menuitemradio"` item per mantle theme via `DropdownMenu.RadioGroup`;
 * the active theme is `aria-checked` and choosing an item persists the new
 * theme through `useTheme`, so a `ThemeProvider` ancestor is required
 * (`useTheme` throws outside of one). Use it to embed theme selection in an
 * existing menu or a settings panel, where the user expects to configure a
 * preference. For a one-click control in a header or toolbar, use
 * `ThemeSwitcher` instead.
 *
 * The group is named "Theme" by default. Pass `aria-label` to rename it, or
 * `aria-labelledby` to point at a visible heading such as a
 * `DropdownMenu.Label`.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 *
 * @example
 * Standalone inside a `DropdownMenu.Content`:
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Theme</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <ThemeDropdownMenuRadioGroup />
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 *
 * @example
 * Embedded in a submenu of an existing menu (e.g. an account menu):
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">Account</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>Theme</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <ThemeDropdownMenuRadioGroup />
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const ThemeDropdownMenuRadioGroup = ({
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	className,
	style,
}: ThemeDropdownMenuRadioGroupProps) => {
	const [currentTheme, setTheme] = useTheme();

	return (
		<DropdownMenu.RadioGroup
			// Why a default name: Radix renders the group as `role="group"`, and a
			// group with no name is announced as nothing.
			aria-label={ariaLabelledBy == null ? (ariaLabel ?? "Theme") : ariaLabel}
			aria-labelledby={ariaLabelledBy}
			data-slot="theme-dropdown-menu-radio-group"
			className={className}
			style={style}
			value={currentTheme}
			onValueChange={(value) => {
				if (isTheme(value)) {
					setTheme(value);
				}
			}}
		>
			{themes.map((theme) => (
				<DropdownMenu.RadioItem key={theme} value={$theme(theme)}>
					<Icon svg={<ThemeIcon theme={theme} />} />
					{themeLabels[theme]}
				</DropdownMenu.RadioItem>
			))}
		</DropdownMenu.RadioGroup>
	);
};

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
 * dark on each click. It stores three states with two visible ones. A click
 * shows the opposite of the applied theme, and stores `"system"` instead of a
 * pin when that opposite matches the OS preference. So a second click always
 * returns the user to the OS default.
 *
 * Reads and writes the theme via `useTheme`, so it must render inside a
 * `ThemeProvider`. The icon is SSR-safe: a `Skeleton` renders until
 * hydration, then the icon of the applied theme. To offer all three themes in
 * an existing menu or a settings panel, use `ThemeDropdownMenuRadioGroup`.
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
	label,
	onClick,
	...props
}: ThemeSwitcherProps) {
	const [theme, setTheme] = useTheme();
	const appliedTheme = useAppliedTheme();
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
			label={label ?? defaultLabel}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					setTheme(nextTheme);
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
	ThemeDropdownMenuRadioGroup,
	ThemeSwitcher,
};

export type {
	//,
	ThemeDropdownMenuRadioGroupProps,
	ThemeSwitcherProps,
};
