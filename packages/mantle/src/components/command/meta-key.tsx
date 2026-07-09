import { type ComponentProps, useEffect, useState } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Kbd } from "../kbd/kbd.js";

type Props = Omit<ComponentProps<"kbd">, "children">;

type Mod = "⌘" | "⌃";

/**
 * Renders the platform-appropriate meta key kbd (⌘ or ⌃).
 *
 * - Initializes to `"⌃"` to avoid SSR mismatch.
 * - Updates on mount using `detectMetaKey()`.
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
 * Type guard for `navigator.userAgentData` existence.
 * Useful for newer UA hints where `platform` may be available.
 *
 * @param navigator The global `navigator`
 * @returns `true` if UA Data hints exist; narrows `navigator` accordingly.
 */
function hasUAData(
	navigator: Navigator,
): navigator is Navigator & { userAgentData: { platform?: string } } {
	return "userAgentData" in navigator;
}

/**
 * Detects the appropriate meta key label for the current platform.
 *
 * SSR-safe: returns `"⌃"` when `navigator` is not available.
 *
 * @returns `"⌘"` for Apple platforms; otherwise `"⌃"`.
 */
function detectMetaKey(): Mod {
	if (typeof navigator === "undefined") {
		return "⌃"; // SSR default
	}

	let platform = "";

	if (hasUAData(navigator)) {
		platform = navigator.userAgentData.platform ?? "";
	}

	if (!platform) {
		platform = navigator.platform || navigator.userAgent || "";
	}

	const isApple = /mac|iphone|ipad|ipod/i.test(platform);

	if (isApple) {
		return "⌘";
	}

	return "⌃";
}
