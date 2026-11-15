import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren & WithStyleProps;

export function Example({ children, className, style }: Props) {
	return (
		<div
			className={cx(
				// Why safe centering and overflow-x-auto: a demo wider than a phone
				// scrolls inside the frame from its start edge, not past the page edges.
				"scrollbar flex items-center-safe justify-center-safe overflow-x-auto rounded-lg rounded-b-none border border-b-0 border-gray-300 p-4 md:p-16",
				"[&+pre]:rounded-t-none [&+[data-slot=code-block]]:rounded-t-none",
				className,
			)}
			style={style}
		>
			{children}
		</div>
	);
}
