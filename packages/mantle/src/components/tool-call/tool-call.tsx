"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { CircleDashedIcon } from "@phosphor-icons/react/CircleDashed";
import { MinusCircleIcon } from "@phosphor-icons/react/MinusCircle";
import { WrenchIcon } from "@phosphor-icons/react/Wrench";
import { XCircleIcon } from "@phosphor-icons/react/XCircle";
import type { ComponentProps, ReactElement } from "react";
import { cloneElement, createContext, isValidElement, use } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import * as Accordion from "../accordion/accordion-parts.js";
import { Icon } from "../icon/icon.js";
import { Slot } from "../slot/index.js";

/**
 * The state of a tool call. `running` until the result arrives, then `done`,
 * or `failed` when the tool returned an error. `interrupted` when the answer
 * ended, by a stop or a failure, before the result arrived. `requested` when
 * the view shows the call but will never get its result, such as a captured
 * request whose response ended with `finish_reason: "tool_calls"`.
 */
type ToolCallStatus = "running" | "done" | "failed" | "interrupted" | "requested";

const statusLabels = {
	running: "Running",
	done: "Done",
	failed: "Failed",
	interrupted: "Interrupted",
	requested: "Requested",
} as const satisfies Record<ToolCallStatus, string>;

const statusIcons = {
	running: (
		<Icon
			svg={<WrenchIcon />}
			className="text-muted size-4 shrink-0 animate-pulse motion-reduce:animate-none"
		/>
	),
	done: (
		<Icon svg={<CheckCircleIcon weight="fill" />} className="text-success-600 size-4 shrink-0" />
	),
	failed: <Icon svg={<XCircleIcon weight="fill" />} className="text-danger-600 size-4 shrink-0" />,
	interrupted: (
		<Icon svg={<MinusCircleIcon weight="fill" />} className="text-muted size-4 shrink-0" />
	),
	requested: (
		<Icon svg={<CircleDashedIcon weight="regular" />} className="text-muted size-4 shrink-0" />
	),
} as const satisfies Record<ToolCallStatus, ReactElement>;

const ToolCallContext = createContext<ToolCallStatus | null>(null);

function useToolCallStatus(part: string): ToolCallStatus {
	const status = use(ToolCallContext);
	invariant(status != null, `ToolCall.${part} must be rendered inside ToolCall.Root.`);
	return status;
}

/**
 * The props for `ToolCall.Root`.
 */
type ToolCallRootProps = Omit<ComponentProps<"div">, "defaultValue"> &
	WithDataSlot & {
		/** The state of the call. Required. */
		status: ToolCallStatus;
	};

/**
 * One tool call of an answer, folded under a row that names the tool and its
 * state. It starts closed.
 *
 * | Data Attribute | Value                                                             | Description                                                |
 * | -------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
 * | `data-status`  | `"running"`, `"done"`, `"failed"`, `"interrupted"`, `"requested"` | The state of the call. Style with `data-[status=failed]:`. |
 *
 * @see https://mantle.ngrok.com/components/ai/tool-call#toolcallroot
 *
 * @example
 * ```tsx
 * <ToolCall.Root status="done">
 *   <ToolCall.Trigger>
 *     <ToolCall.Name>list_endpoints</ToolCall.Name>
 *   </ToolCall.Trigger>
 *   <ToolCall.Content>
 *     <CodeBlock.Root>
 *       <CodeBlock.Body>
 *         <CodeBlock.Code value={jsonCodeBlockValue({ limit: 5 })} />
 *       </CodeBlock.Body>
 *     </CodeBlock.Root>
 *   </ToolCall.Content>
 * </ToolCall.Root>
 * ```
 */
// Why no asChild: Root renders two elements, the accordion and its one item.
function Root({ "data-slot": dataSlot, children, className, status, ...props }: ToolCallRootProps) {
	return (
		<ToolCallContext value={status}>
			<Accordion.Root
				data-slot={joinDataSlot(dataSlot, "tool-call")}
				className={cx("w-full", className)}
				{...props}
				data-status={status}
			>
				<Accordion.Item value="tool-call">{children}</Accordion.Item>
			</Accordion.Root>
		</ToolCallContext>
	);
}

/**
 * The props for `ToolCall.Trigger`.
 */
type ToolCallTriggerProps = Omit<ComponentProps<"button">, "type"> & WithDataSlot;

/**
 * The disclosure row shows a state icon, its children, a state label, and a caret.
 *
 * The children sit in a `display: contents` wrapper,
 * `data-slot="tool-call-trigger-label"`, so a translated page survives a
 * change to them.
 *
 * @see https://mantle.ngrok.com/components/ai/tool-call#toolcalltrigger
 *
 * @example
 * ```tsx
 * <ToolCall.Root status="done">
 *   <ToolCall.Trigger>
 *     <ToolCall.Name>list_endpoints</ToolCall.Name>
 *   </ToolCall.Trigger>
 *   <ToolCall.Content>
 *     <CodeBlock.Root>
 *       <CodeBlock.Body>
 *         <CodeBlock.Code value={jsonCodeBlockValue({ limit: 5 })} />
 *       </CodeBlock.Body>
 *     </CodeBlock.Root>
 *   </ToolCall.Content>
 * </ToolCall.Root>
 * ```
 */
// Why no asChild: the trigger renders its icon, state, and caret beside the children.
function Trigger({ "data-slot": dataSlot, children, className, ...props }: ToolCallTriggerProps) {
	const status = useToolCallStatus("Trigger");

	return (
		<Accordion.Trigger
			data-slot={joinDataSlot(dataSlot, "tool-call-trigger")}
			className={cx(
				"pointer-coarse:py-2 justify-start gap-2 py-1 text-xs font-normal",
				// Why: a pointer that hovers sees the caret on hover, focus, or open. A device with any
				// touch input always sees it, because a tap has no hover to reveal it first.
				"[@media(hover:hover)_and_(not_(any-pointer:coarse))]:[&:not(:hover,:focus-visible)[aria-expanded=false]>[data-slot~=accordion-trigger-icon]]:opacity-0",
				className,
			)}
			{...props}
		>
			{statusIcons[status]}
			<span data-slot="tool-call-trigger-label" className="contents">
				{children}
			</span>
			<span className="text-muted">{statusLabels[status]}</span>
			{/* Why w-3 only: size-3 would drop the icon's h-lh, which centers it in the first line. */}
			<Accordion.TriggerIcon className="w-3" />
		</Accordion.Trigger>
	);
}

/**
 * The props for `ToolCall.Name`.
 */
type ToolCallNameProps = Omit<ComponentProps<"code">, "translate"> & WithAsChild & WithDataSlot;

/**
 * The tool's name, as the model called it, in code type. It truncates when
 * the row is narrow, and never translates.
 *
 * @see https://mantle.ngrok.com/components/ai/tool-call#toolcallname
 *
 * @example
 * ```tsx
 * <ToolCall.Root status="done">
 *   <ToolCall.Trigger>
 *     <ToolCall.Name>list_endpoints</ToolCall.Name>
 *   </ToolCall.Trigger>
 *   <ToolCall.Content>
 *     <CodeBlock.Root>
 *       <CodeBlock.Body>
 *         <CodeBlock.Code value={jsonCodeBlockValue({ limit: 5 })} />
 *       </CodeBlock.Body>
 *     </CodeBlock.Root>
 *   </ToolCall.Content>
 * </ToolCall.Root>
 * ```
 */
function Name({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	...props
}: ToolCallNameProps) {
	const Component = asChild ? Slot : "code";
	// Why: Slot gives child props precedence, so the identifier's lock must also reach the child.
	const content =
		asChild && isValidElement<ComponentProps<"code">>(children)
			? cloneElement(children, { translate: "no" })
			: children;

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "tool-call-name")}
			className={cx("text-strong min-w-0 truncate font-mono", className)}
			{...props}
			translate="no"
		>
			{content}
		</Component>
	);
}

/**
 * The props for `ToolCall.Content`.
 */
type ToolCallContentProps = ComponentProps<"div"> & WithDataSlot;

/**
 * What the model sent the tool and what came back, such as two `CodeBlock`s.
 * The children stack with a small gap.
 *
 * @see https://mantle.ngrok.com/components/ai/tool-call#toolcallcontent
 *
 * @example
 * ```tsx
 * <ToolCall.Root status="done">
 *   <ToolCall.Trigger>
 *     <ToolCall.Name>list_endpoints</ToolCall.Name>
 *   </ToolCall.Trigger>
 *   <ToolCall.Content>
 *     <CodeBlock.Root>
 *       <CodeBlock.Body>
 *         <CodeBlock.Code value={jsonCodeBlockValue({ limit: 5 })} />
 *       </CodeBlock.Body>
 *     </CodeBlock.Root>
 *   </ToolCall.Content>
 * </ToolCall.Root>
 * ```
 */
// Why no asChild: the content renders two elements, the region that opens and its body.
function Content({ "data-slot": dataSlot, className, ...props }: ToolCallContentProps) {
	useToolCallStatus("Content");

	return (
		<Accordion.Content>
			<Accordion.Body
				data-slot={joinDataSlot(dataSlot, "tool-call-content")}
				className={cx("flex flex-col gap-2", className)}
				{...props}
			/>
		</Accordion.Content>
	);
}

export {
	//,
	Root,
	Trigger,
	Name,
	Content,
};

export type {
	//,
	ToolCallStatus,
	ToolCallRootProps,
	ToolCallTriggerProps,
	ToolCallNameProps,
	ToolCallContentProps,
};
