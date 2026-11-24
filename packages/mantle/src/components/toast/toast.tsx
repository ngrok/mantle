"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import { WarningDiamondIcon } from "@phosphor-icons/react/WarningDiamond";
import {
	type ComponentProps,
	type MouseEvent,
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type * as Sonner from "sonner";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import type { WithAsChild } from "../../types/as-child.js";
import type { WithStyleProps } from "../../types/with-style-props.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Icon as IconComponent } from "../icon/icon.js";
import type { SvgOnlyProps } from "../icon/svg-only.js";
import { Slot } from "../slot/index.js";
import { canUseDOM } from "../browser-only/can-use-dom.js";
import { OverlayPrompt } from "../overlay-prompt/overlay-prompt.js";

type ToasterPrimitiveProps = ComponentProps<typeof Sonner.Toaster>;

type ToasterProps = WithStyleProps &
	Pick<ToasterPrimitiveProps, "containerAriaLabel" | "dir" | "position"> & {
		/**
		 * Time in milliseconds that should elapse before automatically dismissing toasts.
		 * When set here, this will be the default duration for all toasts.
		 * A value `<= 0` or `Number.POSITIVE_INFINITY` keeps toasts open until the user dismisses them.
		 * @default 4000
		 */
		duration_ms?: number;
	};

/**
 * Resolves a `duration_ms` option to the value sonner expects. A value `<= 0`
 * keeps a toast open until the user dismisses it, so it becomes
 * `Number.POSITIVE_INFINITY`; every other value passes through unchanged.
 *
 * @example
 * ```ts
 * resolveToastDuration(0); // Number.POSITIVE_INFINITY
 * resolveToastDuration(5000); // 5000
 * resolveToastDuration(undefined); // undefined
 * ```
 */
function resolveToastDuration(duration_ms: number | undefined) {
	if (typeof duration_ms === "number" && duration_ms <= 0) {
		return Number.POSITIVE_INFINITY;
	}
	return duration_ms;
}

/**
 * The sonner module once its chunk loads. A toast renders only after it loads,
 * so the parts inside a toast read it without a wait.
 */
let sonner: typeof Sonner | undefined;
let isLoadingSonner = false;
/** The toasts that `makeToast` created before sonner loaded, in call order. */
const pendingToasts: ((module: typeof Sonner) => void)[] = [];
const sonnerListeners = new Set<() => void>();

/**
 * Starts the sonner chunk load, once. When it loads, the pending toasts go to
 * sonner in call order, and each mounted `Toaster` renders.
 *
 * @example
 * ```ts
 * void loadSonner(); // the first call starts the load; later calls do nothing
 * ```
 */
async function loadSonner(): Promise<void> {
	if (sonner != null || isLoadingSonner) {
		return;
	}
	isLoadingSonner = true;
	try {
		sonner = await import("sonner");
	} catch (error) {
		// Why no rethrow: a chunk that fails to load must not crash the page. The toasts
		// stay pending, and the next `makeToast` call tries again; a browser that caches failed module fetches fails it again.
		isLoadingSonner = false;
		reportError(error);
		return;
	}
	for (const show of pendingToasts.splice(0)) {
		show(sonner);
	}
	for (const listener of sonnerListeners) {
		listener();
	}
}

/**
 * Subscribes a `Toaster` to the sonner load. Returns the function that
 * removes the subscription.
 */
function subscribeToSonner(onLoad: () => void): () => void {
	sonnerListeners.add(onLoad);
	return () => {
		sonnerListeners.delete(onLoad);
	};
}

/** The sonner module, or `undefined` until it loads. */
function getSonner(): typeof Sonner | undefined {
	return sonner;
}

/**
 * A container for displaying all toasts.
 *
 * Only one `<Toaster />` should be rendered in an app a time, preferably at the
 * root level of the app.
 *
 * The toasts render in a container on `<body>`. The toast code loads in its
 * own chunk when the browser is idle after hydration, or on the first
 * `makeToast` call if that comes first. While a modal `Dialog`,
 * `AlertDialog`, or `Sheet` is open, the container moves into it, so the toasts
 * paint above the dialog and stay usable.
 *
 * @see https://mantle.ngrok.com/components/feedback/toast#toaster
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
	const isHydrated = useIsHydrated();
	const loadedSonner = useSyncExternalStore(subscribeToSonner, getSonner, getSonner);
	// Why idle: sonner stays off the critical path. A `makeToast` call that
	// comes first starts the load sooner.
	useEffect(() => {
		if (typeof requestIdleCallback === "function") {
			const handle = requestIdleCallback(() => void loadSonner());
			return () => cancelIdleCallback(handle);
		}
		// Why the fallback: Safari has no `requestIdleCallback`.
		const handle = setTimeout(() => void loadSonner(), 0);
		return () => clearTimeout(handle);
	}, []);

	if (!isHydrated) {
		return null;
	}

	// Why `<body>`: the toasts stay out of the stacking context of the place
	// that renders the `Toaster`. Why `OverlayPrompt`: an open modal dialog makes
	// the rest of the page inert, so the toasts move into it.
	// Why the placeholder: assistive technology finds the notifications landmark
	// from hydration on, as with sonner's own section, which replaces it on load.
	return createPortal(
		<OverlayPrompt>
			{loadedSonner == null ? (
				<section
					aria-label={`${containerAriaLabel ?? "Notifications"} alt+T`}
					aria-live="polite"
					aria-relevant="additions text"
					aria-atomic="false"
					tabIndex={-1}
				/>
			) : (
				<loadedSonner.Toaster
					data-slot="toaster"
					className={cx("toaster pointer-events-auto [&>*]:duration-200", className)}
					containerAriaLabel={containerAriaLabel}
					dir={dir}
					duration={resolveToastDuration(duration_ms)}
					gap={12}
					position={position ?? "top-center"}
					style={style}
					toastOptions={{
						unstyled: true,
					}}
				/>
			)}
		</OverlayPrompt>,
		document.body,
	);
};

const ToastIdContext = createContext<string | number>("");

/**
 * The key of the generated toast ID counter on `globalThis`. Every copy of this
 * module (a second install, a hot reload) shares sonner's one toast store, so
 * the copies share one counter.
 */
const TOAST_COUNT_KEY = Symbol.for("@ngrok/mantle/toast-count");
// Why the assertion: `globalThis` has no type for a symbol key.
const toastCountStore = globalThis as typeof globalThis & { [TOAST_COUNT_KEY]?: number };

/** Returns the next generated toast ID: `-1`, then `-2`, and so on, page-wide. */
function nextGeneratedToastId(): number {
	const id = (toastCountStore[TOAST_COUNT_KEY] ?? 0) - 1;
	toastCountStore[TOAST_COUNT_KEY] = id;
	return id;
}

type MakeToastOptions = {
	/**
	 * Time in milliseconds that should elapse before automatically closing the toast.
	 * Defaults to the `<Toaster />`'s `duration_ms` when omitted.
	 *
	 * You can keep the toast open until manually dismissed by passing a value <= 0 or Number.POSITIVE_INFINITY
	 */
	duration_ms?: number;
	/**
	 * An optional custom ID for this toast. When omitted, the toast gets a unique generated ID.
	 */
	id?: string;
};

/**
 * Create a toast. Pass a `<Toast.Root>` component as the `children` to render
 * inside the `<Toaster />` section. Returns the toast's ID.
 *
 * A toast made before the toast code loads waits for it, and the waiting
 * toasts show in call order. This includes a toast made before hydration.
 *
 * @see https://mantle.ngrok.com/components/feedback/toast#maketoast
 *
 * @example
 * ```tsx
 * // Basic toast with auto-dismiss (default 4000ms, inherits from `<Toaster>`)
 * makeToast(
 *   <Toast.Root intent="success">
 *     <Toast.Icon />
 *     <Toast.Message>Operation completed successfully!</Toast.Message>
 *     <Toast.Action>Dismiss</Toast.Action>
 *   </Toast.Root>
 * );
 *
 * // Toast that stays open until manually dismissed
 * makeToast(
 *   <Toast.Root intent="warning">
 *     <Toast.Icon />
 *     <Toast.Message>Action required</Toast.Message>
 *     <Toast.Action>Dismiss</Toast.Action>
 *   </Toast.Root>,
 *   { duration_ms: Number.POSITIVE_INFINITY }
 * );
 * ```
 */
function makeToast(children: ReactNode, options?: MakeToastOptions) {
	const duration = resolveToastDuration(options?.duration_ms);
	// Why negative numbers: the caller needs the ID before sonner loads. A custom ID
	// is a string and sonner counts up from 1, so neither can match one.
	const id = options?.id ? options.id : nextGeneratedToastId();
	const show = (module: typeof Sonner) => {
		module.toast.custom(
			(toastId) => <ToastIdContext.Provider value={toastId}>{children}</ToastIdContext.Provider>,
			{ duration, id, unstyled: true },
		);
	};

	// Why no queue on the server: no toast renders there, and the queue would
	// keep the toasts of each request.
	if (sonner != null) {
		show(sonner);
	} else if (canUseDOM()) {
		pendingToasts.push(show);
		void loadSonner();
	}
	return id;
}

const intents = [
	//,
	"danger",
	"info",
	"success",
	"warning",
] as const;

/**
 * The intent of a toast: the tone or status that the toast's color communicates.
 */
type ToastIntent = (typeof intents)[number];

/** The intent of the nearest `Toast.Root`, which `Toast.Icon` reads. */
const ToastIntentContext = createContext<ToastIntent>("info");

/**
 * Props for `Toast.Root`. `asChild` is omitted: the root renders the intent
 * accent bar next to the label div holding `children`, so a slot would receive
 * two elements and throw.
 */
type ToastProps = ComponentProps<"div"> & {
	/**
	 * The intent of the toast: the tone or status that the toast's color communicates.
	 */
	intent: ToastIntent;
} & WithDataSlot;

/**
 * A brief message with an intent that shows the result of an action, then
 * goes away on its own. The intent is the tone or status that the toast's
 * color communicates.
 * Toasts give the user feedback without interrupting their workflow.
 *
 * **Structure.** `children` render inside a
 * `<div data-slot="toast-label">`. The intent accent bar is a permanent element
 * sibling, so without the wrapper a bare text child is never a lone child: a
 * browser translation engine reparents that text node, and the removal React
 * runs when the content changes shape or goes away throws. The wrapper is a
 * `<div>` because `Toast.Message` renders a `<p>`, which a `<span>` may not
 * contain. It is `display: contents`, so the icon, the message, and an action
 * stay flex items of the root and `Toast.Message`'s `flex-1` still resolves.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"toast"` | On the toast root. |
 * | `data-slot` | `"toast-label"` | On the `<div>` wrapping `children`, not only the message text. |
 *
 * @see https://mantle.ngrok.com/components/feedback/toast#toastroot
 *
 * @example
 * ```tsx
 * <Toast.Root intent="success">
 *   <Toast.Icon />
 *   <Toast.Message>Changes saved successfully!</Toast.Message>
 *   <Toast.Action>Undo</Toast.Action>
 * </Toast.Root>
 * ```
 */
const Root = ({
	"data-slot": dataSlot,
	children,
	className,
	intent,
	ref,
	...props
}: ToastProps) => {
	return (
		<ToastIntentContext.Provider value={intent}>
			<div
				data-slot={joinDataSlot(dataSlot, "toast")}
				className={cx(
					"relative flex items-start gap-2 text-sm font-sans",
					"p-3 pl-3.75",
					"bg-popover rounded rounded-r-[0.3125rem] border border-gray-500/35 shadow-lg",
					/**
					 * Do not apply overflow-hidden because we want the intent bar accent
					 * to overlap the toast border, else the border flows over the
					 * intent bar.
					 */
					className,
				)}
				ref={ref}
				{...props}
			>
				<IntentBarAccent intent={intent} />
				{/* Why the label div: decisions/2026-08-04-translation-safe-label-wrappers.md
				    Why a div and not a span: `Toast.Message` renders a `<p>`, which a
				    `<span>` may not contain. */}
				<div data-slot="toast-label" className="contents">
					{children}
				</div>
			</div>
		</ToastIntentContext.Provider>
	);
};

type ToastIconProps = Partial<SvgOnlyProps> & WithDataSlot;

/**
 * An icon that visually represents the intent of the toast.
 * If you do not pass an icon, the toast uses the default icon and color for the intent.
 *
 * @see https://mantle.ngrok.com/components/feedback/toast#toasticon
 *
 * @example
 * ```tsx
 * <Toast.Root intent="warning">
 *   <Toast.Icon />
 *   <Toast.Message>Warning message</Toast.Message>
 *   <Toast.Action>Dismiss</Toast.Action>
 * </Toast.Root>
 * ```
 */
const Icon = ({ "data-slot": dataSlot, className, svg, ref, ...props }: ToastIconProps) => {
	const intent = useContext(ToastIntentContext);
	const icon = intentIcons[intent];

	return (
		<IconComponent
			data-slot={joinDataSlot(dataSlot, "toast-icon")}
			className={cx(icon.className, className)}
			ref={ref}
			svg={svg ?? icon.svg}
			{...props}
		/>
	);
};

type ToastActionProps = ComponentProps<"button"> & WithAsChild & WithDataSlot;

/**
 * A button that dismisses the toast when clicked.
 * You can prevent the toast from being dismissed `onClick` by calling `event.preventDefault()`
 *
 * @see https://mantle.ngrok.com/components/feedback/toast#toastaction
 *
 * @example
 * ```tsx
 * <Toast.Root intent="info">
 *   <Toast.Icon />
 *   <Toast.Message>File uploaded successfully</Toast.Message>
 *   <Toast.Action>View File</Toast.Action>
 * </Toast.Root>
 * ```
 */
const Action = ({
	"data-slot": dataSlot,
	asChild,
	className,
	onClick,
	ref,
	...props
}: ToastActionProps) => {
	const ctx = useContext(ToastIdContext);

	const Component = asChild ? Slot : "button";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "toast-action")}
			className={cx(
				//,
				"shrink-0",
				// 👇 wiggle the bits so that icon buttons toast actions are aligned with the toast icon
				"data-icon-button:-mr-0.5 data-icon-button:-mt-0.5 data-icon-button:rounded-xs",
				className,
			)}
			// Why: the asChild union (Slot | "button") no longer infers a single
			// event type; React event handlers are bivariant, so pin the param.
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) {
					return;
				}
				sonner?.toast.dismiss(ctx);
			}}
			ref={ref}
			{...props}
		/>
	);
};

type ToastMessageProps = ComponentProps<"p"> & WithAsChild & WithDataSlot;

/**
 * The message content of the toast.
 *
 * @see https://mantle.ngrok.com/components/feedback/toast#toastmessage
 *
 * @example
 * ```tsx
 * <Toast.Root intent="success">
 *   <Toast.Icon />
 *   <Toast.Message>Your changes have been saved</Toast.Message>
 *   <Toast.Action>Undo</Toast.Action>
 * </Toast.Root>
 * ```
 */
const Message = ({
	"data-slot": dataSlot,
	asChild,
	className,
	ref,
	...props
}: ToastMessageProps) => {
	const Component = asChild ? Slot : "p";

	return (
		<Component
			//
			data-slot={joinDataSlot(dataSlot, "toast-message")}
			className={cx("text-strong flex-1 text-sm font-body", className)}
			ref={ref}
			{...props}
		/>
	);
};

export {
	//,
	makeToast,
	resolveToastDuration,
	Root,
	Action,
	Icon,
	Message,
	Toaster,
};

export type {
	//,
	ToastIntent,
};

/** The default icon and its tone class for each intent. */
const intentIcons = {
	danger: { className: "text-danger-600", svg: <WarningIcon weight="fill" /> },
	info: { className: "text-accent-600", svg: <InfoIcon weight="fill" /> },
	success: { className: "text-success-600", svg: <CheckCircleIcon weight="fill" /> },
	warning: { className: "text-warning-600", svg: <WarningDiamondIcon weight="fill" /> },
} as const satisfies Record<ToastIntent, { className: string; svg: ReactNode }>;

const intentBackgroundColor = {
	info: "bg-accent-600",
	warning: "bg-warning-600",
	success: "bg-success-600",
	danger: "bg-danger-600",
} as const satisfies Record<ToastIntent, string>;

type IntentBarAccentProps = Omit<ComponentProps<"div">, "children"> & {
	intent: ToastIntent;
};

/**
 * @private
 *
 * A colored bar that visually represents the intent of the toast.
 */
function IntentBarAccent({ className, intent, ...props }: IntentBarAccentProps) {
	return (
		<div
			aria-hidden
			className={cx(
				//
				"z-1 absolute -inset-px right-auto w-1.5 rounded-l",
				intentBackgroundColor[intent],
				className,
			)}
			{...props}
		/>
	);
}
