"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/Info";
import { MegaphoneIcon } from "@phosphor-icons/react/Megaphone";
import { WarningIcon } from "@phosphor-icons/react/Warning";
import { WarningDiamondIcon } from "@phosphor-icons/react/WarningDiamond";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { SvgOnly } from "../icon/svg-only.js";
import type { SvgAttributes } from "../icon/types.js";

// Why a separate file: these parts read the Alert context, so they need
// the client. `alert.tsx` keeps the static parts out of the compiler and off the client.

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

type AlertContextValue = {
	intent: AlertIntent;
	/**
	 * Whether `Alert.DismissIconButton` moves focus to a tabbable neighbor when
	 * it unmounts while it holds focus. `AlertCenter` sets `false`: its bar
	 * owns focus after a dismissal and lands it on the next alert's control.
	 */
	redirectDismissFocus: boolean;
};

const AlertContext = createContext<AlertContextValue | null>(null);

function useAlertContext() {
	const context = useContext(AlertContext);
	invariant(context, "Alert parts must be rendered inside Alert.Root.");
	return context;
}

/**
 * The single place the Alert context value is built. `Alert.Root` renders it
 * around its own chrome; it is additionally exported from this module for
 * `AlertCenter` (deliberately NOT re-exported from the package) to provide the
 * same context to authored banner parts whose React tree sits outside the
 * chrome `Alert.Root` that renders their DOM: `AlertCenter.Item` portals its
 * children into the chrome, and a portal severs React context from the DOM
 * ancestor, so the projecting composer supplies the same `intent` it hands the
 * chrome and parts like `Alert.Icon` resolve identically in both trees.
 *
 * @example
 * ```tsx
 * createPortal(
 *   <AlertContextProvider intent={intent}>
 *     <div className="contents" data-slot="alert-center-item-label">{children}</div>
 *   </AlertContextProvider>,
 *   host,
 * );
 * ```
 */
const AlertContextProvider = ({
	children,
	intent,
	redirectDismissFocus = true,
}: {
	intent: AlertIntent;
	children?: ReactNode;
	/**
	 * Whether `Alert.DismissIconButton` moves focus to a tabbable neighbor when
	 * it unmounts while it holds focus. Pass `false` when the composing
	 * component owns focus after a dismissal, as `AlertCenter` does.
	 *
	 * @default true
	 */
	redirectDismissFocus?: boolean;
}) => {
	const context: AlertContextValue = useMemo(
		() => ({ intent, redirectDismissFocus }),
		[intent, redirectDismissFocus],
	);
	return <AlertContext.Provider value={context}>{children}</AlertContext.Provider>;
};

type AlertIconProps = Omit<SvgAttributes, "children"> & {
	/**
	 * An optional icon that renders in place of the default icon for the Alert intent.
	 */
	svg?: ReactNode;
} & WithDataSlot;

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
 * An optional icon that visually represents the intent of the `Alert`.
 *
 * Pass the `svg` prop to replace the default icon.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert#alerticon
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
const Icon = ({ "data-slot": dataSlot, className, ref, svg, ...props }: AlertIconProps) => {
	const ctx = useAlertContext();
	const defaultIcon = defaultIcons[ctx.intent];

	return (
		<SvgOnly
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "alert-icon")}
			className={cx("size-5", className)}
			svg={svg ?? defaultIcon}
			{...props}
		/>
	);
};

export type {
	//,
	AlertIntent,
};

export {
	//,
	AlertContext,
	AlertContextProvider,
	Icon,
};
