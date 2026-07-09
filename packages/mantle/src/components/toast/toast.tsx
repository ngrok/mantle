"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import { WarningDiamondIcon } from "@phosphor-icons/react/WarningDiamond";
import {
	type ComponentProps,
	type ComponentRef,
	type ReactNode,
	createContext,
	forwardRef,
	useContext,
} from "react";
import * as ToastPrimitive from "sonner";
import type { WithAsChild } from "../../types/as-child.js";
import type { WithStyleProps } from "../../types/with-style-props.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon as IconComponent } from "../icon/icon.js";
import type { SvgOnlyProps } from "../icon/svg-only.js";
import { Slot } from "../slot/index.js";
import { useAppliedTheme } from "../theme/theme-provider.js";

type ToasterPrimitiveProps = ComponentProps<typeof ToastPrimitive.Toaster>;
type ToasterPrimitiveTheme = ToasterPrimitiveProps["theme"];

type ToasterProps = WithStyleProps &
	Pick<ToasterPrimitiveProps, "containerAriaLabel" | "dir" | "position"> & {
		/**
		 * Time in milliseconds that should elapse before automatically dismissing toasts.
		 * When set here, this will be the default duration for all toasts.
		 * @default 4000
		 */
		duration_ms?: number;
	};

/**
 * A container for displaying all toasts.
 *
 * Only one `<Toaster />` should be rendered in an app a time, preferably at the
 * root level of the app.
 *
 * @see https://mantle.ngrok.com/components/toast#toaster
 *
 * @example
 * ```tsx
 * <Toaster
 *   position="top-right"
 *   duration_ms={5000}
 * />
 * ```
 */
const Toaster = ({
	//,
	className,
	containerAriaLabel,
	dir,
	duration_ms = 4000,
	position = "top-center",
	style,
}: ToasterProps) => {
	const theme = useAppliedTheme();

	return (
		<ToastPrimitive.Toaster
			data-slot="toaster"
			className={cx("toaster overlay-prompt pointer-events-auto *:duration-200", className)}
			containerAriaLabel={containerAriaLabel}
			dir={dir}
			duration={duration_ms}
			gap={12}
			position={position ?? "top-center"}
			style={style}
			theme={theme as ToasterPrimitiveTheme} // we have additional themes that are not in the sonner types, so we need to cast for now
			toastOptions={{
				unstyled: true,
			}}
		/>
	);
};
Toaster.displayName = "Toaster";

const ToastIdContext = createContext<string | number>("");

type MakeToastOptions = {
	/**
	 * Time in milliseconds that should elapse before automatically closing the toast.
	 * Will default to the `<Toaster />`'s `duration_ms` if not provided.
	 *
	 * You can keep the toast open until manually dismissed by passing a value <= 0 or Number.POSITIVE_INFINITY
	 */
	duration_ms?: number;
	/**
	 * An optional custom ID for this toast. If not given, a unique ID is provided for you.
	 */
	id?: string;
};

/**
 * Create a toast. Provide a `<Toast.Root>` component as the `children` to be rendered
 * inside the `<Toaster />` section.
 *
 * @see https://mantle.ngrok.com/components/toast#maketoast
 *
 * @example
 * ```tsx
 * // Basic toast with auto-dismiss (default 4000ms, inherits from `<Toaster>`)
 * makeToast(
 *   <Toast.Root priority="success">
 *     <Toast.Icon />
 *     <Toast.Message>Operation completed successfully!</Toast.Message>
 *     <Toast.Action>Dismiss</Toast.Action>
 *   </Toast.Root>
 * );
 *
 * // Toast that stays open until manually dismissed
 * makeToast(
 *   <Toast.Root priority="warning">
 *     <Toast.Icon />
 *     <Toast.Message>Action required</Toast.Message>
 *     <Toast.Action>Dismiss</Toast.Action>
 *   </Toast.Root>,
 *   { duration_ms: Number.POSITIVE_INFINITY }
 * );
 * ```
 */
function makeToast(children: ReactNode, options?: MakeToastOptions) {
	let duration = options?.duration_ms;
	if (typeof duration === "number" && duration <= 0) {
		duration = Number.POSITIVE_INFINITY;
	}

	return ToastPrimitive.toast.custom(
		(toastId) => <ToastIdContext.Provider value={toastId}>{children}</ToastIdContext.Provider>,
		{
			//
			duration,
			// If a custom ID is provided, use it, else use the toastId provided by the sonner library
			// don't set an ID to `undefined` as it breaks the sonner library
			...(options?.id ? { id: options.id } : {}),
			unstyled: true,
		},
	);
}

const priorities = [
	//,
	"danger",
	"info",
	"success",
	"warning",
] as const;
type Priority = (typeof priorities)[number];

type ToastState = {
	priority: Priority;
};

const ToastStateContext = createContext<ToastState>({
	priority: "info",
});

type ToastProps = ComponentProps<"div"> &
	WithAsChild & {
		priority: Priority;
	};

/**
 * A succinct message with a priority that is displayed temporarily.
 * Toasts are used to provide feedback to the user without interrupting their workflow.
 *
 * @see https://mantle.ngrok.com/components/toast#toastroot
 *
 * @example
 * ```tsx
 * <Toast.Root priority="success">
 *   <Toast.Icon />
 *   <Toast.Message>Changes saved successfully!</Toast.Message>
 *   <Toast.Action>Undo</Toast.Action>
 * </Toast.Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"div">, ToastProps>(
	({ asChild, children, className, priority, ...props }, ref) => {
		const Component = asChild ? Slot : "div";

		return (
			<ToastStateContext.Provider value={{ priority }}>
				<Component
					data-slot="toast"
					className={cx(
						"relative flex items-start gap-2 text-sm font-sans",
						"p-3 pl-3.75",
						"bg-popover high-contrast:border-popover rounded rounded-r-[0.3125rem] border border-gray-500/35 shadow-lg",
						/**
						 * Do not apply overflow-hidden because we want the priority bar accent
						 * to overlap the toast border, else the border flows over the
						 * priority bar.
						 */
						className,
					)}
					ref={ref}
					{...props}
				>
					<PriorityBarAccent priority={priority} />
					{children}
				</Component>
			</ToastStateContext.Provider>
		);
	},
);
Root.displayName = "Toast";

type ToastIconProps = Partial<SvgOnlyProps>;

/**
 * An icon that visually represents the priority of the toast.
 * If you do not provide an icon, the default icon and color for the priority is used.
 *
 * @see https://mantle.ngrok.com/components/toast#toasticon
 *
 * @example
 * ```tsx
 * <Toast.Root priority="warning">
 *   <Toast.Icon />
 *   <Toast.Message>Warning message</Toast.Message>
 * </Toast.Root>
 * ```
 */
const Icon = forwardRef<ComponentRef<"svg">, ToastIconProps>(
	({ className, svg, ...props }, ref) => {
		const ctx = useContext(ToastStateContext);

		switch (ctx.priority) {
			case "danger":
				return (
					<IconComponent
						data-slot="toast-icon"
						className={cx("text-danger-600", className)}
						ref={ref}
						svg={svg ?? <WarningIcon weight="fill" />}
						{...props}
					/>
				);
			case "warning":
				return (
					<IconComponent
						data-slot="toast-icon"
						className={cx("text-warning-600", className)}
						ref={ref}
						svg={svg ?? <WarningDiamondIcon weight="fill" />}
						{...props}
					/>
				);
			case "success":
				return (
					<IconComponent
						data-slot="toast-icon"
						className={cx("text-success-600", className)}
						ref={ref}
						svg={svg ?? <CheckCircleIcon weight="fill" />}
						{...props}
					/>
				);
			case "info":
				return (
					<IconComponent
						//
						data-slot="toast-icon"
						className={cx("text-accent-600", className)}
						ref={ref}
						svg={<InfoIcon weight="fill" />}
						{...props}
					/>
				);
			default:
				throw new Error(`Unreachable Case: ${ctx.priority}`);
		}
	},
);
Icon.displayName = "ToastIcon";

type ToastActionProps = ComponentProps<"button"> & WithAsChild;

/**
 * A button that dismisses the toast when clicked.
 * You can prevent the toast from being dismissed `onClick` by calling `event.preventDefault()`
 *
 * @see https://mantle.ngrok.com/components/toast#toastaction
 *
 * @example
 * ```tsx
 * <Toast.Root priority="info">
 *   <Toast.Icon />
 *   <Toast.Message>File uploaded successfully</Toast.Message>
 *   <Toast.Action>View File</Toast.Action>
 * </Toast.Root>
 * ```
 */
const Action = forwardRef<ComponentRef<"button">, ToastActionProps>(
	({ asChild, className, onClick, ...props }, ref) => {
		const ctx = useContext(ToastIdContext);

		const Component = asChild ? Slot : "button";

		return (
			<Component
				data-slot="toast-action"
				className={cx(
					//,
					"shrink-0",
					// 👇 wiggle the bits so that icon buttons toast actions are aligned with the toast icon
					"data-icon-button:-mr-0.5 data-icon-button:-mt-0.5 data-icon-button:rounded-xs",
					className,
				)}
				onClick={(event) => {
					onClick?.(event);
					if (event.defaultPrevented) {
						return;
					}
					ToastPrimitive.toast.dismiss(ctx);
				}}
				ref={ref}
				{...props}
			/>
		);
	},
);
Action.displayName = "ToastAction";

type ToastMessageProps = ComponentProps<"p"> & WithAsChild;

/**
 * The message content of the toast.
 *
 * @see https://mantle.ngrok.com/components/toast#toastmessage
 *
 * @example
 * ```tsx
 * <Toast.Root priority="success">
 *   <Toast.Icon />
 *   <Toast.Message>Your changes have been saved</Toast.Message>
 * </Toast.Root>
 * ```
 */
const Message = forwardRef<ComponentRef<"p">, ToastMessageProps>(
	({ asChild, className, ...props }, ref) => {
		const Component = asChild ? Slot : "p";

		return (
			<Component
				//
				data-slot="toast-message"
				className={cx("text-strong flex-1 text-sm font-body", className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Message.displayName = "ToastMessage";

/**
 * A succinct message that is displayed temporarily. Toasts are used to provide
 * feedback to the user without interrupting their workflow.
 *
 * @see https://mantle.ngrok.com/components/toast
 *
 * @example
 * Composition:
 * ```
 * Toast.Root
 * ├── Toast.Icon
 * ├── Toast.Message
 * └── Toast.Action
 * ```
 *
 * @example
 * ```tsx
 * makeToast(
 *   <Toast.Root priority="success">
 *     <Toast.Icon />
 *     <Toast.Message>Operation completed successfully!</Toast.Message>
 *     <Toast.Action>Dismiss</Toast.Action>
 *   </Toast.Root>
 * );
 * ```
 */
const Toast = {
	/**
	 * A succinct message with a priority that is displayed temporarily.
	 *
	 * @see https://mantle.ngrok.com/components/toast#toastroot
	 *
	 * @example
	 * ```tsx
	 * <Toast.Root priority="success">
	 *   <Toast.Icon />
	 *   <Toast.Message>Changes saved successfully!</Toast.Message>
	 *   <Toast.Action>Undo</Toast.Action>
	 * </Toast.Root>
	 * ```
	 */
	Root,
	/**
	 * A button that dismisses the toast when clicked.
	 *
	 * @see https://mantle.ngrok.com/components/toast#toastaction
	 *
	 * @example
	 * ```tsx
	 * <Toast.Root priority="info">
	 *   <Toast.Icon />
	 *   <Toast.Message>File uploaded successfully</Toast.Message>
	 *   <Toast.Action>View File</Toast.Action>
	 * </Toast.Root>
	 * ```
	 */
	Action,
	/**
	 * An icon that visually represents the priority of the toast.
	 *
	 * @see https://mantle.ngrok.com/components/toast#toasticon
	 *
	 * @example
	 * ```tsx
	 * <Toast.Root priority="warning">
	 *   <Toast.Icon />
	 *   <Toast.Message>Warning message</Toast.Message>
	 * </Toast.Root>
	 * ```
	 */
	Icon,
	/**
	 * The message content of the toast.
	 *
	 * @see https://mantle.ngrok.com/components/toast#toastmessage
	 *
	 * @example
	 * ```tsx
	 * <Toast.Root priority="success">
	 *   <Toast.Icon />
	 *   <Toast.Message>Your changes have been saved</Toast.Message>
	 * </Toast.Root>
	 * ```
	 */
	Message,
} as const;

export {
	//,
	makeToast,
	Toast,
	Toaster,
};

export type {
	//,
	Priority,
};

/**
 * @private
 *
 * Allows any mantle floating prompt (e.g. toasts and notifications) to be interacted with
 * even when a modaled view (e.g. dialog, sheet, etc) is open and a focus trap is active.
 *
 * Without this, interacting with the prompt would close the modaled view.
 *
 * @example
 * ```tsx
 * <Dialog.Root onInteractOutside={preventCloseOnPromptInteraction}>
 *   <Dialog.Content>
 *     <p>Dialog content</p>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
export function preventCloseOnPromptInteraction(
	event: CustomEvent | PointerEvent | MouseEvent | TouchEvent | FocusEvent,
) {
	if (!(event.target instanceof Element)) {
		return;
	}

	if (event.target.closest(".overlay-prompt")) {
		event.preventDefault();
	}
}

const priorityBackgroundColor = {
	info: "bg-accent-600",
	warning: "bg-warning-600",
	success: "bg-success-600",
	danger: "bg-danger-600",
} as const satisfies Record<Priority, string>;

type PriorityBarAccentProps = Omit<ComponentProps<"div">, "children"> & {
	priority: Priority;
};

/**
 * @private
 *
 * A colored bar that visually represents the priority of the toast.
 */
function PriorityBarAccent({ className, priority, ...props }: PriorityBarAccentProps) {
	return (
		<div
			aria-hidden
			className={cx(
				//
				"z-1 absolute -inset-px right-auto w-1.5 rounded-l",
				priorityBackgroundColor[priority],
				className,
			)}
			{...props}
		/>
	);
}
