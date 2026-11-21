// Why "use no memo": a server component can render this file. A stateless part gains little from
// the compiler, and its cache hook would make the build mark the chunk "use client".
"use no memo";

import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { $cssProperties } from "../../types/css-properties.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";
import { AlertContextProvider, type AlertIntent } from "./alert-context.js";

const appearances = ["banner", "default"] as const;
type Appearance = (typeof appearances)[number];

const alertVariants = cva(
	"relative flex w-full gap-1.5 rounded-md border p-2.5 text-sm font-sans",
	{
		variants: {
			/**
			 * The intent of the Alert: the status its color communicates to the user,
			 * determining the color and styling of the Alert.
			 */
			intent: {
				danger:
					"border-danger-500/50 bg-danger-500/10 text-danger-700 [&_code]:bg-danger-500/10 [&_code]:border-danger-500/20 [&_code]:text-danger-900 [&_a:not([data-slot~=button])]:text-danger-700 [&_a:not([data-slot~=button])]:underline",
				important:
					"border-important-500/50 bg-important-500/10 text-important-700 [&_code]:bg-important-500/10 [&_code]:border-important-500/20 [&_code]:text-important-900 [&_a:not([data-slot~=button])]:text-important-700 [&_a:not([data-slot~=button])]:underline",
				info: "border-info-500/50 bg-info-500/10 text-info-700 [&_code]:bg-info-500/10 [&_code]:border-info-500/20 [&_code]:text-info-900 [&_a:not([data-slot~=button])]:text-info-700 [&_a:not([data-slot~=button])]:underline",
				// neutral: "border-neutral-500/50 bg-neutral-500/10 text-neutral-700",
				success:
					"border-success-500/50 bg-success-500/10 text-success-700 [&_code]:bg-success-500/10 [&_code]:border-success-500/20 [&_code]:text-success-900 [&_a:not([data-slot~=button])]:text-success-700 [&_a:not([data-slot~=button])]:underline",
				warning:
					"border-warning-500/50 bg-warning-500/10 text-warning-700 [&_code]:bg-warning-500/10 [&_code]:border-warning-500/20 [&_code]:text-warning-900 [&_a:not([data-slot~=button])]:text-warning-700 [&_a:not([data-slot~=button])]:underline",
			} as const satisfies Record<AlertIntent, string>,
			/**
			 * Controls the visual style of the Alert.
			 * - "default" keeps the standard rounded corners and borders.
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
	 * The intent of the Alert: the status its color communicates to the user,
	 * determining the color and styling of the Alert.
	 */
	intent: AlertIntent;
	/**
	 * Controls the visual style of the Alert.
	 * - "default" keeps the standard rounded corners and borders.
	 * - "banner" creates a banner-style alert with no rounded corners, sticky positioning, and no left/right borders.
	 *
	 * @default "default"
	 */
	appearance?: Appearance;
} & WithDataSlot;

/**
 * Displays a callout for user attention. Root container for all Alert sub-components.
 *
 * It has no ARIA role of its own. When your code inserts the alert after an
 * action, pass `role="alert"` so a screen reader announces it. Assistive tech
 * can miss a live region that mounts already populated, so also move focus to
 * the alert with `tabIndex={-1}`. Pass `role="status"` on a region that is
 * already mounted for a less urgent message.
 *
 * Trailing controls inherit these public CSS variables:
 *
 * | Variable | Default | Purpose |
 * | --- | --- | --- |
 * | `--alert-control-color` | `var(--color-<intent>-700)` | Control text and icon color. |
 * | `--alert-control-hover-color` | `var(--color-<intent>-800)` | Control text and icon color on hover. |
 * | `--alert-control-hover-bg` | `color-mix(in oklab, var(--color-<intent>-500) 10%, transparent)` | Control background on hover. |
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertroot
 *
 * @example
 * ```tsx
 * <Alert.Root intent="info">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Alert Title</Alert.Title>
 *     <Alert.Description>
 *       Alert description text.
 *     </Alert.Description>
 *     <Alert.ExpandButton count={2} expanded={false} />
 *     <Alert.DismissIconButton />
 *   </Alert.Content>
 * </Alert.Root>
 *```
 */
const Root = ({
	"data-slot": dataSlot,
	appearance = "default",
	className,
	intent,
	ref,
	style,
	...props
}: AlertProps) => {
	return (
		<AlertContextProvider intent={intent}>
			<div
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "alert")}
				className={cx(
					alertVariants({ appearance, intent }),
					// Each trailing control reserves its own space: the root's right
					// padding makes room for dismiss, and the content's padding makes
					// room for expand. Dismiss stays rightmost, so expand moves left of
					// it. The rule reads the presence attributes, not the slots, because
					// `AlertCenter.DismissIconButton` replaces the dismiss slot value.
					// `--alert-dismiss-room` is the dismiss width plus its inset and the
					// gap. The `xs` and `2xs` sizes fit in the default `sm` room.
					"[--alert-dismiss-room:--spacing(10)]",
					"has-[[data-alert-dismiss][data-size=md]]:[--alert-dismiss-room:--spacing(12)]",
					"has-[[data-alert-dismiss][data-size=lg]]:[--alert-dismiss-room:--spacing(13)]",
					"has-[[data-alert-dismiss][data-size=xl]]:[--alert-dismiss-room:--spacing(15)]",
					"has-data-alert-dismiss:pr-(--alert-dismiss-room)",
					"has-data-alert-dismiss:**:data-alert-expand:right-(--alert-dismiss-room)",
					"has-data-alert-expand:**:data-[slot~=alert-content]:pr-16",
					"md:has-data-alert-expand:**:data-[slot~=alert-content]:pr-24",
					className,
				)}
				style={$cssProperties({
					"--alert-control-color": alertControlTextColor(intent),
					"--alert-control-hover-color": alertControlHoverColor(intent),
					"--alert-control-hover-bg": alertControlHoverBgColor(intent),
					...style,
				})}
				{...props}
			/>
		</AlertContextProvider>
	);
};

/**
 * The container for the content slot of an alert. Place the title, description,
 * and trailing controls as direct children.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertcontent
 *
 * @example
 * ```tsx
 * <Alert.Root intent="info">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Alert Title</Alert.Title>
 *     <Alert.Description>
 *       Alert description text.
 *     </Alert.Description>
 *     <Alert.ExpandButton count={2} expanded={false} />
 *     <Alert.DismissIconButton />
 *   </Alert.Content>
 * </Alert.Root>
 *```
 */
const Content = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "alert-content")}
		className={cx("min-w-0 flex-1 has-data-alert-dismiss:pr-6", className)}
		{...props}
	/>
);

type AlertTitleProps = ComponentProps<"h5"> & WithAsChild & WithDataSlot;

/**
 * The title of an alert. Default renders as an h5 element, use asChild to render something else.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alerttitle
 *
 * @example
 * ```tsx
 * <Alert.Root intent="info">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Alert Title</Alert.Title>
 *     <Alert.Description>
 *       Alert description text.
 *     </Alert.Description>
 *     <Alert.ExpandButton count={2} expanded={false} />
 *     <Alert.DismissIconButton />
 *   </Alert.Content>
 * </Alert.Root>
 *```
 */
const Title = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: AlertTitleProps) => {
	const Component = asChild ? Slot : "h5";

	return (
		<Component
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "alert-title")}
			className={cx("font-medium", className)}
			{...props}
		/>
	);
};

type AlertDescriptionProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The optional description of an alert.
 * Renders as a `div` by default, but can be changed to any other element using
 * the `asChild` prop.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alertdescription
 *
 * @example
 * ```tsx
 * <Alert.Root intent="info">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Alert Title</Alert.Title>
 *     <Alert.Description>
 *       Alert description text.
 *     </Alert.Description>
 *     <Alert.ExpandButton count={2} expanded={false} />
 *     <Alert.DismissIconButton />
 *   </Alert.Content>
 * </Alert.Root>
 * ```
 */
const Description = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: AlertDescriptionProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "alert-description")}
			className={cx("text-sm", className)}
			{...props}
		/>
	);
};

const alertControlTextColor = (intent: AlertIntent) => `var(--color-${intent}-700)`;

const alertControlHoverColor = (intent: AlertIntent) => `var(--color-${intent}-800)`;

const alertControlHoverBgColor = (intent: AlertIntent) =>
	`color-mix(in oklab, var(--color-${intent}-500) 10%, transparent)`;

export {
	//,
	Root,
	Content,
	Description,
	Title,
};
