/**
 * Re-exports for the Work component.
 *
 * @see https://mantle.ngrok.com/components/ai/work
 */

import * as WorkParts from "./work-parts.js";

/**
 * The work behind one chat answer, its reasoning and its tool calls, under
 * one "Show work" toggle. The work shows while the answer streams and folds
 * away when it ends, so the finished answer is what the reader sees.
 *
 * @useWhen Fold the reasoning and the tool calls of one chat answer under one "Show work" / "Hide
 * work" toggle that stays open while the answer streams.
 *
 * @siblings
 * - `Reasoning`: one block of reasoning, a step inside `Work.Content`.
 * - `ToolCall`: one tool call, a step inside `Work.Content`.
 * - `Accordion`: titled sections that are not part of a chat answer.
 *
 * @see https://mantle.ngrok.com/components/ai/work
 *
 * @example
 * Composition:
 * ```
 * Work.Root
 * ├── Work.Trigger
 * └── Work.Content
 *     ├── Reasoning.Root
 *     └── ToolCall.Root
 * ```
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
const Work = WorkParts;

export {
	//,
	Work,
};

export type {
	//,
	WorkContentProps,
	WorkRootProps,
	WorkTriggerProps,
} from "./work.js";
