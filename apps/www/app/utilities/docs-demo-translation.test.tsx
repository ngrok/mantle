// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DomainsListPage } from "~/features/list-page-loading-demo";
import { translateTextNodes } from "~/test-utils/translate-text-nodes";

/**
 * A live docs demo runs in a reader's browser, and a reader who translates the
 * page is exactly the audience these demos teach. Each test below drives the
 * interaction that used to throw `NotFoundError` against a translated DOM and
 * blank the page.
 */

const selectableListDemos = import.meta.glob<{
	ControlledQueryExample: () => ReactElement;
}>("../docs/components/data-display/selectable-list.mdx", { eager: true });

afterEach(() => {
	cleanup();
});

describe("SelectableList controlled-query demo on a translated page", () => {
	it("clears the filter without removing a reparented text node", async () => {
		const user = userEvent.setup();
		const demo = Object.values(selectableListDemos)[0];
		if (demo == null) {
			throw new Error("expected the selectable-list docs page to export its demos");
		}
		const { container } = render(<demo.ControlledQueryExample />);
		translateTextNodes(container);

		// Why this check: it proves the engine wrapped the echo, so the `<font>`
		// absence after the clear can fail.
		expect(screen.getByText("[“ng-3f”-es]").tagName).toBe("FONT");

		await user.clear(screen.getByRole("textbox", { name: "Filter access keys" }));

		// The echo is the lone string child of its span, so React writes it
		// through `textContent` and wipes the `<font>` instead of removing a node
		// it no longer owns.
		const echo = screen.getByText("“”");
		expect(echo.tagName).toBe("SPAN");
		expect(echo.querySelector("font")).toBeNull();
	});
});

describe("Region filter demo on a translated page", () => {
	it("picks a region without removing a reparented text node", async () => {
		const user = userEvent.setup();
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		render(
			<QueryClientProvider client={client}>
				<DomainsListPage scenario="success" />
			</QueryClientProvider>,
		);

		const region = screen.getByRole("combobox", { name: "Region" });
		translateTextNodes(region);
		await user.click(region);
		await user.click(await screen.findByRole("option", { name: "Region: eu" }));

		// The selected label is wrapped, so the `any` string giving way to a
		// region element is a swap between two elements, not a removal.
		expect(region.textContent).toContain("eu");
	});
});
