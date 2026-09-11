// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainsListPage, ListPageLoadingDemo } from "./list-page-loading-demo";

/** Past the demo API's 1.5 second latency, so the pending request settles. */
const PAST_THE_MOCK_LATENCY_MS = 2_000;

const columnHeaders = ["Domain", "Region", "Certificate", "Endpoints", "Created"];

type Scenario = "success" | "no-domains" | "server-error";

function createQueryClient() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders the recipe page inside the QueryClientProvider it expects from the app root. */
function renderPage(scenario: Scenario = "success") {
	return render(
		<QueryClientProvider client={createQueryClient()}>
			<DomainsListPage scenario={scenario} />
		</QueryClientProvider>,
	);
}

/** Renders the framed demo document, toolbar controls included. */
function renderDemo() {
	return render(
		<QueryClientProvider client={createQueryClient()}>
			<ListPageLoadingDemo />
		</QueryClientProvider>,
	);
}

/** A user whose inter-action waits run on the fake clock. */
function setupUser() {
	return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

/** Lets the simulated request resolve and TanStack Query publish the result. */
async function settleRequests() {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(PAST_THE_MOCK_LATENCY_MS);
	});
}

/** Flushes deferred renders and query notifications without reaching the response. */
async function flushRenders() {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
}

function getBodyRows(): HTMLElement[] {
	return Array.from(document.querySelectorAll("tbody tr")).filter(
		(row): row is HTMLElement => row instanceof HTMLElement,
	);
}

function countSkeletons(): number {
	return document.querySelectorAll('[data-slot="skeleton"]').length;
}

beforeEach(() => {
	// Why shouldAdvanceTime: Testing Library drains user-event actions with a
	// `setTimeout(0)` that it only advances for jest's fake timers. Under a
	// frozen vitest clock that timer never fires, and every `user.*` call hangs.
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("DomainsListPage", () => {
	it("renders the shell and one skeleton row per page row before the first response", () => {
		renderPage();

		expect(screen.getByRole("heading", { level: 1, name: "Domains" })).not.toBeNull();
		expect(screen.getByRole("button", { name: "New domain" })).not.toBeNull();
		expect(screen.getByRole("combobox", { name: "Region" })).not.toBeNull();
		expect(screen.getByRole("combobox", { name: "Certificate" })).not.toBeNull();
		expect(screen.getByRole("searchbox", { name: "Search domains" })).not.toBeNull();
		for (const header of columnHeaders) {
			expect(screen.getByRole("columnheader", { name: header })).not.toBeNull();
		}

		// Eight skeleton rows for a page of eight, one skeleton per column, plus
		// the skeleton standing in for the count line.
		expect(getBodyRows()).toHaveLength(8);
		expect(countSkeletons()).toBe(8 * columnHeaders.length + 1);

		// Pending wins over empty: no empty state and no `0` count before the response.
		expect(screen.queryByText("No domains yet")).toBeNull();
		expect(screen.queryByText(/Showing 0 of 0/)).toBeNull();
		expect(screen.getByRole("status").textContent).toBe("Loading domains");
	});

	it("serves the shell with the count skeleton inside its paragraph and an empty live region", () => {
		const html = renderToString(
			<QueryClientProvider client={createQueryClient()}>
				<DomainsListPage scenario="success" />
			</QueryClientProvider>,
		);
		const document = new DOMParser().parseFromString(html, "text/html");

		// A `<div>` skeleton would end the paragraph in the parsed HTML, and the
		// table below would move on hydration.
		const countSkeleton = document.querySelector('p [data-slot="skeleton"]');
		expect(countSkeleton?.tagName).toBe("SPAN");
		expect(countSkeleton?.parentElement?.tagName).toBe("P");

		expect(document.querySelectorAll("tbody tr")).toHaveLength(8);
		// The region publishes its first message after mount, so the server sends it empty.
		expect(document.querySelector('[role="status"]')?.textContent).toBe("");
		// Radix fills an empty `Select.Value` only on the client; the text has to ship in the HTML.
		expect(document.querySelector('[aria-label="Region"]')?.textContent).toContain("Region: any");
		expect(document.querySelector('[aria-label="Certificate"]')?.textContent).toContain(
			"Certificate: any",
		);
	});

	it("swaps the skeleton rows for data rows without changing the row count", async () => {
		renderPage();
		await settleRequests();

		const rows = getBodyRows();
		expect(rows).toHaveLength(8);
		expect(countSkeletons()).toBe(0);
		const [firstRow] = rows;
		if (firstRow == null) {
			throw new Error("expected a first data row");
		}
		expect(within(firstRow).getByText("api-1.ngrok.app")).not.toBeNull();

		// The count line and the live region both carry the count.
		expect(screen.getAllByText("Showing 8 of 1,284 domains")).toHaveLength(2);
		expect(screen.getByRole("status").textContent).toBe("Showing 8 of 1,284 domains");
	});

	it("keeps the loaded rows, marked busy, while a search refetches", async () => {
		const user = setupUser();
		renderPage();
		await settleRequests();

		await user.type(screen.getByRole("searchbox", { name: "Search domains" }), "no-such-domain");
		await flushRenders();

		// keepPreviousData: the rows stay, the wrapper reports busy, and no skeleton returns.
		expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
		expect(getBodyRows()).toHaveLength(8);
		expect(countSkeletons()).toBe(0);
		expect(screen.getByRole("status").textContent).toBe("Updating domains");

		await settleRequests();

		const table = screen.getByRole("table");
		expect(within(table).getByText("No domains match the filters")).not.toBeNull();
		expect(document.querySelector('[aria-busy="true"]')).toBeNull();
		expect(screen.getByRole("status").textContent).toBe("No domains match the filters");

		// The unfiltered page is still fresh in the cache, so clearing renders it
		// with no request and no skeleton.
		await user.click(screen.getByRole("button", { name: "Clear filters" }));
		await flushRenders();

		expect(getBodyRows()).toHaveLength(8);
		expect(countSkeletons()).toBe(0);
		expect(document.querySelector('[aria-busy="true"]')).toBeNull();
	});

	// Regression: the empty check once read the eager filters while the query
	// key followed the deferred search. Clearing a no-result search rendered a
	// frame with no filter and the old empty page, which announced "No domains yet".
	it("never announces the no-data state while a cleared search catches up", async () => {
		const user = setupUser();
		renderPage();
		await settleRequests();
		await user.type(screen.getByRole("searchbox", { name: "Search domains" }), "no-such-domain");
		await settleRequests();

		const status = screen.getByRole("status");
		// Why the records, not `status.textContent`: React commits the stale frame
		// and the corrected one inside one act() flush, so the callback runs once,
		// after both. Each record still carries the text a commit wrote.
		const announcements: string[] = [];
		const observer = new MutationObserver((records) => {
			for (const record of records) {
				announcements.push(
					record.oldValue ?? "",
					...Array.from(record.addedNodes, (node) => node.textContent ?? ""),
				);
			}
		});
		observer.observe(status, {
			childList: true,
			characterData: true,
			characterDataOldValue: true,
			subtree: true,
		});

		await user.click(screen.getByRole("button", { name: "Clear filters" }));
		await flushRenders();
		observer.disconnect();

		expect(announcements).not.toContain("No domains yet");
		expect(status.textContent).toBe("Showing 8 of 1,284 domains");
	});

	it("shows the no-data state only after the response", async () => {
		renderPage("no-domains");

		expect(screen.queryByText("No domains yet")).toBeNull();
		expect(getBodyRows()).toHaveLength(8);

		await settleRequests();

		const table = screen.getByRole("table");
		expect(within(table).getByText("No domains yet")).not.toBeNull();
		expect(within(table).getByRole("button", { name: "New domain" })).not.toBeNull();
		expect(screen.getByRole("status").textContent).toBe("No domains yet");
		expect(screen.getAllByText("Showing 0 of 0 domains")).toHaveLength(1);
	});

	it("renders the request failure inside the table frame with a retry action", async () => {
		renderPage("server-error");
		await settleRequests();

		const table = screen.getByRole("table");
		expect(within(table).getByText("Domains failed to load")).not.toBeNull();
		expect(
			within(table).getByText("The domains service returned 503 Service Unavailable."),
		).not.toBeNull();
		expect(within(table).getByRole("button", { name: "Retry" })).not.toBeNull();
		expect(screen.getByRole("status").textContent).toBe("Domains failed to load");

		// The shell never left: the column headers and the filters are still in place.
		for (const header of columnHeaders) {
			expect(screen.getByRole("columnheader", { name: header })).not.toBeNull();
		}
		expect(screen.getByRole("combobox", { name: "Region" })).not.toBeNull();
	});
});

describe("ListPageLoadingDemo", () => {
	it("owns the main landmark and replays the cold load from the toolbar", async () => {
		const user = setupUser();
		renderDemo();
		await settleRequests();

		expect(screen.getByRole("main")).not.toBeNull();
		expect(screen.getByRole("combobox", { name: "Demo scenario" })).not.toBeNull();
		expect(countSkeletons()).toBe(0);

		await user.click(screen.getByRole("button", { name: "Replay load" }));
		await flushRenders();

		// resetQueries drops the cached page, so the skeleton rows return.
		expect(countSkeletons()).toBe(8 * columnHeaders.length + 1);
		expect(screen.getByRole("status").textContent).toBe("Loading domains");
	});
});
