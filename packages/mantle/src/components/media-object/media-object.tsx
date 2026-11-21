// Why "use no memo": a server component can render this file. A stateless part gains nothing from
// the compiler, and its cache hook would make the build mark the chunk "use client".
"use no memo";

import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

type Props = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The media object is an image/icon (media) to the left, with descriptive
 * content (title and subtitle/description) to the right. This is the root
 * component of the media object.
 *
 * @see https://mantle.ngrok.com/components/structure/media-object#mediaobjectroot
 *
 * @example
 * ```tsx
 * <MediaObject.Root>
 *   <MediaObject.Media>
 *     <ExampleMedia />
 *   </MediaObject.Media>
 *   <MediaObject.Content>
 *     <p>Ea culpa id id ea minim labore.</p>
 *   </MediaObject.Content>
 * </MediaObject.Root>
 * ```
 */
const Root = ({
	asChild = false,
	className,
	children,
	"data-slot": dataSlot,
	ref,
	...props
}: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "media-object")}
			className={cx("flex gap-4", className)}
			{...props}
		>
			{children}
		</Component>
	);
};

/**
 * The container for an image or icon to display in the media slot of the media object.
 *
 * @see https://mantle.ngrok.com/components/structure/media-object#mediaobjectmedia
 *
 * @example
 * ```tsx
 * <MediaObject.Root>
 *   <MediaObject.Media>
 *     <ExampleMedia />
 *   </MediaObject.Media>
 *   <MediaObject.Content>
 *     <p>Ea culpa id id ea minim labore.</p>
 *   </MediaObject.Content>
 * </MediaObject.Root>
 * ```
 */
const Media = ({
	asChild = false,
	className,
	children,
	"data-slot": dataSlot,
	ref,
	...props
}: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "media-object-media")}
			className={cx("shrink-0 leading-none", className)}
			{...props}
		>
			{children}
		</Component>
	);
};

/**
 * The container for the content slot of a media object.
 *
 * @see https://mantle.ngrok.com/components/structure/media-object#mediaobjectcontent
 *
 * @example
 * ```tsx
 * <MediaObject.Root>
 *   <MediaObject.Media>
 *     <ExampleMedia />
 *   </MediaObject.Media>
 *   <MediaObject.Content>
 *     <p>Ea culpa id id ea minim labore.</p>
 *   </MediaObject.Content>
 * </MediaObject.Root>
 * ```
 */
const Content = ({
	asChild = false,
	className,
	children,
	"data-slot": dataSlot,
	ref,
	...props
}: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "media-object-content")}
			className={cx("min-w-0 flex-1", className)}
			{...props}
		>
			{children}
		</Component>
	);
};

export {
	//,
	Root,
	Media,
	Content,
};
