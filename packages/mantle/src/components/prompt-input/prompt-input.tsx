"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/ArrowUp";
import { StopIcon } from "@phosphor-icons/react/Stop";
import type { ComponentProps } from "react";
import { createContext, use, useMemo } from "react";
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
	PromptInputStreaming;

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
	onStop,
	streaming = false,
	...props
}: PromptInputRootProps) {
	const Component = asChild ? Slot : "form";
	const context = useMemo<PromptInputContextValue>(
		() => ({ streaming, onStop }),
		[streaming, onStop],
	);

	return (
		<PromptInputContext value={context}>
			<Component
				data-slot={joinDataSlot(dataSlot, "prompt-input")}
				data-streaming={streaming ? "" : undefined}
				className={cx(
					"border-form bg-form flex flex-col rounded-2xl border shadow-sm",
					// The border takes the ring's accent, so the edge and the ring read as one.
					"focus-within:border-accent-600 focus-within:ring-focus-accent focus-within:ring-4",
					className,
				)}
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
 * an input method editor (IME) candidate does not submit. While an answer
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
	rows = 2,
	...props
}: PromptInputTextAreaProps) {
	const { streaming } = usePromptInputContext("TextArea");

	return (
		<BaseTextArea
			data-slot={joinDataSlot(dataSlot, "prompt-input-text-area")}
			// Why `rows`: browsers without `field-sizing` size the field from it.
			rows={rows}
			className={cx(
				"field-sizing-content max-h-48 min-h-16 resize-none rounded-none border-0 bg-transparent px-3 pt-3 pb-1 shadow-none",
				// The frame on `PromptInput.Root` draws focus and a drop target, so the field draws neither.
				"focus-visible:ring-0 data-drag-over:ring-0",
				className,
			)}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.defaultPrevented || !isSendKey(event)) {
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
	const tree = root instanceof ShadowRoot ? root : form.ownerDocument;
	for (const element of tree.querySelectorAll("button, input")) {
		if (
			element instanceof HTMLButtonElement &&
			element.form === form &&
			element.type === "submit"
		) {
			return element;
		}
		if (
			element instanceof HTMLInputElement &&
			element.form === form &&
			(element.type === "submit" || element.type === "image")
		) {
			return element;
		}
	}
	return undefined;
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
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label" | "type"
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
 * | `data-size` | `"2xs"` \| `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | The `size` prop; defaults to `"sm"`. |
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
			type={stops ? "button" : "submit"}
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
		/>
	);
}

export {
	//,
	Root,
	PromptInputTextArea,
	Footer,
	Submit,
};

export type {
	//,
	PromptInputRootProps,
	PromptInputTextAreaProps,
	PromptInputFooterProps,
	PromptInputSubmitProps,
};
