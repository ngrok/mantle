import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import { WarningDiamondIcon } from "@phosphor-icons/react/WarningDiamond";
import { XIcon } from "@phosphor-icons/react/X";
import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import invariant from "tiny-invariant";
import { $cssProperties, type WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import {
	IconButton,
	type IconButtonAppearance,
	type IconButtonProps,
} from "../button/icon-button.js";
import { SvgOnly } from "../icon/svg-only.js";
import type { SvgAttributes } from "../icon/types.js";
import { Slot } from "../slot/index.js";

const intents = [
	//,
	"danger",
	"important",
	"info",
	// "neutral",
	"success",
	"warning",
] as const;
type AlertIntent = (typeof intents)[number];

const appearances = ["banner", "default"] as const;
type Appearance = (typeof appearances)[number];

type AlertContextValue = {
	intent: AlertIntent;
};

const AlertContext = createContext<AlertContextValue | null>(null);

const defaultDismissIcon = <XIcon />;

function useAlertContext() {
	const context = useContext(AlertContext);
	invariant(context, "useAlertContext hook used outside of Alert parent!");
	return context;
}

const alertVariants = cva(
	"relative flex w-full gap-1.5 rounded-md border p-2.5 text-sm font-sans",
	{
		variants: {
			/**
			 * The intent of the Alert — the status its color communicates to the user,
			 * determining the color and styling of the Alert.
			 */
			intent: {
				danger:
					"border-danger-500/50 bg-danger-500/10 text-danger-700 [&_code]:bg-danger-500/10 [&_code]:border-danger-500/20 [&_code]:text-danger-900 [&_a]:text-danger-700 [&_a]:underline",
				important:
					"border-important-500/50 bg-important-500/10 text-important-700 [&_code]:bg-important-500/10 [&_code]:border-important-500/20 [&_code]:text-important-900 [&_a]:text-important-700 [&_a]:underline",
				info: "border-info-500/50 bg-info-500/10 text-info-700 [&_code]:bg-info-500/10 [&_code]:border-info-500/20 [&_code]:text-info-900 [&_a]:text-info-700 [&_a]:underline",
				// neutral: "border-neutral-500/50 bg-neutral-500/10 text-neutral-700",
				success:
					"border-success-500/50 bg-success-500/10 text-success-700 [&_code]:bg-success-500/10 [&_code]:border-success-500/20 [&_code]:text-success-900 [&_a]:text-success-700 [&_a]:underline",
				warning:
					"border-warning-500/50 bg-warning-500/10 text-warning-700 [&_code]:bg-warning-500/10 [&_code]:border-warning-500/20 [&_code]:text-warning-900 [&_a]:text-warning-700 [&_a]:underline",
			} as const satisfies Record<AlertIntent, string>,
			/**
			 * Controls the visual style of the Alert.
			 * - "default" provides standard rounded corners and borders.
			 * - "banner" creates a banner-style alert with no rounded corners, sticky positioning, and no left/right borders.
			 *
			 * @default "default"
			 */
			appearance: {
				// TODO: banner bg should color-mix with bg-popover per intent
				banner: "border-x-0 border-t-0 rounded-none z-50 sticky",
				default: "",
			} as const satisfies Record<Appearance, string>,
		},
	},
);

type AlertProps = ComponentProps<"div"> & {
	/**
	 * The intent of the Alert — the status its color communicates to the user,
	 * determining the color and styling of the Alert.
	 */
	intent: AlertIntent;
	/**
	 * Controls the visual style of the Alert.
	 * - "default" provides standard rounded corners and borders.
	 * - "banner" creates a banner-style alert with no rounded corners, sticky positioning, and no left/right borders.
	 *
	 * @default "default"
	 */
	appearance?: Appearance;
};

/**
 * Displays a callout for user attention. Root container for all Alert sub-components.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertroot
 *
 * @example
 * ```tsx
 * <Alert intent="info">
 *   <AlertIcon />
 *   <AlertContent>
 *     <AlertTitle>Alert Title</AlertTitle>
 *      <AlertDismissIconButton />
 *     <AlertDescription>
 *       Alert description text.
 *     </AlertDescription>
 *   </AlertContent>
 * </Alert>
 *```
 */
const Root = ({ appearance = "default", className, intent, ref, ...props }: AlertProps) => {
	const context: AlertContextValue = useMemo(() => ({ intent }), [intent]);

	return (
		<AlertContext.Provider value={context}>
			<div
				ref={ref}
				data-slot="alert"
				className={cx(alertVariants({ appearance, intent }), className)}
				{...props}
			/>
		</AlertContext.Provider>
	);
};
Root.displayName = "Alert";

type AlertIconProps = Omit<SvgAttributes, "children"> & {
	/**
	 * An optional icon that renders in place of the default icon for the Alert intent.
	 */
	svg?: ReactNode;
};

/**
 * Default `<AlertIcon>` icons for each intent.
 */
const defaultIcons = {
	danger: <WarningIcon />,
	important: <MegaphoneIcon mirrored />,
	info: <InfoIcon />,
	// neutral: <BellRinging />,
	success: <CheckCircleIcon />,
	warning: <WarningDiamondIcon />,
} as const satisfies Record<AlertIntent, ReactNode>;

/**
 * An optional icon that visually represents the intent of the Alert.
 *
 * The default rendered icon be overridden with a custom icon using the `svg` prop.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alerticon
 *
 * @example
 * ```tsx
 * <Alert intent="info">
 *   <AlertIcon />
 *   <AlertContent>
 *     <AlertTitle>Alert Title</AlertTitle>
 *     <AlertDismissIconButton />
 *     <AlertDescription>
 *       Alert description text.
 *     </AlertDescription>
 *   </AlertContent>
 * </Alert>
 * ```
 */
const Icon = ({ className, ref, svg, ...props }: AlertIconProps) => {
	const ctx = useAlertContext();
	const defaultIcon = defaultIcons[ctx.intent];

	return (
		<SvgOnly
			ref={ref}
			data-slot="alert-icon"
			className={cx("size-5", className)}
			svg={svg ?? defaultIcon}
			{...props}
		/>
	);
};
Icon.displayName = "AlertIcon";

/**
 * The container for the content slot of an alert. Place the title and description as direct children.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertcontent
 *
 * @example
 * ```tsx
 * <Alert intent="info">
 *   <AlertIcon />
 *   <AlertContent>
 *     <AlertTitle>Alert Title</AlertTitle>
 *     <AlertDismissIconButton />
 *     <AlertDescription>
 *       Alert description text.
 *     </AlertDescription>
 *   </AlertContent>
 * </Alert>
 *```
 */
const Content = ({ className, ref, ...props }: ComponentProps<"div">) => (
	<div
		ref={ref}
		data-slot="alert-content"
		className={cx("min-w-0 flex-1 has-data-alert-dismiss:pr-6", className)}
		{...props}
	/>
);
Content.displayName = "AlertContent";

type AlertTitleProps = ComponentProps<"h5"> & WithAsChild;

/**
 * The title of an alert. Default renders as an h5 element, use asChild to render something else.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alerttitle
 *
 * @example
 * ```tsx
 * <Alert intent="info">
 *   <AlertIcon />
 *   <AlertContent>
 *     <AlertTitle>Alert Title</AlertTitle>
 *     <AlertDismissIconButton />
 *     <AlertDescription>
 *       Alert description text.
 *     </AlertDescription>
 *   </AlertContent>
 * </Alert>
 *```
 */
const Title = ({ asChild = false, className, ref, ...props }: AlertTitleProps) => {
	const Component = asChild ? Slot : "h5";

	return (
		<Component
			ref={ref}
			data-slot="alert-title"
			className={cx("font-medium", className)}
			{...props}
		/>
	);
};
Title.displayName = "AlertTitle";

type AlertDescriptionProps = ComponentProps<"div"> & WithAsChild;

/**
 * The optional description of an alert.
 * Renders as a `div` by default, but can be changed to any other element using
 * the `asChild` prop.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertdescription
 *
 * @example
 * ```tsx
 * <Alert intent="info">
 *   <AlertIcon />
 *   <AlertContent>
 *     <AlertTitle>Alert Title</AlertTitle>
 *     <AlertDismissIconButton />
 *     <AlertDescription>
 *       Alert description text.
 *     </AlertDescription>
 *   </AlertContent>
 * </Alert>
 * ```
 */
const Description = ({ asChild = false, className, ref, ...props }: AlertDescriptionProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="alert-description"
			className={cx("text-sm", className)}
			{...props}
		/>
	);
};
Description.displayName = "AlertDescription";

const dismissTextColor = (intent: AlertIntent) => `var(--color-${intent}-700)`;

const dismissHoverColor = (intent: AlertIntent) => `var(--color-${intent}-800)`;

const dismissHoverBgColor = (intent: AlertIntent) =>
	`color-mix(in oklab, var(--color-${intent}-500) 10%, transparent)`;

type AlertDismissIconButtonProps = Partial<
	Omit<IconButtonProps, "appearance" | "icon" | "intent">
> & {
	/**
	 * The visual style of the dismiss button. Optional here —
	 * `Alert.DismissIconButton` defaults to `"ghost"` so the dismiss affordance
	 * stays visually quiet inside the Alert.
	 *
	 * @default "ghost"
	 */
	appearance?: IconButtonAppearance;
	/**
	 * An optional icon to render inside the dismiss button. Defaults to an X icon.
	 */
	icon?: ReactNode;
};

const DismissIconButton = ({
	size = "sm",
	type = "button",
	label = "Dismiss Alert",
	appearance = "ghost",
	className,
	icon = defaultDismissIcon,
	style,
	...props
}: AlertDismissIconButtonProps) => {
	const ctx = useAlertContext();
	return (
		<IconButton
			appearance={appearance}
			icon={icon}
			// not a public prop: the dismiss button's visible tone is dictated by
			// the parent Alert's intent via the CSS custom properties below, so a
			// consumer-passed intent would only half-apply (focus ring, outlined
			// border) and read as a bug
			intent="neutral"
			label={label}
			size={size}
			data-slot="alert-dismiss-icon-button"
			data-alert-dismiss
			className={cx(
				"right-1.5 top-1.5 absolute",
				"text-(--alert-dismiss-icon-color)",
				"not-disabled:hover:bg-(--alert-dismiss-hover-bg) not-disabled:hover:text-(--alert-dismiss-icon-hover-color)",
				className,
			)}
			type={type}
			style={$cssProperties({
				...style,
				"--alert-dismiss-icon-color": dismissTextColor(ctx.intent),
				"--alert-dismiss-icon-hover-color": dismissHoverColor(ctx.intent),
				"--alert-dismiss-hover-bg": dismissHoverBgColor(ctx.intent),
			})}
			{...props}
		/>
	);
};
DismissIconButton.displayName = "AlertDismissIconButton";

/**
 * Displays a callout for user attention.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert
 *
 * @example
 * Composition:
 * ```
 * Alert.Root
 * ├── Alert.Icon
 * └── Alert.Content
 *     ├── Alert.Title
 *     ├── Alert.Description
 *     └── Alert.DismissIconButton
 * ```
 *
 * @example
 * ```tsx
 * <Alert intent="info">
 *   <AlertIcon />
 *   <AlertContent>
 *     <AlertTitle>Alert Title</AlertTitle>
 *      <AlertDismissIconButton />
 *     <AlertDescription>
 *       Alert description text.
 *     </AlertDescription>
 *   </AlertContent>
 * </Alert>
 *```
 */
const Alert = {
	/**
	 * The root container of the alert component.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert#alertroot
	 *
	 * @example
	 * ```tsx
	 * <Alert.Root intent="info">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>Alert Title</Alert.Title>
	 *     <Alert.Description>Alert description</Alert.Description>
	 *   </Alert.Content>
	 * </Alert.Root>
	 * ```
	 */
	Root,
	/**
	 * The container for the content slot of an alert.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert#alertcontent
	 *
	 * @example
	 * ```tsx
	 * <Alert.Root intent="info">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>Alert Title</Alert.Title>
	 *     <Alert.Description>Alert description text.</Alert.Description>
	 *   </Alert.Content>
	 * </Alert.Root>
	 * ```
	 */
	Content,
	/**
	 * The optional description of an alert.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert#alertdescription
	 *
	 * @example
	 * ```tsx
	 * <Alert.Root intent="info">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>Alert Title</Alert.Title>
	 *     <Alert.Description>Alert description text.</Alert.Description>
	 *   </Alert.Content>
	 * </Alert.Root>
	 * ```
	 */
	Description,
	/**
	 * An optional dismiss button that can be used to close the alert.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert#alertdismissiconbutton
	 *
	 * @example
	 * ```tsx
	 * <Alert.Root intent="info">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>Alert Title</Alert.Title>
	 *     <Alert.DismissIconButton />
	 *     <Alert.Description>Alert description text.</Alert.Description>
	 *   </Alert.Content>
	 * </Alert.Root>
	 * ```
	 */
	DismissIconButton,
	/**
	 * An optional icon that visually represents the intent of the Alert.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert#alerticon
	 *
	 * @example
	 * ```tsx
	 * <Alert.Root intent="info">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>Alert Title</Alert.Title>
	 *     <Alert.Description>Alert description text.</Alert.Description>
	 *   </Alert.Content>
	 * </Alert.Root>
	 * ```
	 */
	Icon,
	/**
	 * The title of an alert.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/alert#alerttitle
	 *
	 * @example
	 * ```tsx
	 * <Alert.Root intent="info">
	 *   <Alert.Icon />
	 *   <Alert.Content>
	 *     <Alert.Title>Alert Title</Alert.Title>
	 *     <Alert.Description>Alert description text.</Alert.Description>
	 *   </Alert.Content>
	 * </Alert.Root>
	 * ```
	 */
	Title,
} as const;

export {
	//,
	Alert,
};
