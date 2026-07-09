import { forwardRef } from "react";
import type { ComponentProps, ComponentRef } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

/**
 * Marks text to signify a short fragment of inline computer code.
 *
 * @see https://mantle.ngrok.com/components/code
 *
 * @example
 * ```tsx
 * <p>
 *   Use the <Code>console.log()</Code> function to debug your code.
 * </p>
 * ```
 */
const Code = forwardRef<ComponentRef<"code">, ComponentProps<"code"> & WithAsChild>(
	({ asChild, className, ...props }, ref) => {
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
	},
);
Code.displayName = "Code";

export {
	//,
	Code,
};
