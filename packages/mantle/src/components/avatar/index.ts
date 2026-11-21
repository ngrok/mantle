/**
 * Re-exports for the Avatar component.
 *
 * @see https://mantle.ngrok.com/components/data-display/avatar
 */

import * as AvatarParts from "./avatar-parts.js";

/**
 * A small image representing a person or an account, with a text or icon
 * fallback for when there is no picture, or before one loads.
 *
 * `appearance` carries the meaning: `"circle"` for a person, `"square"` (a
 * rounded square) for an account, workspace, team, or organization. A row that
 * shows both (an account switcher with the signed-in user's photo beside it)
 * stays readable without labels because the shapes differ.
 *
 * `colorSeed` gives a subject a stable color derived from its id, so the same
 * account is the same color on every device with nothing stored. Omit it for a
 * neutral surface.
 *
 * The picture is a plain `<img>` layered over the fallback, so the server
 * renders it and a cached image is on screen in the first frame. There is no
 * loading state to handle: the fallback is behind, and shows until the
 * image paints.
 *
 * For a person's name and title beside their avatar, compose it with
 * [MediaObject](https://mantle.ngrok.com/components/structure/media-object).
 * For the leading visual of a sidebar switcher row, put it inside
 * [Sidebar.SwitcherTrigger](https://mantle.ngrok.com/components/navigation/sidebar#sidebarswitchertrigger).
 *
 * @useWhen Show a small picture of a person or an account, with initials or an icon when there is
 * no picture.
 *
 * @siblings
 * - `MediaObject`: the picture sits beside a title and a description.
 * - `Icon`: the image is a generic symbol, not a person or an account.
 *
 * @see https://mantle.ngrok.com/components/data-display/avatar
 *
 * @example
 * Composition:
 * ```
 * Avatar.Root
 * ├── Avatar.Image
 * └── Avatar.Fallback
 * ```
 *
 * @example
 * ```tsx
 * <Avatar.Root appearance="square" colorSeed="acc_123">
 *   <Avatar.Image src="https://example.com/acme.png" alt="" />
 *   <Avatar.Fallback name="Acme Corp" />
 * </Avatar.Root>
 * ```
 */
const Avatar = AvatarParts;

export {
	//,
	Avatar,
};

export type {
	//,
	AvatarAppearance,
	AvatarFallbackProps,
	AvatarImageProps,
	AvatarRootProps,
} from "./avatar.js";
