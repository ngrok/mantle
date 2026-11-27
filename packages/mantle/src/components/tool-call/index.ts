/**
 * Re-exports for the Tool Call component.
 *
 * @see https://mantle.ngrok.com/components/ai/tool-call
 */

import * as ToolCallParts from "./tool-call-parts.js";

/**
 * One tool call of a chat answer, folded under a row with the tool's name and
 * its state: running, done, failed, interrupted, or requested. Open it to
 * read what the model sent the tool and what came back.
 *
 * @useWhen Show a tool that a model called while it answered, with its state, and its arguments and
 * result behind a disclosure.
 *
 * @siblings
 * - `Reasoning`: the reasoning a model wrote before its answer.
 * - `Work`: the toggle that folds every step of one answer.
 * - `Accordion`: titled sections that are not part of a chat answer.
 *
 * @see https://mantle.ngrok.com/components/ai/tool-call
 *
 * @example
 * Composition:
 * ```
 * ToolCall.Root
 * ├── ToolCall.Trigger
 * │   └── ToolCall.Name
 * └── ToolCall.Content
 * ```
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
const ToolCall = ToolCallParts;

export {
	//,
	ToolCall,
};

export type {
	//,
	ToolCallContentProps,
	ToolCallNameProps,
	ToolCallRootProps,
	ToolCallStatus,
	ToolCallTriggerProps,
} from "./tool-call.js";
