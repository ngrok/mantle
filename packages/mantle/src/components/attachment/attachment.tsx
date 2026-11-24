"use client";

import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps } from "react";
import { cloneElement, isValidElement } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { IconButton } from "../button/icon-button.js";
import { Icon } from "../icon/icon.js";
import { Slot } from "../slot/index.js";
import { formatFileSize } from "./format-file-size.js";

/**
 * The props for `Attachment.List`.
 */
type AttachmentListProps = ComponentProps<"ul"> & WithAsChild & WithDataSlot;

/**
 * The list of files attached to a message, as chips that wrap. Name it, such
 * as `aria-label="Attachments"`.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"attachment-list"` | On the list, joined with ancestor slots. |
 *
 * @see https://mantle.ngrok.com/components/ai/attachment#attachmentlist
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
function List({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: AttachmentListProps) {
	const Component = asChild ? Slot : "ul";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "attachment-list")}
			className={cx("flex flex-wrap gap-2", className)}
			{...props}
		/>
	);
}

/**
 * The props for `Attachment.Root`.
 */
type AttachmentRootProps = ComponentProps<"li"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * True while the app still reads the file. The chip sets `aria-busy`,
		 * and the app can show a `Skeleton` in place of `Attachment.Preview`.
		 *
		 * @default false
		 */
		busy?: boolean;
	};

/**
 * One attached file: a chip with its preview, its name over its size, and a
 * remove button. The chip lays its parts out by their `data-slot`, so they
 * can come in any order.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"attachment"` | On the chip, joined with ancestor slots. |
 *
 * @see https://mantle.ngrok.com/components/ai/attachment#attachmentroot
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
function Root({
	"data-slot": dataSlot,
	asChild = false,
	busy = false,
	className,
	...props
}: AttachmentRootProps) {
	const Component = asChild ? Slot : "li";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "attachment")}
			aria-busy={busy || undefined}
			className={cx(
				"border-card bg-card grid max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-lg border py-1.5 ps-1.5 pe-1",
				// Why margins, not a gap: a grid keeps the gap beside an empty track, so a chip without a preview or remove button would gain space.
				"[&>[data-slot~=attachment-preview]]:me-2 [&>[data-slot~=attachment-remove]]:ms-2",
				"[&>[data-slot~=attachment-preview]]:col-start-1 [&>[data-slot~=attachment-preview]]:row-span-2 [&>[data-slot~=attachment-preview]]:row-start-1",
				"[&>[data-slot~=attachment-name]]:col-start-2 [&>[data-slot~=attachment-name]]:row-start-1 [&>[data-slot~=attachment-size]]:col-start-2 [&>[data-slot~=attachment-size]]:row-start-2",
				"[&>[data-slot~=attachment-remove]]:col-start-3 [&>[data-slot~=attachment-remove]]:row-span-2 [&>[data-slot~=attachment-remove]]:row-start-1",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * The props for `Attachment.Preview`.
 */
type AttachmentPreviewProps = Omit<ComponentProps<"img">, "alt" | "children" | "height" | "width"> &
	WithDataSlot;

/**
 * A 32-pixel thumbnail of an image file, or a file icon when `src` is not
 * set. It is decorative: `Attachment.Name` names the file. Without `src`,
 * `ref` and event handlers reach the icon's `<span>`, not an image.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"attachment-preview"` | On the image or icon wrapper, joined with ancestor slots. |
 *
 * @see https://mantle.ngrok.com/components/ai/attachment#attachmentpreview
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
// Why no asChild: the part picks between an image and an icon.
function Preview({ "data-slot": dataSlot, className, src, ...props }: AttachmentPreviewProps) {
	const slot = joinDataSlot(dataSlot, "attachment-preview");
	if (src == null || src === "") {
		return (
			<span
				data-slot={slot}
				className={cx(
					"text-muted flex size-8 items-center justify-center rounded bg-neutral-500/8",
					className,
				)}
				{...props}
			>
				<Icon svg={<FileTextIcon />} className="size-4" />
			</span>
		);
	}
	return (
		<img
			data-slot={slot}
			src={src}
			alt=""
			width={32}
			height={32}
			className={cx("size-8 rounded object-cover", className)}
			{...props}
		/>
	);
}

/**
 * The props for `Attachment.Name`.
 */
type AttachmentNameProps = Omit<ComponentProps<"span">, "translate"> & WithAsChild & WithDataSlot;

/**
 * The file's name. It truncates when the chip is narrow, and never
 * translates. Set `title` to show the whole name on hover.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"attachment-name"` | On the name, joined with ancestor slots. |
 *
 * @see https://mantle.ngrok.com/components/ai/attachment#attachmentname
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
function Name({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	...props
}: AttachmentNameProps) {
	const Component = asChild ? Slot : "span";
	// Why: Slot gives child props precedence, so the filename's lock must also reach the child.
	const content =
		asChild && isValidElement<ComponentProps<"span">>(children)
			? cloneElement(children, { translate: "no" })
			: children;

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "attachment-name")}
			className={cx("text-strong max-w-48 truncate text-xs", className)}
			{...props}
			translate="no"
		>
			{content}
		</Component>
	);
}

/**
 * The props for `Attachment.Size`.
 */
type AttachmentSizeProps = Omit<ComponentProps<"span">, "children"> &
	WithDataSlot & {
		/** The file's size in bytes, such as `file.size`. */
		bytes: number;
	};

/**
 * The file's size, such as "1.5 KB", under its name.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"attachment-size"` | On the size, joined with ancestor slots. |
 *
 * @see https://mantle.ngrok.com/components/ai/attachment#attachmentsize
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
// Why no asChild: the part renders its own text from `bytes`.
function Size({ "data-slot": dataSlot, bytes, className, ...props }: AttachmentSizeProps) {
	return (
		<span
			data-slot={joinDataSlot(dataSlot, "attachment-size")}
			className={cx("text-muted text-xs", className)}
			{...props}
		>
			{formatFileSize(bytes)}
		</span>
	);
}

/**
 * The props for `Attachment.Remove`.
 */
type AttachmentRemoveProps = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "type"
>;

/**
 * The button that removes a file from a draft message.
 * Name the file in the required `label`, such as "Remove report.pdf".
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"attachment-remove icon-button"` | On the button, joined with ancestor slots. |
 * | `data-icon-button` | `"true"` | Inherited from `IconButton`. |
 * | `data-appearance` | `"ghost"` | The button's appearance. |
 * | `data-intent` | `"neutral"` | The button's tone. |
 * | `data-size` | `"2xs"` \| `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | The `size` prop; defaults to `"sm"`. |
 * | `data-loading` | present when `isLoading` | Inherited from `IconButton`. |
 *
 * @see https://mantle.ngrok.com/components/ai/attachment#attachmentremove
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
// Why no asChild: the part owns its icon.
function Remove({ "data-slot": dataSlot, className, ...props }: AttachmentRemoveProps) {
	return (
		<IconButton
			appearance="ghost"
			intent="neutral"
			size="sm"
			type="button"
			data-slot={joinDataSlot(dataSlot, "attachment-remove")}
			className={cx("text-muted size-7", className)}
			icon={<XIcon />}
			{...props}
		/>
	);
}

export {
	//,
	List,
	Root,
	Preview,
	Name,
	Size,
	Remove,
};

export type {
	//,
	AttachmentListProps,
	AttachmentRootProps,
	AttachmentPreviewProps,
	AttachmentNameProps,
	AttachmentSizeProps,
	AttachmentRemoveProps,
};
