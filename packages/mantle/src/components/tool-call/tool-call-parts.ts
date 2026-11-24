/**
 * The parts of the `ToolCall` namespace. `index.ts` imports them as one
 * module namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Trigger,
	Name,
	Content,
} from "./tool-call.js";
