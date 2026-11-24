"use client";

import type { ComponentProps } from "react";
import { createContext, use } from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import * as Accordion from "../accordion/accordion-parts.js";

/** Whether the reasoning streams, or `null` outside `Reasoning.Root`. */
const ReasoningContext = createContext<boolean | null>(null);

function useReasoningStreaming(part: string): boolean {
	const streaming = use(ReasoningContext);
	invariant(streaming != null, `Reasoning.${part} must be rendered inside Reasoning.Root.`);
	return streaming;
}

/**
 * The props for `Reasoning.Root`.
 */
type ReasoningRootProps = Omit<ComponentProps<"div">, "defaultValue"> &
	WithDataSlot & {
		/**
		 * True while the model still writes its reasoning. `Reasoning.Trigger`
		 * then reads "Thinking…" and pulses.
		 *
		 * @default false
		 */
		streaming?: boolean;
	};

/**
 * The model's reasoning, folded under a one-line label so the answer stays
 * what the reader sees first. It starts closed.
 *
 * | Data Attribute   | Value                     | Description                                  |
 * | ---------------- | ------------------------- | -------------------------------------------- |
 * | `data-streaming` | present while `streaming` | Presence-only. Style with `data-streaming:`. |
 *
 * @see https://mantle.ngrok.com/components/ai/reasoning#reasoningroot
 *
 * @example
 * ```tsx
 * <Reasoning.Root streaming={isThinking}>
 *   <Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
 *   <Reasoning.Content>{reasoning}</Reasoning.Content>
 * </Reasoning.Root>
 * ```
 */
// Why no asChild: Root renders two elements, the accordion and its one item.
function Root({
	"data-slot": dataSlot,
	children,
	className,
	streaming = false,
	...props
}: ReasoningRootProps) {
	return (
		<ReasoningContext value={streaming}>
			<Accordion.Root
				data-slot={joinDataSlot(dataSlot, "reasoning")}
				className={cx("w-full", className)}
				{...props}
				data-streaming={streaming ? "" : undefined}
			>
				<Accordion.Item value="reasoning">{children}</Accordion.Item>
			</Accordion.Root>
		</ReasoningContext>
	);
}

/**
 * The props for `Reasoning.Trigger`.
 */
type ReasoningTriggerProps = Omit<ComponentProps<"button">, "type"> & WithDataSlot;

/**
 * The disclosure label reads "Thinking…" and pulses while streaming, then
 * shows its children or "Reasoning" when empty.
 *
 * The label sits in a `display: contents` wrapper,
 * `data-slot="reasoning-trigger-label"`, so a translated page survives the
 * change from "Thinking…".
 *
 * @see https://mantle.ngrok.com/components/ai/reasoning#reasoningtrigger
 *
 * @example
 * ```tsx
 * <Reasoning.Root streaming={isThinking}>
 *   <Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
 *   <Reasoning.Content>{reasoning}</Reasoning.Content>
 * </Reasoning.Root>
 * ```
 */
// Why no asChild: the trigger renders its caret beside the label.
function Trigger({ "data-slot": dataSlot, children, className, ...props }: ReasoningTriggerProps) {
	const streaming = useReasoningStreaming("Trigger");
	const label = typeof children === "boolean" || children === "" ? undefined : children;

	return (
		<Accordion.Trigger
			data-slot={joinDataSlot(dataSlot, "reasoning-trigger")}
			className={cx(
				"text-muted justify-start gap-1 py-1 text-xs font-normal",
				streaming && "animate-pulse motion-reduce:animate-none",
				className,
			)}
			{...props}
		>
			{/* Why a key: React swaps one host element, not a multi-node label that a translator has moved. */}
			<span
				key={streaming ? "thinking" : "label"}
				data-slot="reasoning-trigger-label"
				className="contents"
			>
				{streaming ? "Thinking…" : (label ?? "Reasoning")}
			</span>
			{/* Why w-3 only: size-3 would drop the icon's h-lh, which centers it in the first line. */}
			<Accordion.TriggerIcon className="w-3" />
		</Accordion.Trigger>
	);
}

/**
 * The props for `Reasoning.Content`.
 */
type ReasoningContentProps = ComponentProps<"div"> & WithDataSlot;

/**
 * The model's summary, as plain text or Markdown in muted type.
 * Find-in-page reaches it while it is closed.
 *
 * @see https://mantle.ngrok.com/components/ai/reasoning#reasoningcontent
 *
 * @example
 * ```tsx
 * <Reasoning.Root streaming={isThinking}>
 *   <Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
 *   <Reasoning.Content>{reasoning}</Reasoning.Content>
 * </Reasoning.Root>
 * ```
 */
// Why no asChild: the content renders two elements, the region that opens and its body.
function Content({ "data-slot": dataSlot, className, ...props }: ReasoningContentProps) {
	useReasoningStreaming("Content");

	return (
		<Accordion.Content>
			<Accordion.Body
				data-slot={joinDataSlot(dataSlot, "reasoning-content")}
				className={cx("text-muted text-sm", className)}
				{...props}
			/>
		</Accordion.Content>
	);
}

export {
	//,
	Root,
	Trigger,
	Content,
};

export type {
	//,
	ReasoningRootProps,
	ReasoningTriggerProps,
	ReasoningContentProps,
};
