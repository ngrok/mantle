/**
 * Re-exports for the Toast component.
 *
 * @see https://mantle.ngrok.com/components/feedback/toast
 */

import * as ToastParts from "./toast-parts.js";

export {
	//,
	makeToast,
	Toaster,
} from "./toast.js";

/**
 * A succinct message that appears temporarily. Toasts give the user feedback
 * without interrupting their workflow.
 *
 * @useWhen Report the result of an action, such as a save or a copy, in a brief message that goes
 * away on its own.
 *
 * @siblings
 * - `Alert`: the message stays in the page next to the content it describes.
 * - `AlertDialog`: the user must respond before they continue.
 * - `Sandbar`: the message waits for the user to save or discard pending changes.
 *
 * @see https://mantle.ngrok.com/components/feedback/toast
 *
 * @example
 * Composition:
 * ```
 * Toast.Root
 * ├── Toast.Icon
 * ├── Toast.Message
 * └── Toast.Action
 * ```
 *
 * @example
 * ```tsx
 * makeToast(
 *   <Toast.Root intent="success">
 *     <Toast.Icon />
 *     <Toast.Message>Operation completed successfully!</Toast.Message>
 *     <Toast.Action>Dismiss</Toast.Action>
 *   </Toast.Root>
 * );
 * ```
 */
const Toast = ToastParts;

export {
	//,
	Toast,
};

export type {
	//,
	ToastIntent,
} from "./toast.js";
