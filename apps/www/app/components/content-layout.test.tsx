import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";
import { ContentLayout } from "./content-layout";

/**
 * Pins the server-render contract of `ContentLayout`: children pass through
 * to the server HTML synchronously. Runs in the default node environment (no
 * DOM), so a gate on `document` or `window` fails here the way it fails in
 * real SSR. This also fails when `ContentLayout` reintroduces an async gate
 * around its children, for example a `use(promise)` resolver or a
 * mounted-state check that returns null on the server. It cannot see a bare
 * `<Suspense>` wrapper (non-suspending children render synchronously in
 * `renderToString`) or route-level async resolution, which lived in the
 * deleted `$.tsx`, outside this component.
 */
test("server render contains the doc content synchronously", () => {
	const html = renderToString(
		<MemoryRouter initialEntries={["/philosophy"]}>
			<QueryClientProvider client={new QueryClient()}>
				<ContentLayout>
					<p>The full doc content is part of the initial document.</p>
				</ContentLayout>
			</QueryClientProvider>
		</MemoryRouter>,
	);

	expect(html).toContain("The full doc content is part of the initial document.");
});
