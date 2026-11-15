import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren & WithStyleProps;

/**
 * The root of a docs example inside its preview document. It centers the demo
 * and pads it, and a demo wider than the frame scrolls from its start edge.
 * `CodeExample.PreviewFrame` grows its frame to this element's height, so put a `min-h-*`
 * class on it when the demo opens an overlay that needs room.
 *
 * @example
 * ```tsx
 * export function SizeExample() {
 * 	return (
 * 		<PreviewCanvas className="flex-col gap-4">
 * 			<Button size="sm">Small</Button>
 * 			<Button size="lg">Large</Button>
 * 		</PreviewCanvas>
 * 	);
 * }
 * ```
 */
export function PreviewCanvas({ children, className, style }: Props) {
	return (
		<div
			data-preview-canvas=""
			className={cx(
				"scrollbar flex items-center-safe justify-center-safe overflow-x-auto p-4 md:p-16",
				className,
			)}
			style={style}
		>
			{children}
		</div>
	);
}
