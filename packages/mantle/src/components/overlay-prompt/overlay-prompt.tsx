"use client";

import { type ComponentProps, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { canUseDOM } from "../browser-only/can-use-dom.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { joinDataSlot, type WithDataSlot } from "../../utils/data-slot.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import { attachPromptHost } from "./host.js";

/** Props for `OverlayPrompt`. */
type OverlayPromptProps = Pick<ComponentProps<"div">, "children" | "ref"> & WithDataSlot;

/** Creates the element that holds the content and moves into an open modal. */
function createHost(): HTMLDivElement {
	const host = document.createElement("div");
	// Why `overlay-prompt`: a press in the content does not count as a press
	// outside an open dialog, so it does not close it.
	host.className = "overlay-prompt";
	// Why `contents`: the host adds no box, so the content lays out the same in
	// place and in the dialog.
	host.style.display = "contents";
	return host;
}

/**
 * Keeps its content usable above an open `Dialog`, `AlertDialog`, or `Sheet`.
 * An open modal dialog makes the rest of the page inert: no click, focus, or
 * screen reader reaches it. While one is open, the content moves into the top
 * modal dialog, at every depth of a stack, so it paints above the dialog, takes
 * clicks and focus, and a press in it does not close the dialog. When the last
 * modal closes, the content moves back to where you render it, so a form owns
 * its buttons and Tab reaches them in page order. With no dialog open, it
 * costs one wrapper and does no work. `Toaster` and `Sandbar` use it.
 *
 * Give it one element that positions itself, such as a `fixed` banner. The
 * wrapper renders no box (`display: contents`). After hydration, the content
 * renders through a portal, so it mounts again one time when the page
 * hydrates and never when a dialog opens or closes. In Chrome and Firefox the
 * move keeps focus and keeps a frame loaded; Safari has no state-keeping move,
 * so a frame in the content reloads when a dialog opens or closes. A submit
 * button in the content leaves its form while a dialog is open: give it a
 * `form` attribute, or submit from its click handler.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"overlay-prompt"` | The wrapper that marks where the content lives when no dialog is open. |
 *
 * @useWhen Keep a banner, a bar, or another floating element that is not part of a dialog usable above
 * an open dialog or sheet, such as a cookie banner.
 *
 * @siblings
 * - `Toast`: show short notifications; its `Toaster` already stays above dialogs.
 * - `Sandbar`: show a save bar for unsaved changes; it already stays above dialogs.
 * - `Dialog`: put a control that belongs to the task inside the dialog content instead.
 *
 * @see https://mantle.ngrok.com/components/primitives/overlay-prompt
 *
 * @example
 * ```tsx
 * <OverlayPrompt>
 *   <div className="pointer-events-none fixed inset-x-0 bottom-4 z-max flex justify-center">
 *     <div role="group" aria-label="Cookie preferences" className="pointer-events-auto">
 *       <Button type="button" appearance="filled" onClick={acceptAll}>
 *         Accept all
 *       </Button>
 *     </div>
 *   </div>
 * </OverlayPrompt>
 * ```
 */
// Why no `asChild`: the wrapper only marks the home of the content. The
// content moves without it, so a cloned element would stay behind.
function OverlayPrompt({ children, "data-slot": dataSlot, ref }: OverlayPromptProps) {
	const isHydrated = useIsHydrated();
	const [host] = useState(() => (canUseDOM() ? createHost() : null));
	// Why: the content mounts once the host is in the document, so its layout
	// effects and `autoFocus` run on connected elements.
	const [attached, setAttached] = useState(false);
	const homeRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(homeRef, ref);
	useLayoutEffect(() => {
		const home = homeRef.current;
		if (host == null || home == null) {
			return undefined;
		}
		const detach = attachPromptHost(host, home);
		setAttached(true);
		return detach;
	}, [host]);

	// Why a layer container: a float composed in the content, such as a
	// popover, portals in here, so it moves with the content and paints above
	// the dialog.
	const content = (
		<LayerContainer className="contents" modal={false}>
			{children}
		</LayerContainer>
	);
	let rendered: ReactNode = content;
	if (isHydrated && host != null) {
		rendered = attached ? createPortal(content, host) : null;
	}
	return (
		<div
			className="contents"
			data-slot={joinDataSlot(dataSlot, "overlay-prompt")}
			ref={composedRef}
		>
			{rendered}
		</div>
	);
}

export {
	//,
	OverlayPrompt,
};

export type {
	//,
	OverlayPromptProps,
};
