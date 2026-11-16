import { Suspense, use } from "react";
import { data } from "react-router";
import {
	isComponentType,
	loadPageExampleModule,
	pageExampleOf,
	parsePageExampleKey,
	type PageExampleRef,
} from "~/features/page-examples";
import {
	isPreviewExampleName,
	previewExamples,
	type PreviewExampleName,
} from "~/features/preview-registry";
import type { Route } from "./+types/preview";

/**
 * Resolves the path after `/preview/` to an example. A key with no slash names
 * a shell demo in the preview registry. A key with a slash names a docs page
 * example, `<page path>/<example name>`. Unknown keys 404: this route is only
 * framed (or opened in a new tab) by the docs pages' preview frames.
 */
export const loader = async ({ params }: Route.LoaderArgs) => {
	const key = params["*"] ?? "";
	if (isPreviewExampleName(key)) {
		return { kind: "registry", title: previewExamples[key].title, key } as const;
	}

	const ref = parsePageExampleKey(key);
	if (ref == null) {
		throw data(null, { status: 404 });
	}
	const module = await loadPageExampleModule(ref.modulePath);
	if (pageExampleOf(module, ref.exportName) == null) {
		throw data(null, { status: 404 });
	}
	return { kind: "page", title: `${key} example`, ...ref } as const;
};

/**
 * Titles the preview document after its example and marks it noindex:
 * preview documents are chrome-less fragments of their docs page. Falls back
 * to the bare site title when the loader 404s (no loader data).
 */
export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{ title: loaderData ? `${loaderData.title} - @ngrok/mantle` : "@ngrok/mantle" },
		// belt-and-suspenders with the X-Robots-Tag the server sets for /preview
		// documents: preview fragments should never land in a search index
		{ name: "robots", content: "noindex, nofollow" },
	];
}

/**
 * The chrome-less document a docs `Example` frames. Renders nothing but
 * the example: the root `App` skips the site header and skip link for this
 * route (matched by route id), so the example owns the whole document: its own
 * `window` for document-level keyboard shortcuts, and media queries that track
 * the frame's viewport.
 */
export default function PreviewExamplePage({ loaderData }: Route.ComponentProps) {
	return (
		// Why Suspense: on the client, the example's module loads after the
		// document. Hydration keeps the server markup until it resolves.
		<Suspense fallback={null}>
			{loaderData.kind === "registry" ? (
				<RegistryDemo name={loaderData.key} />
			) : (
				<PageExample modulePath={loaderData.modulePath} exportName={loaderData.exportName} />
			)}
		</Suspense>
	);
}

const loadedDemos = new Map<PreviewExampleName, Promise<{ Demo: unknown }>>();

/** Loads a registry demo once, so `use()` sees the same promise on each render. */
function loadRegistryDemo(name: PreviewExampleName): Promise<{ Demo: unknown }> {
	const loaded = loadedDemos.get(name);
	if (loaded != null) {
		return loaded;
	}
	const promise = previewExamples[name].load().then((Demo) => ({ Demo }));
	loadedDemos.set(name, promise);
	return promise;
}

function RegistryDemo({ name }: { name: PreviewExampleName }) {
	const Demo = use(loadRegistryDemo(name)).Demo;
	if (!isComponentType(Demo)) {
		throw new Error(`The preview registry entry ${name} loads no component.`);
	}
	return <Demo />;
}

function PageExample({ modulePath, exportName }: PageExampleRef) {
	const Example = use(loadPageExampleModule(modulePath))[exportName];
	if (!isComponentType(Example)) {
		throw new Error(`${modulePath} has no ${exportName} export.`);
	}
	return <Example />;
}
