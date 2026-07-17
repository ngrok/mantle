import { data } from "react-router";
import { isPreviewExampleName, previewExamples } from "~/features/preview-registry";
import type { Route } from "./+types/preview";

/**
 * Validates the `:exampleName` segment against the preview registry. Unknown
 * names 404 — this route is only ever iframed (or opened in a new tab) by the
 * docs pages' preview frames, which type the name at the call site.
 */
export const loader = ({ params }: Route.LoaderArgs) => {
	if (!isPreviewExampleName(params.exampleName)) {
		throw data(null, { status: 404 });
	}

	return { exampleName: params.exampleName };
};

/**
 * Titles the preview document after its example and marks it noindex —
 * preview documents are chrome-less fragments of their docs page. Falls back
 * to the bare site title when the loader 404s (no loader data).
 */
export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: loaderData
				? `${previewExamples[loaderData.exampleName].title} — @ngrok/mantle`
				: "@ngrok/mantle",
		},
		// belt-and-suspenders with the X-Robots-Tag entry.server sets for /preview
		// documents: preview fragments should never land in a search index
		{ name: "robots", content: "noindex, nofollow" },
	];
}

/**
 * The chrome-less document a docs `PreviewFrame` iframes. Renders nothing but
 * the registered example: the root `App` skips the site header and skip link
 * for this route (matched by route id), so the example owns the whole
 * document — its own `Main` landmark, its own `window` for document-level
 * keyboard shortcuts, and media queries that track the frame's viewport.
 */
export default function PreviewExamplePage({ loaderData }: Route.ComponentProps) {
	const { Component } = previewExamples[loaderData.exampleName];
	return <Component />;
}
