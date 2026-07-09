import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A square, centered keyboard “key” chip for rendering shortcut hints
 * (e.g., "K", "⌘", "⌃"). Designed so every key—letters and modifiers—shares
 * the same visual height/width and baseline. Renders a native `<kbd>` element.
 *
 * Accessibility:
 * - When showing a symbol (⌘/⌃), provide an accessible name via `aria-label`
 *   or include an sr-only label inside. The visible glyph may be marked
 *   `aria-hidden`.
 *
 * @example Basic letter key
 * <Kbd>K</Kbd>
 */
function Kbd({ children, className, ...props }: ComponentProps<"kbd">) {
	return (
		<kbd
			data-slot="kbd"
			className={cx(
				"[font-kerning:normal] [font-variant-ligatures:common-ligatures_contextual]",
				"appearance-none tabular-nums inline-grid place-items-center size-5 bg-neutral-500/15 px-1 rounded text-mono leading-none font-mono",
				className,
			)}
			{...props}
		>
			{children}
		</kbd>
	);
}

export {
	//,
	Kbd,
};
