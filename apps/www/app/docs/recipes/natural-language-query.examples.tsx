import { NaturalLanguageQueryDemo } from "~/features/natural-language-query-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Natural Language Query docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<NaturalLanguageQueryDemo />
		</PreviewCanvas>
	);
}
