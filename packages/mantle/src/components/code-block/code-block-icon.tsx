"use client";

import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { TerminalIcon } from "@phosphor-icons/react/Terminal";
import type { ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Icon as MantleIcon } from "../icon/icon.js";
import type { SvgAttributes } from "../icon/types.js";
import { TrafficPolicyFileIcon } from "../icons/traffic-policy-file.js";
import type { Mode } from "./resolve-pre-rendered-props.js";

// Why a client file: the preset icons are Phosphor icons, which read Phosphor's
// `IconContext`. `code-block.tsx` holds the stateful parts, so this stays its own chunk.

type CodeBlockIconProps = Omit<SvgAttributes, "children"> &
	(
		| {
				/**
				 * A custom icon SVG to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				svg: ReactNode;
				/**
				 * A preset icon to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				preset?: undefined;
		  }
		| {
				/**
				 * A custom icon SVG to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				svg?: undefined;
				/**
				 * A preset icon to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				preset: Mode;
		  }
	) &
	WithDataSlot;

/**
 * A small icon for the `CodeBlock` header. Pass either a custom `svg`
 * or a `preset` value (not both).
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockicon
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
function CodeBlockIconComponent({
	"data-slot": dataSlot,
	className,
	preset,
	svg: _svgProp,
	...props
}: CodeBlockIconProps) {
	let svg = _svgProp;
	if (preset != null) {
		switch (preset) {
			case "file":
				svg = <FileTextIcon weight="fill" />;
				break;
			case "cli":
				svg = <TerminalIcon weight="fill" />;
				break;
			case "traffic-policy":
				svg = <TrafficPolicyFileIcon />;
				break;
		}
	}
	return (
		<MantleIcon
			data-slot={joinDataSlot(dataSlot, "code-block-icon")}
			className={cx("size-5", className)}
			svg={svg}
			{...props}
		/>
	);
}

export {
	//,
	CodeBlockIconComponent,
};
