import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type Props = ComponentProps<"div"> & WithAsChild;

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
const Root = ({ asChild = false, className, children, style, ref }: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="media-object"
			className={cx("flex gap-4", className)}
			style={style}
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
const Media = ({ asChild = false, className, children, style, ref }: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="media-object-media"
			className={cx("shrink-0 leading-none", className)}
			style={style}
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
const Content = ({ asChild = false, className, children, style, ref }: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			ref={ref}
			data-slot="media-object-content"
			className={cx("min-w-0 flex-1", className)}
			style={style}
		>
			{children}
		</Component>
	);
};

/**
 * A small, reusable layout primitive for "image/icon on one side,
 * descriptive content on the other" — the foundational
 * {@link https://www.stubbornella.org/2010/06/25/the-media-object-saves-hundreds-of-lines-of-code/ "media object" pattern}.
 * Use it to compose avatars-with-text, icons-with-copy, thumbnails-with-titles,
 * and similar two-up rows without re-implementing flexbox each time.
 *
 * **When to use**
 * - Comment threads (avatar + name + body).
 * - Compact list items (icon + label + secondary text).
 * - Notification rows.
 * - Feature lists, profile cards, attachment previews.
 *
 * **When not to use**
 * - For complex multi-region layouts — reach for {@link https://mantle.ngrok.com/components/structure/card Card} or build a bespoke flex/grid.
 * - When the media is purely decorative and adds no information — drop it
 *   and use a plain block.
 *
 * **Spacing & alignment.** Default gap is `gap-4`; override by passing a
 * different `gap-*` class to `MediaObject.Root`. Use standard flex
 * utilities (`items-start`, `items-center`, etc.) to align media and
 * content vertically.
 *
 * **Polymorphism.** Each part accepts `asChild` for swapping the rendered
 * element (e.g. render `Root` as an `<a>` to make the whole row clickable).
 *
 * @see https://mantle.ngrok.com/components/structure/media-object
 *
 * @example
 * Composition:
 * ```
 * MediaObject.Root
 * ├── MediaObject.Media
 * └── MediaObject.Content
 * ```
 *
 * @example
 * ```tsx
 * import { MediaObject } from "@ngrok/mantle/media-object";
 *
 * <MediaObject.Root>
 *   <MediaObject.Media>
 *     <Avatar src={user.avatarUrl} alt="" />
 *   </MediaObject.Media>
 *   <MediaObject.Content>
 *     <p className="font-medium">{user.name}</p>
 *     <p className="text-muted text-sm">{comment}</p>
 *   </MediaObject.Content>
 * </MediaObject.Root>
 * ```
 */
const MediaObject = {
	/**
	 * The media object is an image/icon (media) to the left, with descriptive
	 * content (title and subtitle/description) to the right. This is the root
	 * component of the media object.
	 *
	 * Change the spacing between the media and content by passing a `gap-*` class.
	 * The default gap is `gap-4`.
	 *
	 * Use flexbox utilities to change the alignment of the media and content.
	 *
	 * Compose the media object with the `MediaObject.Media` and `MediaObject.Content`
	 * components as direct children.
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
	Root,
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
	Media,
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
	Content,
} as const;

export {
	//,
	MediaObject,
};
