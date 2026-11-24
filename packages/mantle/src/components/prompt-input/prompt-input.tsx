"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/ArrowUp";
import { PaperclipIcon } from "@phosphor-icons/react/Paperclip";
import { StopIcon } from "@phosphor-icons/react/Stop";
import type { ComponentProps, DragEvent } from "react";
import { createContext, use, useMemo, useRef, useState } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { IconButton } from "../button/icon-button.js";
import { Slot } from "../slot/index.js";
import { TextArea as BaseTextArea } from "../text-area/text-area.js";

/**
 * Whether an answer streams, and how the person stops it. `onStop` is
 * required as soon as `streaming` is set, so a stop button always stops
 * something.
 */
type PromptInputStreaming =
	| {
			/**
			 * True while an answer streams. `PromptInput.Submit` then stops the
			 * answer, and Enter in `PromptInput.TextArea` does not submit.
			 *
			 * @default false
			 */
			streaming?: undefined;
			/** Runs when the person presses stop. Required with `streaming`. */
			onStop?: undefined;
	  }
	| {
			/**
			 * True while an answer streams. `PromptInput.Submit` then stops the
			 * answer, and Enter in `PromptInput.TextArea` does not submit.
			 *
			 * @default false
			 */
			streaming: boolean;
			/** Runs when the person presses stop. Takes no arguments. */
			onStop: () => void;
	  };

type PromptInputContextValue = {
	streaming: boolean;
	onStop: (() => void) | undefined;
	onFilesAdd: ((files: File[]) => void) | undefined;
};

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInputContext(part: string): PromptInputContextValue {
	const context = use(PromptInputContext);
	invariant(context != null, `PromptInput.${part} must be rendered inside PromptInput.Root.`);
	return context;
}

/**
 * Native form attributes and the controls for a streaming answer.
 */
type PromptInputRootProps = ComponentProps<"form"> &
	WithAsChild &
	WithDataSlot &
	PromptInputStreaming & {
		/**
		 * Receives the files a person attaches: from `PromptInput.AttachButton`,
		 * a drop on the frame, or a paste into the field.
		 * Reading, checking, and storing them stays with the app.
		 */
		onFilesAdd?: (files: File[]) => void;
	};

/**
 * The message box of a chat: a native `<form>` that holds the text field and
 * its controls inside one frame. The frame draws the focus ring when any
 * control inside it has focus. Handle the message in `onSubmit` or `action`,
 * as with any form.
 *
 * | Data Attribute   | Value                         | Description                                   |
 * | ---------------- | ----------------------------- | --------------------------------------------- |
 * | `data-slot` | `"prompt-input"` | On the form, joined with ancestor slots. |
 * | `data-streaming` | present while `streaming`     | Presence-only. Style with `data-streaming:`.  |
 * | `data-drag-over` | present while files drag over the frame | Presence-only. Set only with `onFilesAdd`. |
 *
 * @see https://mantle.ngrok.com/components/preview/prompt-input#promptinputroot
 *
 * @example
 * ```tsx
 * <PromptInput.Root
 *   streaming={isAnswering}
 *   onStop={stop}
 *   onSubmit={(event) => {
 *     event.preventDefault();
 *     send(draft);
 *   }}
 * >
 *   <PromptInput.TextArea
 *     aria-label="Message the assistant"
 *     name="message"
 *     placeholder="Ask about your endpoints…"
 *     value={draft}
 *     onChange={(event) => setDraft(event.target.value)}
 *   />
 *   <PromptInput.Footer>
 *     <PromptInput.Submit />
 *   </PromptInput.Footer>
 * </PromptInput.Root>
 * ```
 */
function Root({
	"data-slot": dataSlot,
	asChild = false,
	className,
	onDragLeave,
	onDragOver,
	onDrop,
	onFilesAdd,
	onStop,
	streaming = false,
	...props
}: PromptInputRootProps) {
	const Component = asChild ? Slot : "form";
	const [dragOver, setDragOver] = useState(false);
	const context = useMemo<PromptInputContextValue>(
		() => ({ streaming, onStop, onFilesAdd }),
		[streaming, onStop, onFilesAdd],
	);

	return (
		<PromptInputContext value={context}>
			<Component
				data-slot={joinDataSlot(dataSlot, "prompt-input")}
				data-streaming={streaming ? "" : undefined}
				data-drag-over={dragOver ? "" : undefined}
				className={cx(
					"border-form bg-form flex flex-col rounded-2xl border shadow-sm",
					// The border takes the ring's accent, so the edge and the ring read as one.
					"focus-within:border-accent-600 focus-within:ring-focus-accent focus-within:ring-4",
					"data-drag-over:border-accent-600 data-drag-over:ring-focus-accent data-drag-over:border-dashed data-drag-over:ring-4",
					className,
				)}
				onDragOver={(event: DragEvent<HTMLFormElement>) => {
					onDragOver?.(event);
					if (
						event.defaultPrevented ||
						onFilesAdd == null ||
						!event.dataTransfer.types.includes("Files")
					) {
						return;
					}
					// Why: the browser drops a file only on an element that cancels `dragover`.
					event.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={(event: DragEvent<HTMLFormElement>) => {
					onDragLeave?.(event);
					// Why the check: a drag from the frame into a child fires `dragleave` on the frame.
					const NodeConstructor = event.currentTarget.ownerDocument.defaultView?.Node;
					if (
						NodeConstructor == null ||
						!(event.relatedTarget instanceof NodeConstructor) ||
						!event.currentTarget.contains(event.relatedTarget)
					) {
						setDragOver(false);
					}
				}}
				onDrop={(event: DragEvent<HTMLFormElement>) => {
					onDrop?.(event);
					setDragOver(false);
					if (
						event.defaultPrevented ||
						onFilesAdd == null ||
						event.dataTransfer.files.length === 0
					) {
						return;
					}
					event.preventDefault();
					onFilesAdd(Array.from(event.dataTransfer.files));
				}}
				{...props}
			/>
		</PromptInputContext>
	);
}

/**
 * Native textarea attributes, with the composer's frame styles fixed.
 */
type PromptInputTextAreaProps = Omit<
	ComponentProps<typeof BaseTextArea>,
	"appearance" | "validation"
>;

/**
 * The message field. It grows with its text up to `max-h-48`, then scrolls.
 * Enter submits the form and Shift+Enter adds a line. The Enter that confirms
 * an input method editor (IME) candidate does not submit. On a touch screen,
 * Return adds a line, because on-screen keyboards have no Shift+Return. While an answer
 * streams, the field stays editable and Enter does not submit.
 *
 * Enter does nothing when the form's default button is disabled, as the HTML
 * Standard's implicit submission does. Name the field with `aria-label` or a
 * `Label`.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"prompt-input-text-area text-area"` | On the field, joined with ancestor slots. |
 * | `data-drag-over` | present during a drag | Inherited from `TextArea`. |
 * | `data-validation` | `"error"` \| `"success"` \| `"warning"` | Validation from an enclosing `Field`. |
 *
 * @see https://mantle.ngrok.com/components/preview/prompt-input#promptinputtextarea
 *
 * @example
 * ```tsx
 * <PromptInput.Root
 *   streaming={isAnswering}
 *   onStop={stop}
 *   onSubmit={(event) => {
 *     event.preventDefault();
 *     send(draft);
 *   }}
 * >
 *   <PromptInput.TextArea
 *     aria-label="Message the assistant"
 *     name="message"
 *     placeholder="Ask about your endpoints…"
 *     value={draft}
 *     onChange={(event) => setDraft(event.target.value)}
 *   />
 *   <PromptInput.Footer>
 *     <PromptInput.Submit />
 *   </PromptInput.Footer>
 * </PromptInput.Root>
 * ```
 */
// Why no asChild: the Enter handler needs a native textarea's form owner and editing behavior.
function PromptInputTextArea({
	"data-slot": dataSlot,
	className,
	onKeyDown,
	onPaste,
	rows = 2,
	...props
}: PromptInputTextAreaProps) {
	const { streaming, onFilesAdd } = usePromptInputContext("TextArea");

	return (
		<BaseTextArea
			data-slot={joinDataSlot(dataSlot, "prompt-input-text-area")}
			// Why `rows`: browsers without `field-sizing` size the field from it.
			rows={rows}
			className={cx(
				"field-sizing-content max-h-48 min-h-16 resize-none rounded-none border-0 bg-transparent px-3 pt-3 pb-1 shadow-none",
				// Why: the base field's touch padding and minimum height are variants, so they would win over `pt-3 pb-1 min-h-16`.
				"pointer-coarse:pt-3 pointer-coarse:pb-1 pointer-coarse:min-h-16",
				// The frame on `PromptInput.Root` draws focus and a drop target, so the field draws neither.
				"focus-visible:ring-0 data-drag-over:ring-0",
				className,
			)}
			onPaste={(event) => {
				onPaste?.(event);
				if (
					event.defaultPrevented ||
					onFilesAdd == null ||
					event.clipboardData.files.length === 0
				) {
					return;
				}
				const files = Array.from(event.clipboardData.files);
				if (namesOnlyFiles(event.clipboardData.getData("text/plain"), files)) {
					event.preventDefault();
				}
				onFilesAdd(files);
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.defaultPrevented || !isSendKey(event) || hasTouchKeyboard(event.currentTarget)) {
					return;
				}
				event.preventDefault();
				const form = event.currentTarget.form;
				if (streaming || form == null) {
					return;
				}
				const button = defaultButtonOf(form);
				if (button != null) {
					button.click();
				} else {
					form.requestSubmit();
				}
			}}
			{...props}
		/>
	);
}

/**
 * Whether the person types on an on-screen keyboard, which has no
 * Shift+Return. Return then adds a line, and the person sends with the button.
 */
function hasTouchKeyboard(field: HTMLTextAreaElement): boolean {
	return (
		field.ownerDocument.defaultView?.matchMedia("(hover: none) and (pointer: coarse)").matches ===
		true
	);
}

/**
 * Whether pasted text only names the pasted files, as file managers write a
 * copied file's path or name next to the file. Such text is not part of the
 * message, so the paste adds the files alone.
 */
function namesOnlyFiles(text: string, files: readonly File[]): boolean {
	const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
	return lines.every((line) => {
		let path = line.trim();
		try {
			path = decodeURIComponent(path);
		} catch {
			// Why: a malformed escape is a plain path; compare it as it is.
		}
		return files.some(
			({ name }) => path === name || path.endsWith(`/${name}`) || path.endsWith(`\\${name}`),
		);
	});
}

/**
 * Whether a keydown in the field sends the message: Enter without Shift, and
 * not the Enter that confirms an IME candidate.
 */
function isSendKey(event: {
	key: string;
	shiftKey: boolean;
	keyCode: number;
	nativeEvent: { isComposing: boolean };
}): boolean {
	if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
		return false;
	}
	// Why: Safari ends an IME composition before keydown, so only `keyCode` 229 marks the confirming Enter.
	return event.keyCode !== 229;
}

/**
 * The form's default button: its first submit button in tree order.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#default-button
 */
function defaultButtonOf(form: HTMLFormElement): HTMLButtonElement | HTMLInputElement | undefined {
	// Why tree order: form.elements omits image buttons, and a submitter can sit outside its form.
	const root = form.getRootNode();
	const tree = isDocumentFragment(root) ? root : form.ownerDocument;
	for (const element of tree.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
		"button, input",
	)) {
		if (element.form === form && (element.type === "submit" || element.type === "image")) {
			return element;
		}
	}
	return undefined;
}

function isDocumentFragment(node: Node): node is DocumentFragment {
	// Why nodeType: a portal's root can belong to another window.
	return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

/**
 * Row attributes and optional element substitution for the message's controls.
 */
type PromptInputFooterProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The row under the field for the message's controls, such as a model picker,
 * an attach button, and `PromptInput.Submit`. `PromptInput.Submit` sits at the
 * end of the row.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"prompt-input-footer"` | On the row, joined with ancestor slots. |
 *
 * @see https://mantle.ngrok.com/components/preview/prompt-input#promptinputfooter
 *
 * @example
 * ```tsx
 * <PromptInput.Root
 *   streaming={isAnswering}
 *   onStop={stop}
 *   onSubmit={(event) => {
 *     event.preventDefault();
 *     send(draft);
 *   }}
 * >
 *   <PromptInput.TextArea
 *     aria-label="Message the assistant"
 *     name="message"
 *     placeholder="Ask about your endpoints…"
 *     value={draft}
 *     onChange={(event) => setDraft(event.target.value)}
 *   />
 *   <PromptInput.Footer>
 *     <PromptInput.Submit />
 *   </PromptInput.Footer>
 * </PromptInput.Root>
 * ```
 */
function Footer({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: PromptInputFooterProps) {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "prompt-input-footer")}
			className={cx("flex min-w-0 items-center gap-1 px-2 pb-2", className)}
			{...props}
		/>
	);
}

/**
 * Send and stop labels, plus attributes for the shared icon button.
 */
type PromptInputSubmitProps = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label" | "size" | "type"
> & {
	/**
	 * The accessible name of the button while it sends.
	 *
	 * @default "Send message"
	 */
	label?: string;
	/**
	 * The accessible name of the button while it stops an answer.
	 *
	 * @default "Stop answer"
	 */
	stopLabel?: string;
};

/**
 * The button that sends the message, and stops the answer while one streams.
 * It is one button in both states, so focus stays on it when an answer starts
 * or ends. It submits the form while idle and calls `onStop` from
 * `PromptInput.Root` while streaming.
 *
 * It is not disabled for an empty field, because a gray button reads as a
 * broken message box. Ignore a blank message in `onSubmit`.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"prompt-input-submit icon-button"` | On the button, joined with ancestor slots. |
 * | `data-icon-button` | `"true"` | Inherited from `IconButton`. |
 * | `data-appearance` | `"filled"` | The button's appearance. |
 * | `data-intent` | `"neutral"` | The button's tone. |
 * | `data-size` | `"sm"` | The button's size, fixed so it fits the footer. |
 * | `data-loading` | present when `isLoading` | Inherited from `IconButton`. |
 *
 * @see https://mantle.ngrok.com/components/preview/prompt-input#promptinputsubmit
 *
 * @example
 * ```tsx
 * <PromptInput.Root
 *   streaming={isAnswering}
 *   onStop={stop}
 *   onSubmit={(event) => {
 *     event.preventDefault();
 *     send(draft);
 *   }}
 * >
 *   <PromptInput.TextArea
 *     aria-label="Message the assistant"
 *     name="message"
 *     placeholder="Ask about your endpoints…"
 *     value={draft}
 *     onChange={(event) => setDraft(event.target.value)}
 *   />
 *   <PromptInput.Footer>
 *     <PromptInput.Submit />
 *   </PromptInput.Footer>
 * </PromptInput.Root>
 * ```
 */
// Why no asChild: the part owns its element so it can swap between submit and stop without losing focus.
function Submit({
	"data-slot": dataSlot,
	className,
	label = "Send message",
	onClick,
	stopLabel = "Stop answer",
	...props
}: PromptInputSubmitProps) {
	const { streaming, onStop } = usePromptInputContext("Submit");
	const stops = streaming && onStop != null;

	return (
		<IconButton
			appearance="filled"
			intent="neutral"
			size="sm"
			data-slot={joinDataSlot(dataSlot, "prompt-input-submit")}
			className={cx("ms-auto size-8 shrink-0 rounded-full", className)}
			icon={stops ? <StopIcon weight="fill" /> : <ArrowUpIcon />}
			label={stops ? stopLabel : label}
			onClick={(event) => {
				onClick?.(event);
				if (stops && !event.defaultPrevented) {
					// Why: onStop can change this button to a submitter before the click's default action.
					event.preventDefault();
					onStop();
				}
			}}
			{...props}
			// Why last: a composed trigger can inject its own button type.
			type={stops ? "button" : "submit"}
		/>
	);
}

/**
 * The props for `PromptInput.AttachButton`.
 */
type PromptInputAttachButtonProps = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label" | "type"
> & {
	/**
	 * The file types the picker offers, as the `accept` attribute of a file
	 * input takes them, such as `"image/*,.txt"`. A drop or a paste is not
	 * filtered, so check each file in `onFilesAdd`.
	 */
	accept?: string;
	/**
	 * The accessible name of the button.
	 *
	 * @default "Attach files"
	 */
	label?: string;
};

/**
 * The button that opens the file picker. The files a person picks go to
 * `onFilesAdd` on `PromptInput.Root`, which this part requires. Put it in
 * `PromptInput.Footer`.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"prompt-input-attach-button icon-button"` | On the button, joined with ancestor slots. |
 * | `data-icon-button` | `"true"` | Inherited from `IconButton`. |
 * | `data-appearance` | `"ghost"` | The button's appearance. |
 * | `data-intent` | `"neutral"` | The button's tone. |
 * | `data-size` | `"2xs"` \| `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | The `size` prop; defaults to `"sm"`. |
 * | `data-loading` | present when `isLoading` | Inherited from `IconButton`. |
 *
 * @see https://mantle.ngrok.com/components/preview/prompt-input#promptinputattachbutton
 *
 * @example
 * ```tsx
 * <PromptInput.Root onFilesAdd={addFiles} onSubmit={send}>
 *   {files.length > 0 && (
 *     <Attachment.List aria-label="Attachments" className="px-3 pt-3">
 *       {files.map((file) => (
 *         <Attachment.Root key={file.id}>
 *           <Attachment.Name>{file.name}</Attachment.Name>
 *           <Attachment.Size bytes={file.size} />
 *           <Attachment.Remove label={`Remove ${file.name}`} onClick={() => removeFile(file.id)} />
 *         </Attachment.Root>
 *       ))}
 *     </Attachment.List>
 *   )}
 *   <PromptInput.TextArea aria-label="Message the assistant" name="message" />
 *   <PromptInput.Footer>
 *     <PromptInput.AttachButton accept="image/*,.txt" />
 *     <PromptInput.Submit />
 *   </PromptInput.Footer>
 * </PromptInput.Root>
 * ```
 */
// Why no asChild: the part renders its file input beside the button.
function AttachButton({
	"data-slot": dataSlot,
	accept,
	className,
	label = "Attach files",
	onClick,
	...props
}: PromptInputAttachButtonProps) {
	const { onFilesAdd } = usePromptInputContext("AttachButton");
	invariant(onFilesAdd != null, "PromptInput.AttachButton needs onFilesAdd on PromptInput.Root.");
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				multiple
				accept={accept}
				hidden
				// Why: the picker is reached through the button, so the input stays out of the tab order and the accessibility tree.
				tabIndex={-1}
				aria-hidden
				onChange={(event) => {
					const files = Array.from(event.currentTarget.files ?? []);
					// Why: an empty value lets the person pick the same file again.
					event.currentTarget.value = "";
					if (files.length > 0) {
						onFilesAdd(files);
					}
				}}
			/>
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="sm"
				type="button"
				data-slot={joinDataSlot(dataSlot, "prompt-input-attach-button")}
				className={cx("text-muted size-8 shrink-0 rounded-full", className)}
				icon={<PaperclipIcon />}
				label={label}
				onClick={(event) => {
					onClick?.(event);
					if (!event.defaultPrevented) {
						inputRef.current?.click();
					}
				}}
				{...props}
			/>
		</>
	);
}

export {
	//,
	Root,
	PromptInputTextArea,
	Footer,
	AttachButton,
	Submit,
};

export type {
	//,
	PromptInputAttachButtonProps,
	PromptInputRootProps,
	PromptInputTextAreaProps,
	PromptInputFooterProps,
	PromptInputSubmitProps,
};
