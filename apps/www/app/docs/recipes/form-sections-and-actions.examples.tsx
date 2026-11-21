import { CreateEndpointForm } from "~/features/form-sections-and-actions-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Form Sections and Actions docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<CreateEndpointForm />
		</PreviewCanvas>
	);
}
