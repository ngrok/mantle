// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CodeExample } from "./code-example";

afterEach(() => {
	cleanup();
});

describe("CodeExample.PreviewFrame", () => {
	it("points the frame at a registered example's chrome-less route", () => {
		render(
			<CodeExample.Root>
				<CodeExample.PreviewFrame example="centered-layout" title="Centered layout demo" />
			</CodeExample.Root>,
		);

		expect(screen.getByTitle("Preview of the Centered layout demo").getAttribute("src")).toBe(
			"/preview/centered-layout",
		);
	});

	it("points the frame at a routed demo's entry path as given", () => {
		render(
			<CodeExample.Root>
				<CodeExample.PreviewFrame
					path="/preview/breadcrumbs-from-routes/endpoints"
					title="Breadcrumbs demo"
				/>
			</CodeExample.Root>,
		);

		expect(screen.getByTitle("Preview of the Breadcrumbs demo").getAttribute("src")).toBe(
			"/preview/breadcrumbs-from-routes/endpoints",
		);
	});

	it("keeps the target off the tab panel's DOM", () => {
		render(
			<CodeExample.Root>
				<CodeExample.PreviewFrame example="centered-layout" title="Centered layout demo" />
			</CodeExample.Root>,
		);

		const panel = screen.getByRole("tabpanel");
		expect(panel.hasAttribute("example")).toBe(false);
		expect(panel.hasAttribute("path")).toBe(false);
	});
});
