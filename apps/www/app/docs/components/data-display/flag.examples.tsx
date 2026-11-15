import { Flag } from "@ngrok/mantle/flag";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Flag docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="gap-4">
			<Flag code="US" />
			<Flag code="JP" />
			<Flag code="BR" />
		</PreviewCanvas>
	);
}

/** The "Loading" example on the Flag docs page. */
export function LoadingExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Flag code="US" />
			<Flag code="JP" loading="lazy" />
			<Flag code="ES" loading="eager" />
		</PreviewCanvas>
	);
}
