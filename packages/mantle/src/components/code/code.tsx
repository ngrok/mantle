import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

/**
 * Marks a short fragment of inline computer code — a function name, a
 * variable, a CLI flag, a key. Renders a native `<code>` element with
 * mantle's monospace styling.
 *
 * **When to use**
 * - Inline within prose to identify code, file paths, env vars, or keys.
 * - Wrap technical terms that should visually stand apart from running text.
 *
 * **When not to use**
 * - For multi-line or syntax-highlighted blocks. Use {@link https://mantle.ngrok.com/components/data-display/code-block CodeBlock} instead.
 * - For keyboard shortcuts. Use {@link https://mantle.ngrok.com/components/data-display/kbd Kbd}.
 * - For arbitrary monospace text that isn't code (use a plain monospace utility class).
 *
 * **Polymorphism.** Pass `asChild` to render `Code` styling on a different
 * element (e.g. a link wrapping a code-styled label).
 *
 * @see https://mantle.ngrok.com/components/data-display/code
 *
 * @example
 * ```tsx
 * import { Code } from "@ngrok/mantle/code";
 *
 * <p>
 *   Use the <Code>console.log()</Code> function to debug your code.
 * </p>
 *
 * // As a link, preserving Code styling.
 * <Code asChild>
 *   <a href="/api">/api/components.json</a>
 * </Code>
 * ```
 */
const Code = ({ asChild, className, ref, ...props }: ComponentProps<"code"> & WithAsChild) => {
	const Comp = asChild ? Slot : "code";
	return (
		<Comp
			ref={ref}
			data-slot="code"
			className={cx(
				"border-gray-500/15 rounded-md border bg-gray-500/5 px-1 font-mono text-[0.8em]",
				className,
			)}
			{...props}
		/>
	);
};

export {
	//,
	Code,
};
