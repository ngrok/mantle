import { Main } from "@ngrok/mantle/main";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Skip to Main Link docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<SkipToMainLink />
			<p className="text-sm text-muted">
				Tab into the example: the skip link appears at the top left of the frame. Press Enter to
				move focus to the <code translate="no">Main</code> landmark below.
			</p>
			<Main>
				<h1 className="text-strong text-lg font-medium">Page title</h1>
			</Main>
		</PreviewCanvas>
	);
}
