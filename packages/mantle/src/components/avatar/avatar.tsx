"use client";

import type { ComponentProps, ReactEventHandler, ReactNode } from "react";
import { useState } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The shape an `Avatar.Root` renders as. Circles read as people, rounded
 * squares as the things people belong to — accounts, workspaces, teams,
 * organizations. Keeping the two shapes visually distinct is the point: a
 * switcher row showing both at once stays legible without labels.
 *
 * @see https://mantle.ngrok.com/components/data-display/avatar
 *
 * @example
 * ```tsx
 * <Avatar.Root appearance="square" colorSeed="acc_123">
 *   <Avatar.Fallback name="Acme Corp" />
 * </Avatar.Root>
 * ```
 */
type AvatarAppearance = "circle" | "square";

/**
 * The border radius each {@link AvatarAppearance} paints. A complete `Record`
 * (not cva) so adding an appearance without its classes is a compile error.
 */
const appearanceClassName: Record<AvatarAppearance, string> = {
	circle: "rounded-full",
	square: "rounded-md",
};

/**
 * The swatch palette a `colorSeed` selects from. Every entry is a Tailwind
 * background color. Keep the hue order stable: {@link swatchClassName} indexes
 * into this tuple by seed hash, so reordering it changes the color of every
 * account already on screen.
 */
const swatchClassNames = [
	"bg-emerald-500",
	"bg-gray-500",
	"bg-red-500",
	"bg-violet-500",
	"bg-cyan-500",
	"bg-rose-500",
	"bg-purple-500",
	"bg-fuchsia-500",
	"bg-green-500",
	"bg-orange-500",
	"bg-indigo-500",
	"bg-teal-500",
	"bg-yellow-500",
	"bg-sky-500",
	"bg-pink-500",
	"bg-blue-500",
	"bg-amber-500",
] as const;

/**
 * djb2 is a stable, fast string hashing function. It is what makes a seed's
 * swatch reproducible across renders, sessions, devices, and the server — an
 * account keeps its color everywhere, with nothing stored.
 */
function djb2Hash(value: string): number {
	let hash = 5381;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 33) ^ value.charCodeAt(index);
	}
	// Convert to unsigned 32-bit so the modulo below stays positive.
	return hash >>> 0;
}

/**
 * The swatch class a seed maps to — the same seed always yields the same
 * swatch.
 *
 * @example
 * ```ts
 * swatchClassName("acc_123"); // e.g. "bg-violet-500"
 * ```
 */
function swatchClassName(seed: string): string {
	const index = djb2Hash(seed) % swatchClassNames.length;
	// `swatchClassNames` is a non-empty `as const` tuple; the fallback satisfies
	// the strict-mode index-access type without a non-null assertion.
	return swatchClassNames[index] ?? "bg-neutral-500";
}

/**
 * At most two uppercase initials for a name: punctuation is stripped, the first
 * code point of each of the first two words is kept (so an emoji-leading name is
 * not split mid-surrogate), casing is locale-invariant so SSR and client agree,
 * and a name with no usable characters renders `"?"`.
 *
 * @example
 * ```ts
 * initialsFromName("Acme Corp"); // "AC"
 * initialsFromName("jane"); // "J"
 * initialsFromName("山田 太郎"); // "山太"
 * initialsFromName("straße hof"); // "SH" — not "SSH"
 * initialsFromName("…"); // "?"
 * ```
 */
function initialsFromName(name: string): string {
	const initials = name
		// `\p{P}` reaches the punctuation an ASCII class cannot — ellipses,
		// guillemets, em dashes — while leaving `\p{S}` symbols alone so an
		// emoji-leading name still resolves to the emoji rather than to `"?"`. The
		// ASCII tail covers the symbols that read as punctuation in a name.
		.replace(/[\p{P}`~!@#$%^&*+|=<>]/gu, "")
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map(
			(part) =>
				// Uppercase the word BEFORE taking its first code point, not the joined
				// result: "ß".toUpperCase() is "SS" and "ﬄ" is "FFL", so uppercasing
				// afterwards would blow past two characters. Locale-invariant on purpose
				// — toLocaleUpperCase() follows the *host* locale, so an SSR server and a
				// Turkish-locale client would disagree (i → İ) and mismatch on hydration.
				// `Array.from` iterates code points, so an astral character or emoji
				// survives instead of being cut in half.
				Array.from(part.toUpperCase())[0] ?? "",
		)
		.join("");
	return initials || "?";
}

/**
 * The props for `Avatar.Root`. A `<span>`'s props — so `className`, `style`,
 * `ref`, `asChild`, and any `data-*` or `aria-*` reach the rendered element —
 * plus the shape and swatch this root owns.
 */
type AvatarRootProps = ComponentProps<"span"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The shape to render. `"circle"` for a person, `"square"` for a rounded
		 * square representing an account, workspace, or team.
		 *
		 * @default "circle"
		 */
		appearance?: AvatarAppearance;
		/**
		 * A stable identifier — an account id, a user id — that deterministically
		 * selects a background swatch, so the same subject always gets the same
		 * color with nothing persisted. Omit it for a neutral surface, or set your
		 * own `bg-*` class through `className` to opt out entirely.
		 *
		 * Seed it with an **id, not a display name**: names get edited, and a
		 * rename would silently recolor the avatar.
		 */
		colorSeed?: string;
	};

/**
 * A small image representing a person or an account, with a text or icon
 * fallback for when there is no picture — or before one loads.
 *
 * The root sizes and shapes the avatar and paints the surface behind it. It is
 * `size-7` and `shrink-0` by default: an avatar is a fixed-size visual, and the
 * flex rows it usually sits in (a switcher row, a table cell, a comment header)
 * must not be able to squeeze it. Override the size with `className`, which
 * merges last and wins.
 *
 * It renders a `<span>`, not a `<div>`, so it stays valid inside the `<button>`
 * of a switcher row.
 *
 * @see https://mantle.ngrok.com/components/data-display/avatar#avatarroot
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value      | Description                                             |
 * | -------------- | ---------- | ------------------------------------------------------- |
 * | `data-slot`    | `"avatar"` | Styling and test-targeting hook, with any forwarded chain ahead of it. |
 *
 * @example
 * ```tsx
 * <Avatar.Root appearance="square" colorSeed="acc_123">
 *   <Avatar.Image src="https://example.com/acme.png" alt="" />
 *   <Avatar.Fallback name="Acme Corp" />
 * </Avatar.Root>
 * ```
 */
const Root = ({
	appearance = "circle",
	asChild,
	className,
	colorSeed,
	"data-slot": dataSlot,
	...props
}: AvatarRootProps) => {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			className={cx(
				// `relative` is load-bearing: `Avatar.Image` positions itself against
				// this box so it covers the fallback rather than displacing it.
				"text-body bg-neutral-500/15 relative flex size-7 shrink-0 items-center justify-center overflow-hidden text-xs font-medium select-none",
				appearanceClassName[appearance],
				// A seeded swatch is a colored surface, so its content switches to the
				// static white that stays legible on every hue in both themes.
				colorSeed != null && ["text-static-white", swatchClassName(colorSeed)],
				className,
			)}
			data-slot={joinDataSlot(dataSlot, "avatar")}
			{...props}
		/>
	);
};

/**
 * The props for `Avatar.Image`. An `<img>`'s props — so `srcSet`, `sizes`,
 * `loading`, `referrerPolicy`, `crossOrigin`, `className`, `style`, `ref`,
 * `asChild`, and any `data-*` reach the element — with `alt` promoted to
 * required.
 */
type AvatarImageProps = Omit<ComponentProps<"img">, "alt" | "onError"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The image's alternative text. **Required**, deliberately stricter than the
		 * `<img>` element: an avatar is the one image a developer reliably forgets,
		 * and an `<img>` with no `alt` announces its URL.
		 *
		 * Pass `alt=""` when adjacent text already names the subject — the common
		 * case, and the reason this is not just "always pass the name". Pass the name
		 * when the avatar stands alone, and name `Avatar.Root` as well (`role="img"`
		 * + `aria-label`) so the label survives the states where the image is gone.
		 */
		alt: string;
		/**
		 * Called when the image fails to load, **before** it unmounts itself.
		 * `preventDefault()` keeps it mounted, for a consumer who would rather retry
		 * a URL than fall back.
		 *
		 * Typed against `HTMLElement` rather than `HTMLImageElement`, because
		 * `asChild` means the element that failed may be a consumer's own.
		 */
		onError?: ReactEventHandler<HTMLElement>;
	};

/**
 * The avatar's picture, layered over `Avatar.Fallback` so the fallback shows
 * through until the image paints. It is a plain `<img>` in the markup, which is
 * the whole point: the server renders it, the browser starts fetching while it
 * parses the HTML, and a cached image is simply *there* on the first frame — no
 * hydration, no swap, no flash of initials.
 *
 * A failed load unmounts the image and leaves the fallback showing. That covers
 * every failure the client can observe; one it cannot is a load that fails
 * *before* hydration, where the error event has already come and gone. There the
 * browser's own rendering stands, which for `alt=""` is nothing at all — the
 * fallback simply shows through — and is one more reason to prefer `alt=""`
 * whenever adjacent text names the subject.
 *
 * `onError` runs first and can `preventDefault()` to keep the image mounted, for
 * a consumer who would rather retry a URL than fall back. Changing `src` is
 * always a fresh attempt: only the exact URL that failed stays unmounted.
 *
 * @see https://mantle.ngrok.com/components/data-display/avatar#avatarimage
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value            | Description                                             |
 * | -------------- | ---------------- | ------------------------------------------------------- |
 * | `data-slot`    | `"avatar-image"` | Styling and test-targeting hook, with any forwarded chain ahead of it. |
 *
 * @example
 * ```tsx
 * <Avatar.Root appearance="square" colorSeed="acc_123">
 *   <Avatar.Image src="https://example.com/acme.png" alt="" />
 *   <Avatar.Fallback name="Acme Corp" />
 * </Avatar.Root>
 * ```
 */
const Image = ({
	asChild,
	className,
	"data-slot": dataSlot,
	onError,
	src,
	...props
}: AvatarImageProps) => {
	// The failed URL, not a boolean: a new `src` is a new attempt, so this needs no
	// reset when the prop changes and cannot strand an avatar that got a good URL
	// after a bad one.
	const [failedSrc, setFailedSrc] = useState<string>();
	const Comp = asChild ? Slot : "img";

	if (src == null || src === "" || src === failedSrc) {
		return null;
	}

	return (
		<Comp
			className={cx("absolute inset-0 size-full object-cover", className)}
			data-slot={joinDataSlot(dataSlot, "avatar-image")}
			onError={(event) => {
				onError?.(event);
				if (!event.defaultPrevented) {
					setFailedSrc(src);
				}
			}}
			src={src}
			{...props}
		/>
	);
};

/**
 * The props for `Avatar.Fallback`. A `<span>`'s props, with the content stated
 * exactly one way: either `children` you render yourself, or a `name` this part
 * derives initials from. Passing both would leave the winner to precedence, so
 * the type forbids it — and `asChild`, which needs a real element to clone,
 * belongs to the `children` side only.
 */
type AvatarFallbackProps = Omit<ComponentProps<"span">, "children"> &
	WithDataSlot &
	(
		| {
				/**
				 * Render this element instead of the fallback's own `<span>`. Only
				 * available beside `children` — there has to be an element to clone.
				 */
				asChild?: boolean;
				/**
				 * What to show when there is no image: initials, an icon, anything. Use
				 * `name` instead when the content is just the subject's initials.
				 */
				children: ReactNode;
				name?: never;
		  }
		| {
				asChild?: never;
				children?: never;
				/**
				 * The subject's display name, rendered as at most two uppercase
				 * initials — `"Acme Corp"` becomes `"AC"`, a name with no usable
				 * characters becomes `"?"`. Deriving it here keeps one implementation
				 * of a surprisingly fiddly rule (punctuation, code points, and casing
				 * that has to match between server and client).
				 *
				 * Initials derived this way are `aria-hidden`: they abbreviate a name
				 * the page already carries in text beside the avatar. When the avatar
				 * is the only thing naming its subject, name it — `role="img"` plus
				 * `aria-label` on `Avatar.Root` — rather than announcing `"AC"`.
				 */
				name: string;
		  }
	);

/**
 * What the avatar shows when there is no picture — initials, an icon, a
 * monogram. It always renders, sitting *behind* `Avatar.Image`: that is what
 * makes a loading image show initials instead of an empty box, with no loading
 * state for anyone to handle. A loaded image covers it, so give a transparent
 * PNG its own backdrop if you would rather not see initials through it.
 *
 * Pass `name` to render the subject's initials, or `children` for anything else.
 * A fallback is decorative when adjacent text already names the subject, so give
 * an icon child `aria-hidden` unless the avatar is the only label.
 *
 * @see https://mantle.ngrok.com/components/data-display/avatar#avatarfallback
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value               | Description                                             |
 * | -------------- | ------------------- | ------------------------------------------------------- |
 * | `data-slot`    | `"avatar-fallback"` | Styling and test-targeting hook, with any forwarded chain ahead of it. |
 *
 * @example
 * ```tsx
 * <Avatar.Root appearance="square" colorSeed="acc_123">
 *   <Avatar.Image src="https://example.com/acme.png" alt="" />
 *   <Avatar.Fallback name="Acme Corp" />
 * </Avatar.Root>
 * ```
 */
const Fallback = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	name,
	...props
}: AvatarFallbackProps) => {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			// Derived initials are a visual shorthand for a name the page already
			// carries — the row, cell, or card next to the avatar — so announcing them
			// would read it twice ("A C Acme Corp"). They are decorative by default;
			// `children` are not, and an explicit `aria-hidden` overrides either way.
			aria-hidden={name == null ? undefined : true}
			className={cx("flex size-full items-center justify-center", className)}
			data-slot={joinDataSlot(dataSlot, "avatar-fallback")}
			{...props}
		>
			{/*
			 * Keyed on `name`, not on `children ?? initialsFromName(…)`: a conditional
			 * child that resolves to `null` is still the caller saying "render nothing
			 * here", and coalescing would answer `{isAdmin && <ShieldIcon />}` with a
			 * bare `"?"` for everyone else. `name` wins only when it was actually
			 * passed, which the type already makes exclusive with `children`.
			 */}
			{name == null ? children : initialsFromName(name)}
		</Comp>
	);
};

/**
 * A small image representing a person or an account, with a text or icon
 * fallback for when there is no picture — or before one loads.
 *
 * `appearance` carries the meaning: `"circle"` for a person, `"square"` (a
 * rounded square) for an account, workspace, team, or organization. A row that
 * shows both — an account switcher with the signed-in user's photo beside it —
 * stays readable without labels because the shapes differ.
 *
 * `colorSeed` gives a subject a stable color derived from its id, so the same
 * account is the same color on every device with nothing stored. Omit it for a
 * neutral surface.
 *
 * The picture is a plain `<img>` layered over the fallback, so the server
 * renders it and a cached image is on screen in the first frame. There is no
 * loading state to handle: the fallback is simply behind, and shows until the
 * image paints.
 *
 * For a person's name and title beside their avatar, compose it with
 * [MediaObject](https://mantle.ngrok.com/components/structure/media-object).
 * For the leading visual of a sidebar switcher row, put it inside
 * [Sidebar.SwitcherTrigger](https://mantle.ngrok.com/components/navigation/sidebar#sidebarswitchertrigger).
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
const Avatar = {
	/**
	 * A small image representing a person or an account, with a text or icon
	 * fallback for when there is no picture — or before one loads.
	 *
	 * The root sizes and shapes the avatar and paints the surface behind it. It is
	 * `size-7` and `shrink-0` by default: an avatar is a fixed-size visual, and the
	 * flex rows it usually sits in must not be able to squeeze it. Override the
	 * size with `className`, which merges last and wins. It renders a `<span>`, so
	 * it stays valid inside the `<button>` of a switcher row.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/avatar#avatarroot
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value      | Description                                             |
	 * | -------------- | ---------- | ------------------------------------------------------- |
	 * | `data-slot`    | `"avatar"` | Styling and test-targeting hook, with any forwarded chain ahead of it. |
	 *
	 * @example
	 * ```tsx
	 * <Avatar.Root appearance="square" colorSeed="acc_123">
	 *   <Avatar.Image src="https://example.com/acme.png" alt="" />
	 *   <Avatar.Fallback name="Acme Corp" />
	 * </Avatar.Root>
	 * ```
	 */
	Root,
	/**
	 * The avatar's picture, layered over `Avatar.Fallback` so the fallback shows
	 * through until the image paints. A plain `<img>` in the markup: the server
	 * renders it, and a cached image needs no hydration to appear. A failed load
	 * unmounts it and leaves the fallback showing.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/avatar#avatarimage
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value            | Description                                             |
	 * | -------------- | ---------------- | ------------------------------------------------------- |
	 * | `data-slot`    | `"avatar-image"` | Styling and test-targeting hook, with any forwarded chain ahead of it. |
	 *
	 * @example
	 * ```tsx
	 * <Avatar.Root appearance="square" colorSeed="acc_123">
	 *   <Avatar.Image src="https://example.com/acme.png" alt="" />
	 *   <Avatar.Fallback name="Acme Corp" />
	 * </Avatar.Root>
	 * ```
	 */
	Image,
	/**
	 * What the avatar shows when there is no picture — initials, an icon, a
	 * monogram. It always renders, behind `Avatar.Image`, which is what makes a
	 * loading image show initials rather than an empty box. Pass `name` to render
	 * the subject's initials, or `children` for anything else.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/avatar#avatarfallback
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value               | Description                                             |
	 * | -------------- | ------------------- | ------------------------------------------------------- |
	 * | `data-slot`    | `"avatar-fallback"` | Styling and test-targeting hook, with any forwarded chain ahead of it. |
	 *
	 * @example
	 * ```tsx
	 * <Avatar.Root appearance="square" colorSeed="acc_123">
	 *   <Avatar.Image src="https://example.com/acme.png" alt="" />
	 *   <Avatar.Fallback name="Acme Corp" />
	 * </Avatar.Root>
	 * ```
	 */
	Fallback,
} as const;

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
};
