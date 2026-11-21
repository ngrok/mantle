// Why "use no memo": a server component can render this file. A stateless part gains little from
// the compiler, and its cache hook would make the build mark the chunk "use client".
"use no memo";

// Why a separate file: these parts are plain layout. `code-block.tsx` holds the parts that
// read the code block context or run effects, which need the client.

import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";
import { CodeBlockIconComponent } from "./code-block-icon.js";

/**
 * The body of the `CodeBlock`. This is where `CodeBlock.Code` and
 * the optional `CodeBlock.CopyButton` are rendered.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockbody
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Body = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block-body")}
			className={cx(
				"relative",
				// Why per-line breathing room: the scroll range ends at the edge of
				// the max-content <code>, so without a small reserve the longest
				// line touches the container edge at the end of the scroll range.
				"[&_.mantle-code-line]:pr-4",
				// Why only the first two lines reserve copy-button space: the size-7
				// button sits at `right-3 top-3`, over the first two text-mono lines
				// only. Per-line padding adds to the max-content width of the `w-max`
				// <code>, so a blanket reserve forced a horizontal scrollbar even when
				// every line fit the container. The `:has()` scope drops the reserve
				// when no copy button is rendered. This rule outranks the breathing
				// room above on specificity.
				"[&:has([data-slot=code-block-copy-button])_.mantle-code-line:nth-child(-n+2)]:pr-14",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
};

/**
 * The (optional) header slot of the `CodeBlock`. This is where
 * `CodeBlock.Icon` and `CodeBlock.Title` are rendered.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockheader
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Header = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block-header")}
			className={cx(
				"flex items-center gap-1 border-b border-gray-300 bg-base px-4 py-2 text-gray-700",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
};

/**
 * The (optional) title of the `CodeBlock`. Renders as `h3` by default;
 * use `asChild` to render a different element.
 *
 * The heading carries `translate="no"` by default, because the title usually names
 * a file (`example.ts`), and a translated filename names a file that does not
 * exist. The slot takes arbitrary children though, so pass `translate="yes"` when
 * the title is prose rather than a filename. `CodeBlock.Code` takes no such
 * override: a block of code is never translatable.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblocktitle
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Title = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"h3"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "h3";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block-title")}
			ref={ref}
			className={cx("m-0 font-sans text-xs font-medium", className)}
			translate="no"
			{...props}
		/>
	);
};

export {
	//,
	Body,
	CodeBlockIconComponent,
	Header,
	Title,
};
