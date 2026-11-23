import { CreateEndpointForm } from "~/features/cancel-and-submit-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Cancel and Submit Actions docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<CreateEndpointForm />
		</PreviewCanvas>
	);
}
