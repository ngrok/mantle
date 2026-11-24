"use client";

import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { createContext, use, useEffect, useMemo, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import * as Accordion from "../accordion/accordion-parts.js";

type WorkContextValue = {
	open: boolean;
	/** The reader's own choice, or `null` while the work follows `streaming`. */
	setChoice: Dispatch<SetStateAction<boolean | null>>;
};

const WorkContext = createContext<WorkContextValue | null>(null);

function useWorkContext(part: string): WorkContextValue {
	const context = use(WorkContext);
	invariant(context != null, `Work.${part} must be rendered inside Work.Root.`);
	return context;
}

// Hoisted so the accordion gets one array for each state, not a new one each render.
const openValues = ["work"];
const closedValues: string[] = [];

/**
 * The props for `Work.Root`.
 */
type WorkRootProps = Omit<ComponentProps<"div">, "defaultValue"> &
	WithDataSlot & {
		/**
		 * True while the model still works on the answer. The work shows while
		 * it streams, and folds away when it ends, unless the reader toggled it
		 * or used a control in it.
		 *
		 * @default false
		 */
		streaming?: boolean;
	};

/**
 * The work behind one answer: its reasoning and its tool calls, under one
 * "Show work" toggle. It shows while the answer streams and folds away when
 * the answer ends.
 *
 * | Data Attribute   | Value                     | Description                                  |
 * | ---------------- | ------------------------- | -------------------------------------------- |
 * | `data-streaming` | present while `streaming` | Presence-only. Style with `data-streaming:`. |
 *
 * @see https://mantle.ngrok.com/components/ai/work#workroot
 *
 * @example
 * ```tsx
 * <Work.Root streaming={answer.streaming}>
 *   <Work.Trigger />
 *   <Work.Content>
 *     <Reasoning.Root>
 *       <Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
 *       <Reasoning.Content>{answer.reasoning}</Reasoning.Content>
 *     </Reasoning.Root>
 *     <ToolCall.Root status="done">
 *       <ToolCall.Trigger>
 *         <ToolCall.Name>list_endpoints</ToolCall.Name>
 *       </ToolCall.Trigger>
 *       <ToolCall.Content>{result}</ToolCall.Content>
 *     </ToolCall.Root>
 *   </Work.Content>
 * </Work.Root>
 * ```
 */
// Why no asChild: Root renders two elements, the accordion and its one item.
function Root({
	"data-slot": dataSlot,
	children,
	className,
	streaming = false,
	...props
}: WorkRootProps) {
	const [choice, setChoice] = useState<boolean | null>(null);
	const open = choice ?? streaming;
	const context = useMemo(() => ({ open, setChoice }), [open]);

	return (
		<WorkContext value={context}>
			<Accordion.Root
				data-slot={joinDataSlot(dataSlot, "work")}
				className={cx("w-full", className)}
				{...props}
				value={open ? openValues : closedValues}
				onValueChange={(values) => setChoice(values.length > 0)}
				data-streaming={streaming ? "" : undefined}
			>
				<Accordion.Item value="work">{children}</Accordion.Item>
			</Accordion.Root>
		</WorkContext>
	);
}

/**
 * The props for `Work.Trigger`.
 */
type WorkTriggerProps = Omit<ComponentProps<"button">, "type" | "children"> & WithDataSlot;

/**
 * The toggle reads "Show work" while the work is closed and "Hide work" while
 * it is open, with a caret.
 *
 * The label sits in a `display: contents` wrapper,
 * `data-slot="work-trigger-label"`, so a translated page survives the change.
 *
 * @see https://mantle.ngrok.com/components/ai/work#worktrigger
 *
 * @example
 * ```tsx
 * <Work.Root streaming={answer.streaming}>
 *   <Work.Trigger />
 *   <Work.Content>{steps}</Work.Content>
 * </Work.Root>
 * ```
 */
// Why no asChild and no children: the trigger renders its own label and caret.
function Trigger({ "data-slot": dataSlot, className, ...props }: WorkTriggerProps) {
	const { open } = useWorkContext("Trigger");

	return (
		<Accordion.Trigger
			data-slot={joinDataSlot(dataSlot, "work-trigger")}
			className={cx(
				"text-muted pointer-coarse:py-2 w-auto justify-start gap-1 py-1 text-xs font-normal",
				className,
			)}
			{...props}
		>
			{/* Why a keyed host: a translator can replace the text node, so React swaps the element instead. */}
			<span key={open ? "hide" : "show"} data-slot="work-trigger-label" className="contents">
				{open ? "Hide work" : "Show work"}
			</span>
			{/* Why w-3 only: size-3 would drop the icon's h-lh, which centers it in the first line. */}
			<Accordion.TriggerIcon className="w-3" />
		</Accordion.Trigger>
	);
}

/**
 * The props for `Work.Content`.
 */
type WorkContentProps = ComponentProps<"div"> & WithDataSlot;

/**
 * The steps of the answer, such as a `Reasoning` and each `ToolCall`, in a
 * column. A press in a step, or a find-in-page match in it, keeps the work
 * open when the answer ends, so a step the reader opened stays where they
 * left it.
 *
 * @see https://mantle.ngrok.com/components/ai/work#workcontent
 *
 * @example
 * ```tsx
 * <Work.Root streaming={answer.streaming}>
 *   <Work.Trigger />
 *   <Work.Content>{steps}</Work.Content>
 * </Work.Root>
 * ```
 */
// Why no asChild: the content renders two elements, the region that opens and its body.
function Content({ "data-slot": dataSlot, className, onClick, ref, ...props }: WorkContentProps) {
	const { setChoice } = useWorkContext("Content");
	const nodeRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(nodeRef, ref);
	// Why: the end of the answer must not hide a step the reader used while it streamed.
	const keepOpen = () => setChoice((choice) => choice ?? true);

	// Why a native listener: React has no `onBeforeMatch`. A step's own reveal bubbles here,
	// and the work must stay open for the match once the answer ends.
	useEffect(() => {
		const node = nodeRef.current;
		const reveal = () => setChoice((choice) => choice ?? true);
		node?.addEventListener("beforematch", reveal);
		return () => node?.removeEventListener("beforematch", reveal);
	}, [setChoice]);

	return (
		// Why -mx-3 px-3 on the region: it clips, and a step's focus ring reaches 12px past its text.
		<Accordion.Content className="-mx-3 px-3">
			<Accordion.Body
				ref={composedRef}
				data-slot={joinDataSlot(dataSlot, "work-content")}
				className={cx("flex flex-col gap-1 pb-1", className)}
				{...props}
				onClick={(event) => {
					onClick?.(event);
					if (event.defaultPrevented) {
						return;
					}
					// Why click: it is a finished press from a mouse, a tap, or a key, never a scroll
					// or a focus moved by code. Why contains: React events bubble out of portals.
					if (event.target instanceof Node && event.currentTarget.contains(event.target)) {
						keepOpen();
					}
				}}
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
	WorkRootProps,
	WorkTriggerProps,
	WorkContentProps,
};
