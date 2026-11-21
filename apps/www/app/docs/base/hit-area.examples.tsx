import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "Hit Area" example on the Hit Area docs page. */
export function BasicExample() {
	return (
		<PreviewCanvas>
			<button
				type="button"
				aria-label="Dismiss"
				className="hit-area text-strong hover:bg-neutral-500/20 flex size-5 cursor-pointer items-center justify-center rounded after:rounded-md after:outline after:outline-dashed after:outline-neutral-500"
			>
				<XIcon />
			</button>
		</PreviewCanvas>
	);
}
