import { UseInViewDemo } from "~/features/use-in-view-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "useInView example" example on the Hooks docs page. */
export function UseinviewExampleExample() {
	return (
		<PreviewCanvas className="p-0 overflow-hidden">
			<UseInViewDemo />
		</PreviewCanvas>
	);
}
