/**
 * The parts of the `PromptInput` namespace. `index.ts` imports them as one
 * module namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	PromptInputTextArea as TextArea,
	Footer,
	AttachButton,
	Submit,
} from "./prompt-input.js";
