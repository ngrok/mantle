// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { RouteAnnouncer } from "./route-announcer";

afterEach(() => {
	cleanup();
});

/**
 * Renders the announcer in a persistent layout route, the way the app root
 * hosts it, with leaf routes that cover the heading/no-heading branches.
 */
function renderWithRouter(initialPath = "/") {
	const router = createMemoryRouter(
		[
			{
				element: (
					<>
						<RouteAnnouncer />
						<button type="button">persistent control</button>
						<Outlet />
					</>
				),
				children: [
					{ path: "/", element: <h1>Home</h1> },
					{ path: "/components", element: <h1>Components</h1> },
					{ path: "/no-heading", element: <p>A page without a heading</p> },
					{ path: "/components/feedback/alert", element: <h1>Alert</h1> },
					{ path: "/components/feedback/toast", element: <h1>Alert</h1> },
				],
			},
		],
		{ initialEntries: [initialPath] },
	);
	render(<RouterProvider router={router} />);
	return router;
}

/** Runs the announcer's next-frame publish, which follows the clearing write. */
async function flushAnnouncement() {
	await act(async () => {
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});
}

describe("RouteAnnouncer", () => {
	beforeEach(() => {
		document.title = "";
	});

	test("server-renders an empty polite live region", () => {
		const html = renderToString(
			<MemoryRouter>
				<RouteAnnouncer />
			</MemoryRouter>,
		);

		expect(html).toContain('role="status"');
		expect(html).toContain('aria-live="polite"');
	});

	test("does not announce the initial page load", async () => {
		renderWithRouter();

		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("");
	});

	test("announces the new page heading after a navigation", async () => {
		const router = renderWithRouter();

		await act(() => router.navigate("/components"));
		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("Components");
	});

	test("prefers the page heading over the document title", async () => {
		const router = renderWithRouter();
		document.title = "Stale title from the previous page";

		await act(() => router.navigate("/components"));
		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("Components");
	});

	test("falls back to the document title when the page has no heading", async () => {
		const router = renderWithRouter();
		document.title = "Kbd — @ngrok/mantle";

		await act(() => router.navigate("/no-heading"));
		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("Kbd — @ngrok/mantle");
	});

	test("falls back to the pathname when there is no heading and no title", async () => {
		const router = renderWithRouter();

		await act(() => router.navigate("/no-heading"));
		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("/no-heading");
	});

	test("stays silent when only the search params change", async () => {
		const router = renderWithRouter();

		await act(() => router.navigate("/?tab=examples"));
		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("");
	});

	test("stays silent when only the hash changes", async () => {
		const router = renderWithRouter();

		await act(() => router.navigate("/#api-reference"));
		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("");
	});

	test("announces again when the user returns to a previous page", async () => {
		const router = renderWithRouter();

		await act(() => router.navigate("/components"));
		await flushAnnouncement();
		await act(() => router.navigate("/"));
		await flushAnnouncement();

		expect(screen.getByRole("status").textContent).toBe("Home");
	});

	test("mutates the region even when two pages share the same heading", async () => {
		const router = renderWithRouter();

		await act(() => router.navigate("/components/feedback/alert"));
		await flushAnnouncement();
		const region = screen.getByRole("status");
		expect(region.textContent).toBe("Alert");

		// A live region only announces a DOM change. The clear-then-publish
		// sequence must mutate the region even when the text is identical.
		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((records) => {
			mutations.push(...records);
		});
		observer.observe(region, { characterData: true, childList: true, subtree: true });

		await act(() => router.navigate("/components/feedback/toast"));
		await flushAnnouncement();
		mutations.push(...observer.takeRecords());
		observer.disconnect();

		expect(region.textContent).toBe("Alert");
		expect(mutations.length).toBeGreaterThan(0);
	});

	test("does not move focus when it announces", async () => {
		const router = renderWithRouter();
		const control = screen.getByRole("button", { name: "persistent control" });
		control.focus();

		await act(() => router.navigate("/components"));
		await flushAnnouncement();

		expect(document.activeElement).toBe(control);
	});
});
