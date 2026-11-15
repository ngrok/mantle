import { RouteHeaderActionsDemo } from "~/features/route-header-actions-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "The file" example on the Header Actions from Routes docs page. */
export function TheFileExample() {
	return (
		<PreviewCanvas className="min-h-160 md:p-8">
			<RouteHeaderActionsDemo />
		</PreviewCanvas>
	);
}
