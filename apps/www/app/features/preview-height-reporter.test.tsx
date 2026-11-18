import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { reportPreviewHeightScript } from "~/features/example-heights";
import { parsePageExampleKey } from "~/features/page-examples";
import PreviewExamplePage from "~/routes/preview";

type PreviewProps = Parameters<typeof PreviewExamplePage>[0];

const { moduleGate } = vi.hoisted(() => {
	let open = () => {};
	const opened = new Promise<void>((resolve) => {
		open = resolve;
	});
	return { moduleGate: { open, opened } };
});

// Why a gate: on a cold server, the examples module loads after React flushes
// the first chunk. In a test it loads before that, so hold it until then.
vi.mock(import("~/features/page-examples"), async (importOriginal) => {
	const original = await importOriginal();
	const gatedLoads = new Map<string, ReturnType<typeof original.loadPageExampleModule>>();
	return {
		...original,
		loadPageExampleModule: (modulePath: string) => {
			const loaded =
				gatedLoads.get(modulePath) ??
				moduleGate.opened.then(() => original.loadPageExampleModule(modulePath));
			gatedLoads.set(modulePath, loaded);
			return loaded;
		},
	};
});

/** Streams the preview page for `loaderData` and returns the whole HTML. */
async function streamPreview(loaderData: PreviewProps["loaderData"]): Promise<string> {
	const props = { loaderData } as PreviewProps;
	// Why the document and the provider: the root route renders both around each
	// preview, and React flushes a document before its pending boundaries.
	const stream = await renderToReadableStream(
		<html lang="en">
			<body>
				<TooltipProvider>
					<PreviewExamplePage {...props} />
				</TooltipProvider>
			</body>
		</html>,
	);
	const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
	let html = "";
	for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
		html += chunk.value;
		moduleGate.open();
	}
	return html;
}

describe("the preview height reporter", () => {
	// Why: while the example suspends, React streams the siblings of the example
	// first. A reporter there runs before the canvas exists.
	it("streams after the canvas when the page example suspends", async () => {
		const key = "components/actions/button/size";
		const ref = parsePageExampleKey(key);
		if (ref == null) {
			throw new Error(`${key} names no page example.`);
		}
		const html = await streamPreview({ kind: "page", title: `${key} example`, ...ref });

		const canvasAt = html.indexOf("data-preview-canvas");
		const scriptAt = html.indexOf(reportPreviewHeightScript);
		expect(canvasAt).toBeGreaterThan(-1);
		expect(scriptAt).toBeGreaterThan(canvasAt);
	});

	it("streams for a shell demo, which can also grow to its canvas", async () => {
		const html = await streamPreview({
			kind: "registry",
			title: "Standalone app layout demo",
			key: "app-layout-standalone",
		});

		expect(html).toContain(reportPreviewHeightScript);
	});
});
