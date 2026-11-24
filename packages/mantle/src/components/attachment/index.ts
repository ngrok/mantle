/**
 * Re-exports for the Attachment component.
 *
 * @see https://mantle.ngrok.com/components/preview/attachment
 */

import * as AttachmentParts from "./attachment-parts.js";

/**
 * A file attached to a chat message, as a chip with its preview, name, size,
 * and a remove button. Use it in `PromptInput` for a draft, and under a sent
 * message.
 *
 * @useWhen Show the files attached to a chat message, with a remove button while the message is a
 * draft.
 *
 * @siblings
 * - `PromptInput`: the message box that takes the files.
 * - `Badge`: a short status label, not a file.
 *
 * @see https://mantle.ngrok.com/components/preview/attachment
 *
 * @example
 * Composition:
 * ```
 * Attachment.List
 * └── Attachment.Root
 *     ├── Attachment.Preview
 *     ├── Attachment.Name
 *     ├── Attachment.Size
 *     └── Attachment.Remove
 * ```
 *
 * @example
 * ```tsx
 * <Attachment.List aria-label="Attachments">
 *   {files.map((file) => (
 *     <Attachment.Root key={file.id}>
 *       <Attachment.Preview src={file.previewUrl} />
 *       <Attachment.Name>{file.name}</Attachment.Name>
 *       <Attachment.Size bytes={file.size} />
 *       <Attachment.Remove
 *         label={`Remove ${file.name}`}
 *         onClick={() => removeFile(file.id)}
 *       />
 *     </Attachment.Root>
 *   ))}
 * </Attachment.List>
 * ```
 */
const Attachment = AttachmentParts;

export {
	//,
	Attachment,
};

export type {
	//,
	AttachmentListProps,
	AttachmentNameProps,
	AttachmentPreviewProps,
	AttachmentRemoveProps,
	AttachmentRootProps,
	AttachmentSizeProps,
} from "./attachment.js";
