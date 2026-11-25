import { UserOverlayDemo } from "~/features/overlay-async-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "Complete recipe" example on the Overlays + Async Data (React Query) docs page. */
export function CompleteRecipeExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<UserOverlayDemo />
		</PreviewCanvas>
	);
}
