import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A square, centered keyboard "key" chip for rendering shortcut hints —
 * "K", "⌘", "⌃", "Enter". Renders a native `<kbd>` element so screen
 * readers announce it as keyboard input. Sized so letters and modifier
 * symbols share a consistent visual height, width, and baseline.
 *
 * **When to use**
 * - Documenting keyboard shortcuts in copy or tooltips.
 * - Inside menu items and command palettes alongside the action label.
 * - Inline with prose: "Press `Kbd K` to open search."
 *
 * **When not to use**
 * - For arbitrary monospace text — use {@link https://mantle.ngrok.com/components/data-display/code Code}.
 * - For chord-style multi-key shortcuts as a single chip — render multiple
 *   `<Kbd>` elements separated by `+` text instead.
 *
 * **Accessibility.** Symbol-only glyphs (`⌘`, `⌃`, `↵`) are not announced
 * meaningfully by screen readers. Set an accessible name via
 * `aria-label` on the `<Kbd>` or include a visually-hidden label inside,
 * and mark the visible glyph `aria-hidden`.
 *
 * **Translation.** The `<kbd>` element always carries `translate="no"`, so a
 * browser translation engine skips the subtree. A translated shortcut names a
 * key the reader's keyboard does not have. The `translate` prop is omitted from
 * the type, so no call site can turn the guard off.
 *
 * @see https://mantle.ngrok.com/components/data-display/kbd
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate
 *
 * @example
 * ```tsx
 * import { Kbd } from "@ngrok/mantle/kbd";
 *
 * // Letter key.
 * <Kbd>K</Kbd>
 *
 * // Chord — render each key separately.
 * <span>
 *   <Kbd aria-label="Command">⌘</Kbd> + <Kbd>K</Kbd>
 * </span>
 *
 * // Symbol with sr-only label.
 * <Kbd>
 *   <span className="sr-only">Enter</span>
 *   <span aria-hidden>↵</span>
 * </Kbd>
 * ```
 */
function Kbd({ children, className, ...props }: Omit<ComponentProps<"kbd">, "translate">) {
	return (
		<kbd
			data-slot="kbd"
			className={cx(
				"[font-kerning:normal] [font-variant-ligatures:common-ligatures_contextual]",
				"appearance-none tabular-nums inline-grid place-items-center size-5 bg-neutral-500/15 px-1 rounded text-mono leading-none font-mono",
				className,
			)}
			{...props}
			// Why after the spread: a wider props object can still carry `translate`
			// past the type, and a translated shortcut key names the wrong key.
			translate="no"
		>
			{children}
		</kbd>
	);
}

export {
	//,
	Kbd,
};
