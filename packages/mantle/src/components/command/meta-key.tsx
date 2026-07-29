import { type ComponentProps, useEffect, useState } from "react";
import { cx } from "../../utils/cx/cx.js";
import { isApplePlatform } from "../../utils/platform.js";
import { Kbd } from "../kbd/kbd.js";

type Props = Omit<ComponentProps<"kbd">, "children">;

type Mod = "⌘" | "⌃";

/**
 * Renders the platform-appropriate meta key kbd (⌘ or ⌃).
 *
 * - Initializes to `"⌃"` to avoid SSR mismatch.
 * - Updates on mount using `detectMetaKey()`.
 *
 * @see https://mantle.ngrok.com/components/navigation/command#metakey
 *
 * @example
 * ```tsx
 * <Command.Shortcut>
 *   <MetaKey /> S
 * </Command.Shortcut>
 * ```
 */
function MetaKey({ className, ...props }: Props) {
	const [glyph, setGlyph] = useState<Mod>("⌃");

	useEffect(() => {
		setGlyph(detectMetaKey());
	}, []);

	const label = glyph === "⌘" ? "Command" : "Control";

	return (
		<Kbd
			{...props}
			suppressHydrationWarning
			data-slot="meta-key"
			className={cx(glyph === "⌃" && "font-medium", className)}
		>
			<span className="sr-only">{label}</span>
			{glyph}
		</Kbd>
	);
}

export {
	//,
	MetaKey,
};

/**
 * Detects the appropriate meta key label for the current platform.
 *
 * SSR-safe: returns `"⌃"` when `navigator` is not available.
 *
 * @returns `"⌘"` for Apple platforms; otherwise `"⌃"`.
 */
function detectMetaKey(): Mod {
	return isApplePlatform() ? "⌘" : "⌃";
}
