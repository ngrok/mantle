/**
 * Re-exports for the Media Object component.
 *
 * @see https://mantle.ngrok.com/components/structure/media-object
 */

import * as MediaObjectParts from "./media-object-parts.js";

/**
 * A small, reusable layout primitive for "image/icon on one side,
 * descriptive content on the other", the foundational
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
 * - For complex multi-region layouts, reach for {@link https://mantle.ngrok.com/components/structure/card Card} or build a bespoke flex/grid.
 * - When the media is purely decorative and adds no information, drop it
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
 * @useWhen Put an image, an avatar, or an icon beside a title and a description, such as in a
 * comment or a list row.
 *
 * @siblings
 * - `Card`: the content needs a raised box with a border.
 * - `Choice`: the thing beside the text is a checkbox, a radio, or a switch.
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
 * import { Avatar } from "@ngrok/mantle/avatar";
 * import { MediaObject } from "@ngrok/mantle/media-object";
 *
 * <MediaObject.Root>
 *   <MediaObject.Media>
 *     <Avatar.Root>
 *       <Avatar.Image src={user.avatarUrl} alt="" />
 *       <Avatar.Fallback name={user.name} />
 *     </Avatar.Root>
 *   </MediaObject.Media>
 *   <MediaObject.Content>
 *     <p className="font-medium">{user.name}</p>
 *     <p className="text-muted text-sm">{comment}</p>
 *   </MediaObject.Content>
 * </MediaObject.Root>
 * ```
 */
const MediaObject = MediaObjectParts;

export {
	//,
	MediaObject,
};
