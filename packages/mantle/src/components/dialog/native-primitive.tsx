"use client";

import type { ComponentProps, Context, MouseEvent, ReactNode } from "react";
import { createContext, useContext, useId, useLayoutEffect, useMemo, useRef } from "react";
import invariant from "tiny-invariant";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { LayerContainer } from "../../utils/layer-container/layer-container.js";
import { Slot } from "../slot/index.js";
import { modalHostAttribute, setTopModal } from "../toast/toaster-host.js";

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

/**
 * The context that ties the parts of one component family to its `Root`. Each
 * family makes its own with `createScope`, so a `Dialog.Trigger` inside a
 * `Sheet.Content` binds to the enclosing `Dialog.Root`, not to the sheet.
 */
type Scope = Context<RootState | null>;

/** Makes the `Scope` of a component family. Call it once, at module level. */
const createScope = (): Scope => createContext<RootState | null>(null);

/** What every part takes: the `Scope` of its family. */
type ScopeProps = {
	scope: Scope;
};

/** The `RootState` of the enclosing `Root` in `scope`. Throws outside one. */
function useRootState(scope: Scope, part: string): RootState {
	const state = useContext(scope);
	invariant(
		state != null,
		`The native dialog part \`${part}\` must be rendered inside its \`Root\`.`,
	);
	return state;
}

/** The open native dialogs, in open order. The last one is on top. */
const openDialogs: HTMLDialogElement[] = [];

/** Writes `state` to the `aria-expanded` and `data-state` of `trigger`. */
function writeTriggerState(trigger: Element, state: string): void {
	trigger.setAttribute("aria-expanded", String(state === "open"));
	trigger.setAttribute("data-state", state);
}

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
			writeTriggerState(trigger, state);
		}
	}
	const index = openDialogs.indexOf(dialog);
	if (open === (index !== -1)) {
		return;
	}
	if (open) {
		openDialogs.push(dialog);
	} else {
		openDialogs.splice(index, 1);
		moveModalHosts(dialog);
	}
	setTopModal(openDialogs.at(-1) ?? null);
}

/**
 * Moves the hosts of the dialogs that opened over `dialog`, such as a
 * `Command` palette, to the top open modal outside `dialog`, else `<body>`,
 * and keeps the focus that was in them. Closes the native dialogs in each
 * host first, as a parent closes its nested dialogs: a moved `<dialog>` leaves
 * the top layer, and a new top modal inside a host cannot take that host.
 *
 * Why a move and not a new container: a portal into a new container remounts
 * its content, and the dialog would lose its state. Why before `close()`: the
 * close returns focus to the element that opened `dialog`, outside the moved
 * dialog.
 */
function moveModalHosts(dialog: HTMLDialogElement): void {
	const hosts = [...dialog.querySelectorAll(`:scope > [${modalHostAttribute}]`)];
	for (const host of hosts) {
		closeNested(host);
	}
	const focused = dialog.ownerDocument.activeElement;
	const target =
		openDialogs.findLast((open) => !dialog.contains(open)) ?? dialog.ownerDocument.body;
	target.append(...hosts);
	if (focused instanceof HTMLElement && hosts.some((host) => host.contains(focused))) {
		focused.focus({ preventScroll: true });
	}
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
		return;
	}
	closeNested(dialog);
	dialog.close();
}

/**
 * Closes the open dialogs nested in `dialog`, innermost first. Call it before
 * `dialog` closes: an open child stays modal inside its hidden parent and
 * blocks the page, and each close returns focus to the element that opened it.
 */
function closeNested(dialog: Element): void {
	for (const child of [...dialog.querySelectorAll("dialog[open]")].toReversed()) {
		if (child instanceof HTMLDialogElement) {
			// Why the write first: it takes the child out of the stack of open
			// dialogs now, so a dialog that opens in the same event mounts on the
			// true top modal, not in the closed child.
			writeOpenState({ dialog: child, open: false });
			child.close();
		}
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
	// Why `type="button"`: the browser runs no command for a submit or reset button.
	return (
		root.open === undefined &&
		element instanceof HTMLButtonElement &&
		element.type === "button" &&
		"commandForElement" in element
	);
}

type RootProps = ScopeProps & {
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
const Root = ({ children, defaultOpen = false, onOpenChange, open, scope: Scope }: RootProps) => {
	const contentId = useId();
	const titleId = useId();
	const stableOnOpenChange = useCallbackRef((next: boolean) => onOpenChange?.(next));
	const state = useMemo(
		() => ({ contentId, titleId, open, defaultOpen, onOpenChange: stableOnOpenChange }),
		[contentId, titleId, open, defaultOpen, stableOnOpenChange],
	);

	return <Scope value={state}>{children}</Scope>;
};

type ButtonProps = ComponentProps<"button"> & WithAsChild & ScopeProps;

/** A button that opens the dialog. */
const Trigger = ({ asChild, onClick, ref, scope, ...props }: ButtonProps) => {
	const root = useRootState(scope, "Trigger");
	const Component = asChild ? Slot : "button";
	// Why a named handler: `Slot` types its event on `HTMLElement`, and the
	// handler reads `currentTarget` as the clicked element either way.
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		onClick?.(event);
		if (!event.defaultPrevented && !ranCommand(root, event.currentTarget)) {
			requestOpen({ root, element: event.currentTarget, open: true });
		}
	};

	// Why a ref: a trigger that mounts while its dialog is open takes the open
	// state the dialog already has.
	const readState = (trigger: HTMLButtonElement | null) => {
		const state = trigger?.ownerDocument.getElementById(root.contentId)?.dataset.state;
		if (trigger != null && state != null) {
			writeTriggerState(trigger, state);
		}
	};
	const composedRef = useComposedRefs(ref, readState);

	// Why constant `aria-expanded` and `data-state`: `writeOpenState` keeps them
	// current on the DOM, and React never writes a prop again that did not change.
	return (
		<Component
			ref={composedRef}
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
const Close = ({ asChild, onClick, scope, ...props }: ButtonProps) => {
	const root = useRootState(scope, "Close");
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

/** The style of an inline `<dialog>`, which has no box of its own. */
const inlineStyle = { display: "contents" } as const;

type ContentProps = ComponentProps<"div"> &
	ScopeProps & {
		/**
		 * Whether the closed `<dialog>` shows its panel in the page, as
		 * `Sidebar.Nav` does above its breakpoint. An inline `<dialog>` has no
		 * box (`display: contents`), and it is neither a dialog nor a layer: it
		 * takes `role="generic"` and no name or description, and the floats
		 * inside portal as if it were not there. A change keeps the children
		 * mounted.
		 *
		 * @default false
		 */
		inline?: boolean;
		/**
		 * Whether the floats inside portal into the `<dialog>`. Pass `false`
		 * while a `<dialog>` that stays mounted is closed, so a float that a
		 * shortcut opens there portals to the body and shows.
		 *
		 * @default true
		 */
		layer?: boolean;
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
	"aria-describedby": ariaDescribedBy,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	children,
	inline = false,
	layer = true,
	positionerClassName,
	positionerSlot,
	ref,
	scope,
	...props
}: ContentProps) => {
	const root = useRootState(scope, "Content");
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const controlledOpen = useRef(root.open);
	const reportedOpen = useRef(false);
	const pressedBackdrop = useRef(false);

	const sync = useCallbackRef((dialog: HTMLDialogElement) => {
		const { open } = dialog;
		// Why the write comes before the check: a StrictMode remount writes the
		// state closed and then finds the dialog still open.
		writeOpenState({ dialog, open });
		if (open === reportedOpen.current) {
			return;
		}
		reportedOpen.current = open;
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
			if (command === "show-modal") {
				writeOpenState({ dialog, open: true });
			} else if (command === "close") {
				closeNested(dialog);
				writeOpenState({ dialog, open: false });
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
			if (!dialog.open) {
				return;
			}
			// Why: the browser returns focus only from `close()`, not when an open
			// `<dialog>` leaves the page. A StrictMode remount keeps it on the page.
			const document = dialog.ownerDocument;
			queueMicrotask(() => {
				if (!dialog.isConnected && document.activeElement === document.body) {
					document.querySelector<HTMLElement>(`[aria-controls="${dialog.id}"]`)?.focus();
				}
			});
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
			// Why `generic`: Chromium ignores `none` and `presentation` on a
			// `<dialog>`. ARIA prohibits a name on `generic`.
			// Why an inline `display`: the browser's own style hides a closed
			// `<dialog>`, and the panel must show before any stylesheet loads.
			{...(inline
				? { role: "generic", style: inlineStyle }
				: {
						"aria-describedby": ariaDescribedBy,
						"aria-label": ariaLabel,
						"aria-labelledby": ariaLabelledBy ?? (ariaLabel == null ? root.titleId : undefined),
					})}
			className={cx(positionerBaseClassName, positionerClassName)}
			data-slot={positionerSlot}
			data-state="closed"
			// Why the target checks: React sends the events of a nested `<dialog>`
			// up to this one too. Why the `preventDefault`: a controlled dialog
			// closes when its owner sets `open`.
			onCancel={(event) => {
				if (event.target === event.currentTarget && root.open !== undefined) {
					event.preventDefault();
					root.onOpenChange(false);
				}
			}}
			onSubmit={(event) => {
				const { currentTarget, nativeEvent, target } = event;
				if (
					root.open === undefined ||
					event.defaultPrevented ||
					!(nativeEvent instanceof SubmitEvent) ||
					!(target instanceof HTMLFormElement) ||
					target.closest("dialog") !== currentTarget
				) {
					return;
				}
				const method = nativeEvent.submitter?.getAttribute("formmethod")?.toLowerCase();
				if ((method ?? target.method) === "dialog") {
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
			<LayerContainer active={layer && !inline} className="contents">
				{/* Why no marker inline: the panel is not an overlay's content, and
				    the close must not write `data-state` over the inline panel's own. */}
				<div
					ref={ref}
					data-mantle-modal-content={inline ? undefined : ""}
					data-state="closed"
					{...props}
				>
					{children}
				</div>
			</LayerContainer>
		</dialog>
	);
};

/** The accessible name of the dialog. */
const Title = ({
	asChild,
	scope,
	...props
}: Omit<ComponentProps<"h2">, "id"> & WithAsChild & ScopeProps) => {
	const root = useRootState(scope, "Title");
	const Component = asChild ? Slot : "h2";
	return <Component id={root.titleId} {...props} />;
};

/**
 * The accessible description of the dialog. While it is mounted, the
 * `<dialog>` names it in `aria-describedby`.
 */
const Description = ({
	asChild,
	id,
	ref,
	scope,
	...props
}: ComponentProps<"div"> & WithAsChild & ScopeProps) => {
	useRootState(scope, "Description");
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
	createScope,
	Description,
	moveDialog,
	Root,
	Title,
	Trigger,
};

export type {
	//,
	ContentProps,
	RootProps,
	Scope,
};
