import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Skip to Main Link docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<p className="text-sm text-muted">
				Tab into the example below — the skip link appears fixed to the top-left of the viewport
				when focused. It targets this page&apos;s own <code translate="no">main</code> landmark, the
				one around the content you are reading, because a page has one.
			</p>
			<SkipToMainLink />
		</PreviewCanvas>
	);
}
