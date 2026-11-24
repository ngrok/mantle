/**
 * Re-exports for the Prompt Input component.
 *
 * @see https://mantle.ngrok.com/components/preview/prompt-input
 */

import * as PromptInputParts from "./prompt-input-parts.js";

/**
 * The message box of a chat: a text field that grows with its text and a
 * button that sends the message, or stops the answer while one streams.
 * Enter sends and Shift+Enter adds a line.
 *
 * @useWhen Let a person write and send a message to an assistant or a model, and stop the answer while
 * it streams.
 *
 * @siblings
 * - `TextArea`: a form field for free-form text that a form submits with its other fields.
 * - `Input`: a single-line field, such as a search box.
 *
 * @see https://mantle.ngrok.com/components/preview/prompt-input
 *
 * @example
 * Composition:
 * ```
 * PromptInput.Root
 * ├── PromptInput.TextArea
 * └── PromptInput.Footer
 *     └── PromptInput.Submit
 * ```
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
const PromptInput = PromptInputParts;

export {
	//,
	PromptInput,
};

export type {
	//,
	PromptInputFooterProps,
	PromptInputRootProps,
	PromptInputSubmitProps,
	PromptInputTextAreaProps,
} from "./prompt-input.js";
