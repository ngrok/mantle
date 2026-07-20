"use client";

import type { ComponentProps } from "react";
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
import { AutoThemeIcon, ThemeIcon } from "../icons/theme.js";
import { Skeleton } from "../skeleton/index.js";
import { useTheme } from "../theme/theme-provider.js";
import type { Theme } from "../theme/themes.js";
import { $theme, isTheme, themes } from "../theme/themes.js";

/**
 * Menu item labels for each mantle theme. Typed as a complete
 * `Record<Theme, string>` so adding a new theme to the `themes` tuple without
 * a label is a compile error here.
 */
const themeLabels: Record<Theme, string> = {
	system: "System Preference",
	light: "Light Mode",
	dark: "Dark Mode",
	"light-high-contrast": "Light High Contrast",
	"dark-high-contrast": "Dark High Contrast",
};

/**
 * The props for the `ThemeDropdownMenuRadioGroup` component.
 */
type ThemeDropdownMenuRadioGroupProps = WithStyleProps;

/**
 * Must render inside a `DropdownMenu.Content` or `DropdownMenu.SubContent` —
 * the type system cannot express this constraint, so it is on you to uphold it.
 *
 * The theme-selection radio group for mantle's theme system. Renders one
 * `role="menuitemradio"` item per mantle theme via `DropdownMenu.RadioGroup`;
 * the active theme is `aria-checked` and choosing an item persists the new
 * theme through `useTheme`, so a `ThemeProvider` ancestor is required
 * (`useTheme` throws outside of one). Use it to embed theme selection in an
 * existing menu (e.g. an account menu submenu); for a standalone picker,
 * reach for `ThemeSwitcher` instead.
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
const ThemeDropdownMenuRadioGroup = ({ className, style }: ThemeDropdownMenuRadioGroupProps) => {
	const [currentTheme, setTheme] = useTheme();

	return (
		<DropdownMenu.RadioGroup
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
 * The props for the `ThemeSwitcher.Root` component. Identical to
 * `DropdownMenu.Root`'s props — `Root` forwards everything through.
 */
type ThemeSwitcherRootProps = ComponentProps<typeof DropdownMenu.Root>;

/**
 * The stateful root of the theme switcher: a thin forwarding wrapper over
 * `DropdownMenu.Root` that owns the menu's open/closed state. Renders no DOM
 * of its own. Compose `ThemeSwitcher.Trigger` and `ThemeSwitcher.Content`
 * inside it.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 *
 * @example
 * ```tsx
 * <ThemeSwitcher.Root>
 *   <ThemeSwitcher.Trigger />
 *   <ThemeSwitcher.Content />
 * </ThemeSwitcher.Root>
 * ```
 */
const Root = (props: ThemeSwitcherRootProps) => <DropdownMenu.Root {...props} />;

/**
 * The props for the `ThemeSwitcher.Trigger` component. Forwards
 * `IconButton`'s props, except the parts the trigger owns: `icon` (the
 * SSR-safe themed icon) and `intent` (always `"neutral"`). `asChild` and
 * `children` are removed — the trigger renders only its icon and sr-only
 * label, so both would be silently meaningless. `appearance` and `label`
 * become optional with theme-switcher defaults.
 */
type ThemeSwitcherTriggerProps = Omit<
	IconButtonProps,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label"
> &
	WithDataSlot & {
		/**
		 * The visual style of the trigger `IconButton`. Optional here —
		 * `ThemeSwitcher.Trigger` defaults to `"ghost"` so the trigger sits
		 * quietly in headers and toolbars.
		 *
		 * @default "ghost"
		 */
		appearance?: IconButtonAppearance;
		/**
		 * The accessible name for the trigger `IconButton`. Visually hidden but
		 * announced to screen readers. Override it for localization.
		 *
		 * @default "Change Theme"
		 */
		label?: string;
	};

/**
 * The button that opens the theme menu: an `IconButton` (ghost by default)
 * wired up as the menu trigger. The trigger icon is SSR-safe: the applied
 * theme is unknowable server-side, so a `Skeleton` renders until hydration,
 * then the icon matching the applied theme. The icon is owned by the trigger;
 * to render a completely custom trigger, compose `DropdownMenu` +
 * `ThemeDropdownMenuRadioGroup` directly instead.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 *
 * @example
 * ```tsx
 * <ThemeSwitcher.Root>
 *   <ThemeSwitcher.Trigger appearance="outlined" label="Choose a theme" />
 *   <ThemeSwitcher.Content />
 * </ThemeSwitcher.Root>
 * ```
 */
const Trigger = ({
	appearance = "ghost",
	"data-slot": dataSlot,
	disabled,
	label = "Change Theme",
	ref,
	...props
}: ThemeSwitcherTriggerProps) => (
	// `disabled` must reach DropdownMenu.Trigger too: Radix owns the open
	// behavior, and a disabled trigger that only disables the button DOM
	// node would still open the menu on synthesized pointer events.
	<DropdownMenu.Trigger asChild disabled={disabled}>
		<IconButton
			ref={ref}
			appearance={appearance}
			disabled={disabled}
			data-slot={joinDataSlot(dataSlot, "theme-switcher-trigger")}
			intent="neutral"
			icon={
				<BrowserOnly fallback={<Skeleton className="rounded-full size-5" />}>
					{() => <AutoThemeIcon className="size-5" />}
				</BrowserOnly>
			}
			label={label}
			{...props}
		/>
	</DropdownMenu.Trigger>
);

/**
 * The props for the `ThemeSwitcher.Content` component. Identical to
 * `DropdownMenu.Content`'s props — positioning and collision behavior
 * (`align`, `side`, `collisionPadding`, …) plus `className`/`style` all
 * forward through.
 */
type ThemeSwitcherContentProps = ComponentProps<typeof DropdownMenu.Content> & WithDataSlot;

/**
 * The popover the trigger opens: a thin forwarding wrapper over
 * `DropdownMenu.Content`. When `children` are omitted (or `null`/`undefined`)
 * it renders `ThemeDropdownMenuRadioGroup`, the five-theme radio group — pass
 * `children` to own the menu contents instead (compose
 * `ThemeDropdownMenuRadioGroup` yourself alongside extra items). Any
 * non-nullish children replace the default entirely, including render-nothing
 * values like `false` — a lone `{condition && <Item />}` child suppresses the
 * radio group when the condition is false.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 *
 * @example
 * ```tsx
 * <ThemeSwitcher.Root>
 *   <ThemeSwitcher.Trigger />
 *   <ThemeSwitcher.Content align="end" collisionPadding={{ right: 16 }} />
 * </ThemeSwitcher.Root>
 * ```
 *
 * @example
 * Extending the menu beyond theme selection:
 * ```tsx
 * <ThemeSwitcher.Content>
 *   <ThemeDropdownMenuRadioGroup />
 *   <DropdownMenu.Separator />
 *   <DropdownMenu.Item>Appearance settings…</DropdownMenu.Item>
 * </ThemeSwitcher.Content>
 * ```
 */
const Content = ({ children, "data-slot": dataSlot, ...props }: ThemeSwitcherContentProps) => (
	<DropdownMenu.Content data-slot={joinDataSlot(dataSlot, "theme-switcher-content")} {...props}>
		{children ?? <ThemeDropdownMenuRadioGroup />}
	</DropdownMenu.Content>
);

/**
 * The canonical picker for mantle's theme system: a compact `IconButton`
 * trigger (ghost by default) that opens a `DropdownMenu` hosting
 * `ThemeDropdownMenuRadioGroup`, the theme-selection radio group.
 *
 * Reads and writes the active theme via `useTheme`, so it must render inside
 * a `ThemeProvider` — `useTheme` throws outside of one.
 *
 * To embed theme selection in an existing menu instead (e.g. an account menu
 * submenu), use `ThemeDropdownMenuRadioGroup` directly.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 *
 * @example
 * Composition:
 * ```
 * ThemeSwitcher.Root
 * ├── ThemeSwitcher.Trigger
 * └── ThemeSwitcher.Content
 * ```
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <header>
 *     <ThemeSwitcher.Root>
 *       <ThemeSwitcher.Trigger />
 *       <ThemeSwitcher.Content />
 *     </ThemeSwitcher.Root>
 *   </header>
 * </ThemeProvider>
 * ```
 */
const ThemeSwitcher = {
	/**
	 * The stateful root: a thin forwarding wrapper over `DropdownMenu.Root`
	 * that owns the menu's open/closed state. Renders no DOM of its own.
	 *
	 * @see https://mantle.ngrok.com/components/forms/theme-switcher
	 *
	 * @example
	 * ```tsx
	 * <ThemeSwitcher.Root>
	 *   <ThemeSwitcher.Trigger />
	 *   <ThemeSwitcher.Content />
	 * </ThemeSwitcher.Root>
	 * ```
	 */
	Root,
	/**
	 * The button that opens the theme menu: an `IconButton` (ghost by default)
	 * with an SSR-safe themed icon. Forwards `IconButton` props; `label`
	 * defaults to `"Change Theme"`.
	 *
	 * @see https://mantle.ngrok.com/components/forms/theme-switcher
	 *
	 * @example
	 * ```tsx
	 * <ThemeSwitcher.Root>
	 *   <ThemeSwitcher.Trigger appearance="outlined" label="Choose a theme" />
	 *   <ThemeSwitcher.Content />
	 * </ThemeSwitcher.Root>
	 * ```
	 */
	Trigger,
	/**
	 * The popover the trigger opens: forwards `DropdownMenu.Content` props
	 * (`align`, `side`, `collisionPadding`, `className`, …) and renders the
	 * five-theme radio group when no `children` are given.
	 *
	 * @see https://mantle.ngrok.com/components/forms/theme-switcher
	 *
	 * @example
	 * ```tsx
	 * <ThemeSwitcher.Root>
	 *   <ThemeSwitcher.Trigger />
	 *   <ThemeSwitcher.Content align="end" collisionPadding={{ right: 16 }} />
	 * </ThemeSwitcher.Root>
	 * ```
	 */
	Content,
} as const;

export {
	//,
	ThemeDropdownMenuRadioGroup,
	ThemeSwitcher,
};

export type {
	//,
	ThemeDropdownMenuRadioGroupProps,
	ThemeSwitcherContentProps,
	ThemeSwitcherRootProps,
	ThemeSwitcherTriggerProps,
};
