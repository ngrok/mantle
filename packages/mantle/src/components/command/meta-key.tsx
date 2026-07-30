"use client";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Kbd } from "../kbd/kbd.js";
import { useIsApplePlatform } from "../../hooks/use-is-apple-platform.js";

type Props = Omit<ComponentProps<"kbd">, "children">;

type Mod = "⌘" | "⌃";

/**
 * Renders the platform-appropriate meta key kbd (⌘ or ⌃).
 *
 * - Initializes to `"⌃"` to avoid SSR mismatch.
 * - Updates on mount, once {@link useIsApplePlatform} has resolved the host.
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
	const isApple = useIsApplePlatform();
	const glyph: Mod = isApple ? "⌘" : "⌃";
	const label = isApple ? "Command" : "Control";

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
