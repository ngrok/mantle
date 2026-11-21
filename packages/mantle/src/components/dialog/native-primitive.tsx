"use client";

import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { createContext, useContext, useId, useLayoutEffect, useMemo, useRef } from "react";
import invariant from "tiny-invariant";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";
import { setTopModal } from "../toast/toaster-host.js";

/**
 * The behavior that `@ngrok/mantle/dialog/native` and
 * `@ngrok/mantle/sheet/native` share: a modal `<dialog>` that the browser opens,
 * traps focus in, closes on Escape, and returns focus from. Open and close are
 * DOM calls, so an uncontrolled tap renders no React. The parts here carry no
 * look; each component composes its own presentation onto them.
 */

/** What every part reads from its `Root`. */
type RootState = {
	/** The `id` of the `<dialog>`, which each trigger names in `aria-controls`. */
	contentId: string;
	/** The `id` of the title, which the `<dialog>` names in `aria-labelledby`. */
	titleId: string;
	/** The controlled open state, or `undefined` when the `<dialog>` owns it. */
	open: boolean | undefined;
	defaultOpen: boolean;
	onOpenChange: (open: boolean) => void;
};

const RootContext = createContext<RootState | null>(null);

/** The `RootState` of the enclosing `Root`. Throws outside one. */
function useRootState(part: string): RootState {
	const state = useContext(RootContext);
	invariant(
		state != null,
		`The native dialog part \`${part}\` must be rendered inside its \`Root\`.`,
	);
	return state;
}

/** The open native dialogs, in open order. The last one is on top. */
const openDialogs: HTMLDialogElement[] = [];

/**
 * Writes the open state of `dialog` to the DOM that mirrors it: `data-state` on
 * the `<dialog>` and its panel, `aria-expanded` and `data-state` on each
 * trigger, and the toaster hosts, which follow the top open dialog. A write
 * that changes nothing touches no attribute.
 */
function writeOpenState({ dialog, open }: { dialog: HTMLDialogElement; open: boolean }): void {
	const state = open ? "open" : "closed";
	if (dialog.dataset.state !== state) {
		dialog.dataset.state = state;
		dialog.querySelector("[data-mantle-modal-content]")?.setAttribute("data-state", state);
		for (const trigger of dialog.ownerDocument.querySelectorAll(`[aria-controls="${dialog.id}"]`)) {
			trigger.setAttribute("aria-expanded", String(open));
			trigger.setAttribute("data-state", state);
		}
	}
	const index = openDialogs.indexOf(dialog);
	if (open && index === -1) {
		openDialogs.push(dialog);
	} else if (!open && index !== -1) {
		openDialogs.splice(index, 1);
	}
	setTopModal(openDialogs.at(-1) ?? null);
}

/**
 * Opens or closes `dialog`. The state is written first, so the browser lays
 * out the open dialog and its new attributes in one style pass.
 */
function moveDialog({ dialog, open }: { dialog: HTMLDialogElement; open: boolean }): void {
	if (open === dialog.open) {
		return;
	}
	writeOpenState({ dialog, open });
	if (open) {
		dialog.showModal();
	} else {
		dialog.close();
	}
}

/**
 * Opens or closes the dialog of `root`. A controlled root only asks its owner
 * through `onOpenChange`; the owner's next `open` moves the `<dialog>`.
 */
function requestOpen({
	root,
	element,
	open,
}: {
	root: RootState;
	element: Element;
	open: boolean;
}): void {
	if (root.open !== undefined) {
		if (open !== root.open) {
			root.onOpenChange(open);
		}
		return;
	}
	const dialog = element.ownerDocument.getElementById(root.contentId);
	if (dialog instanceof HTMLDialogElement) {
		moveDialog({ dialog, open });
	}
}

/**
 * The `command` and `commandfor` attributes of an uncontrolled trigger or
 * close button. Where the browser supports invoker commands, it runs the
 * command on click, even before hydration.
 */
function commandAttributes(root: RootState, command: "show-modal" | "close") {
	return root.open === undefined ? { command, commandfor: root.contentId } : {};
}

/** Whether the browser already ran the invoker command of `element` for this click. */
function ranCommand(root: RootState, element: Element): boolean {
	return (
		root.open === undefined &&
		element instanceof HTMLButtonElement &&
		"commandForElement" in element
	);
}

type RootProps = {
	children?: ReactNode;
	/**
	 * Whether the dialog opens on mount. The `<dialog>` owns the state after that.
	 *
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Runs when the dialog opens or closes, with the new state. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * The controlled open state. Each change renders React and moves the
	 * `<dialog>` with `showModal()` or `close()`. Leave it out for the fast path,
	 * where a tap renders no React.
	 */
	open?: boolean;
};

/** The state owner of a native dialog. It renders no DOM. */
const Root = ({ children, defaultOpen = false, onOpenChange, open }: RootProps) => {
	const contentId = useId();
	const titleId = useId();
	const stableOnOpenChange = useCallbackRef((next: boolean) => onOpenChange?.(next));
	const state = useMemo(
		() => ({ contentId, titleId, open, defaultOpen, onOpenChange: stableOnOpenChange }),
		[contentId, titleId, open, defaultOpen, stableOnOpenChange],
	);

	return <RootContext.Provider value={state}>{children}</RootContext.Provider>;
};

/** A button that opens the dialog. */
const Trigger = ({ asChild, onClick, ...props }: ComponentProps<"button"> & WithAsChild) => {
	const root = useRootState("Trigger");
	const Component = asChild ? Slot : "button";
	// Why a named handler: `Slot` types its event on `HTMLElement`, and the
	// handler reads `currentTarget` as the clicked element either way.
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		onClick?.(event);
		if (!event.defaultPrevented && !ranCommand(root, event.currentTarget)) {
			requestOpen({ root, element: event.currentTarget, open: true });
		}
	};

	// Why constant `aria-expanded` and `data-state`: `writeOpenState` keeps them
	// current on the DOM, and React never writes a prop again that did not change.
	return (
		<Component
			type="button"
			aria-controls={root.contentId}
			aria-expanded="false"
			aria-haspopup="dialog"
			data-state="closed"
			{...commandAttributes(root, "show-modal")}
			{...props}
			onClick={handleClick}
		/>
	);
};

/** A button that closes the dialog. */
const Close = ({ asChild, onClick, ...props }: ComponentProps<"button"> & WithAsChild) => {
	const root = useRootState("Close");
	const Component = asChild ? Slot : "button";
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		onClick?.(event);
		if (!event.defaultPrevented && !ranCommand(root, event.currentTarget)) {
			requestOpen({ root, element: event.currentTarget, open: false });
		}
	};

	return (
		<Component
			type="button"
			{...commandAttributes(root, "close")}
			{...props}
			onClick={handleClick}
		/>
	);
};

/**
 * The classes every native `<dialog>` takes: a reset of the browser's dialog
 * box, the backdrop, and the motion of both.
 *
 * Why the `<dialog>` transitions `display` and `overlay`: it stays in the top
 * layer until the panel's 150ms exit ends. Why `[open]` and not `data-state`: a
 * tap before hydration opens the `<dialog>` before any script can write
 * `data-state`.
 */
const positionerBaseClassName = cx(
	"group/native-dialog fixed m-0 h-auto max-h-none w-auto max-w-none overflow-visible bg-transparent p-0 text-inherit",
	"transition-[display,overlay] transition-discrete duration-150 motion-reduce:transition-none",
	"backdrop:bg-overlay backdrop:backdrop-blur-xs backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete backdrop:duration-200 backdrop:ease-out-strong",
	"not-open:backdrop:opacity-0 not-open:backdrop:duration-150 starting:open:backdrop:opacity-0 motion-reduce:backdrop:transition-none",
);

type ContentProps = ComponentProps<"div"> & {
	/** The classes of the `<dialog>`, which positions the panel. */
	positionerClassName: string;
	/** The `data-slot` of the `<dialog>`. */
	positionerSlot: string;
};

/**
 * The panel of the dialog, inside a modal `<dialog>` that is always rendered,
 * open or not. Style the panel with `group-open/native-dialog:` and
 * `group-not-open/native-dialog:`, which read the `<dialog>`'s `[open]`. The
 * `<dialog>` is the layer container, so a float composed inside portals into
 * the top layer with it.
 */
const Content = ({
	children,
	positionerClassName,
	positionerSlot,
	ref,
	...props
}: ContentProps) => {
	const root = useRootState("Content");
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const controlledOpen = useRef(root.open);
	const reportedOpen = useRef(false);
	const pressedBackdrop = useRef(false);

	const sync = useCallbackRef((dialog: HTMLDialogElement) => {
		const { open } = dialog;
		if (open === reportedOpen.current) {
			return;
		}
		reportedOpen.current = open;
		writeOpenState({ dialog, open });
		if (open !== controlledOpen.current) {
			root.onOpenChange(open);
		}
	});

	// Why an observer of `open`: it sees each way the `<dialog>` opens or closes
	// (a command, Escape, `form method="dialog"`, a call here) in one place. Its
	// callback runs before the next paint.
	const attach = useCallbackRef((dialog: HTMLDialogElement | null) => {
		if (dialog == null) {
			return;
		}
		dialogRef.current = dialog;
		const observer = new MutationObserver(() => sync(dialog));
		observer.observe(dialog, { attributeFilter: ["open"] });
		// Why the `command` listener: it runs before the browser opens the
		// `<dialog>`, so the state attributes join the browser's style pass.
		const writeCommand = (event: Event) => {
			const command: unknown = Reflect.get(event, "command");
			if (command === "show-modal" || command === "close") {
				writeOpenState({ dialog, open: command === "show-modal" });
			}
		};
		dialog.addEventListener("command", writeCommand);
		if (root.open === undefined && root.defaultOpen) {
			reportedOpen.current = true;
			moveDialog({ dialog, open: true });
		}
		// Why a sync now: a tap before hydration can open the dialog through its command.
		sync(dialog);
		return () => {
			observer.disconnect();
			dialog.removeEventListener("command", writeCommand);
			writeOpenState({ dialog, open: false });
		};
	});

	useLayoutEffect(() => {
		controlledOpen.current = root.open;
		const dialog = dialogRef.current;
		if (root.open === undefined || dialog == null) {
			return;
		}
		moveDialog({ dialog, open: root.open });
	}, [root.open]);

	return (
		// oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- Why: Escape closes the dialog from the keyboard, through the `cancel` event.
		<dialog
			ref={attach}
			id={root.contentId}
			aria-labelledby={root.titleId}
			className={cx(positionerBaseClassName, positionerClassName)}
			data-slot={positionerSlot}
			data-state="closed"
			onCancel={(event) => {
				// Why: a controlled dialog closes when its owner sets `open`.
				if (root.open !== undefined) {
					event.preventDefault();
					root.onOpenChange(false);
				}
			}}
			// Why a press and a click on the `<dialog>` itself: the backdrop and
			// the area around the panel are the `<dialog>`. A drag out of the panel
			// ends with a click there too, so the press must start there as well.
			onPointerDown={(event) => {
				pressedBackdrop.current = event.target === event.currentTarget;
			}}
			onClick={(event) => {
				if (pressedBackdrop.current && event.target === event.currentTarget) {
					requestOpen({ root, element: event.currentTarget, open: false });
				}
			}}
		>
			<LayerContainer className="contents">
				<div ref={ref} data-mantle-modal-content data-state="closed" {...props}>
					{children}
				</div>
			</LayerContainer>
		</dialog>
	);
};

/** The accessible name of the dialog. */
const Title = ({ asChild, ...props }: Omit<ComponentProps<"h2">, "id"> & WithAsChild) => {
	const root = useRootState("Title");
	const Component = asChild ? Slot : "h2";
	return <Component id={root.titleId} {...props} />;
};

/**
 * The accessible description of the dialog. While it is mounted, the
 * `<dialog>` names it in `aria-describedby`.
 */
const Description = ({ asChild, id, ref, ...props }: ComponentProps<"div"> & WithAsChild) => {
	useRootState("Description");
	const generatedId = useId();
	const descriptionId = id ?? generatedId;
	const describe = (element: HTMLDivElement | null) => {
		const dialog = element?.closest("dialog");
		if (dialog == null || dialog.hasAttribute("aria-describedby")) {
			return;
		}
		dialog.setAttribute("aria-describedby", descriptionId);
		return () => dialog.removeAttribute("aria-describedby");
	};
	const composedRef = useComposedRefs(ref, describe);
	const Component = asChild ? Slot : "div";
	return <Component id={descriptionId} ref={composedRef} {...props} />;
};

export {
	//,
	Close,
	Content,
	Description,
	Root,
	Title,
	Trigger,
};

export type {
	//,
	ContentProps,
	RootProps,
};
