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
 * A brief message that shows the result of an action, such as a save or a failed request, then
 * goes away on its own. Toasts give the user feedback without interrupting their workflow.
 *
 * @useWhen Show the result of an action in a brief message that goes away on its own, such as a
 * saved change, a copied value, or an error when a delete failed.
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
