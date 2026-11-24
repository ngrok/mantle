/**
 * Re-exports for the Reasoning component.
 *
 * @see https://mantle.ngrok.com/components/preview/reasoning
 */

import * as ReasoningParts from "./reasoning-parts.js";

/**
 * A model's reasoning in a chat answer, folded under a one-line label that
 * reads "Thinking…" while it streams. It starts closed, so the answer stays
 * what the reader sees first.
 *
 * @useWhen Show the reasoning a model wrote before its answer, closed by default, with a label that
 * pulses while the model thinks.
 *
 * @siblings
 * - `ToolCall`: a tool the model called while it answered.
 * - `Accordion`: titled sections that are not part of a chat answer.
 *
 * @see https://mantle.ngrok.com/components/preview/reasoning
 *
 * @example
 * Composition:
 * ```
 * Reasoning.Root
 * ├── Reasoning.Trigger
 * └── Reasoning.Content
 * ```
 *
 * @example
 * ```tsx
 * <Reasoning.Root streaming={isThinking}>
 *   <Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
 *   <Reasoning.Content>{reasoning}</Reasoning.Content>
 * </Reasoning.Root>
 * ```
 */
const Reasoning = ReasoningParts;

export {
	//,
	Reasoning,
};

export type {
	//,
	ReasoningContentProps,
	ReasoningRootProps,
	ReasoningTriggerProps,
} from "./reasoning.js";
