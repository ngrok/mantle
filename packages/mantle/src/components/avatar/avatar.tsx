"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

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
 * The props for `Avatar.Root`. Radix's `Avatar.Root` props — so `className`,
 * `style`, `ref`, `asChild`, and any `data-*` reach the rendered `<span>` —
 * plus the shape and swatch this root owns.
 */
type AvatarRootProps = ComponentProps<typeof AvatarPrimitive.Root> &
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
	className,
	colorSeed,
	"data-slot": dataSlot,
	...props
}: AvatarRootProps) => (
	<AvatarPrimitive.Root
		className={cx(
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

/**
 * The props for `Avatar.Image`. Radix's `Avatar.Image` props, which are an
 * `<img>`'s — including `src`, `referrerPolicy`, `crossOrigin`, and
 * `onLoadingStatusChange` — with `alt` promoted to required.
 */
type AvatarImageProps = Omit<ComponentProps<typeof AvatarPrimitive.Image>, "alt"> &
	WithDataSlot & {
		/**
		 * The image's alternative text. **Required**, deliberately more strict than
		 * the `<img>` element and than Radix: an avatar is the one image a developer
		 * reliably forgets, and an `<img>` with no `alt` falls back to announcing its
		 * URL.
		 *
		 * Pass `alt=""` when adjacent text already names the subject — the common
		 * case, and the reason this is not just "always pass the name". Pass the name
		 * when the avatar stands alone, and name `Avatar.Root` as well
		 * (`role="img"` + `aria-label`) so the label survives the states where the
		 * image is not mounted.
		 */
		alt: string;
	};

/**
 * The avatar's picture. It renders **only once the image has loaded**, so a
 * broken or slow URL shows `Avatar.Fallback` instead of a broken-image icon —
 * and it never renders during SSR, because loading status is only knowable in a
 * browser. The first paint is therefore always the fallback, including for a
 * cached image; that is the trade for never flashing a broken image. When an
 * avatar is above the fold and its URL is known good, render a plain
 * `<img className="size-full object-cover">` inside `Avatar.Root` instead and
 * the server markup will carry it.
 *
 * `alt` is required — pass `""` when adjacent text already names the subject,
 * which is the common case. Note what `alt` alone cannot do: this `<img>` is
 * absent in exactly the states where a name is most needed (no `src`, a failed
 * load, SSR), so an avatar that must be named in every state names its **root**
 * (`role="img"` + `aria-label`), and `alt` describes the picture within it.
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
const Image = ({ className, "data-slot": dataSlot, ...props }: AvatarImageProps) => (
	<AvatarPrimitive.Image
		className={cx("size-full object-cover", className)}
		data-slot={joinDataSlot(dataSlot, "avatar-image")}
		{...props}
	/>
);

/**
 * The props for `Avatar.Fallback`. Radix's `Avatar.Fallback` props — including
 * `delayMs` and `asChild` — with the content stated exactly one way: either
 * `children` you render yourself, or a `name` this part derives initials from.
 * Passing both would leave the winner to precedence, so the type forbids it.
 */
type AvatarFallbackProps = Omit<
	ComponentProps<typeof AvatarPrimitive.Fallback>,
	"asChild" | "children"
> &
	WithDataSlot &
	(
		| {
				/**
				 * Render this element instead of the fallback's own `<span>`, forwarded
				 * to Radix's own composition. Only available beside `children` — there
				 * has to be an element to clone.
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
				 *
				 * Incompatible with `asChild`, which needs a real element to clone.
				 */
				name: string;
		  }
	);

/**
 * What the avatar shows when there is no picture — initials, an icon, a
 * monogram. Radix renders it whenever `Avatar.Image` is absent, still loading,
 * or failed, which makes it the first paint in every server-rendered page.
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
	children,
	className,
	"data-slot": dataSlot,
	name,
	...props
}: AvatarFallbackProps) => (
	<AvatarPrimitive.Fallback
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
	</AvatarPrimitive.Fallback>
);

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
const Avatar: {
	Root: typeof Root;
	Image: typeof Image;
	Fallback: typeof Fallback;
} = {
	/**
	 * A small image representing a person or an account, with a text or icon
	 * fallback for when there is no picture — or before one loads.
	 *
	 * The root sizes and shapes the avatar and paints the surface behind it. It is
	 * `size-7` and `shrink-0` by default: an avatar is a fixed-size visual, and the
	 * flex rows it usually sits in must not be able to squeeze it. Override the
	 * size with `className`, which merges last and wins.
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
	 * The avatar's picture. It renders only once the image has loaded, so a broken
	 * or slow URL shows `Avatar.Fallback` instead of a broken-image icon — and it
	 * never renders during SSR, so the fallback is always the first paint.
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
	 * monogram. Pass `name` to render the subject's initials, or `children` for
	 * anything else.
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
