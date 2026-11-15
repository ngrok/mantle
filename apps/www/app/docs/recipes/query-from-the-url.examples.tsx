import { QueryFromUrlDemo } from "~/features/query-url-state-demo";
import { QueryFromUrlSubmitDemo } from "~/features/query-url-submit-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Query from the URL docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<QueryFromUrlDemo />
		</PreviewCanvas>
	);
}

/** The "Apply on Enter" example on the Query from the URL docs page. */
export function ApplyOnEnterExample() {
	return (
		<PreviewCanvas>
			<QueryFromUrlSubmitDemo />
		</PreviewCanvas>
	);
}
