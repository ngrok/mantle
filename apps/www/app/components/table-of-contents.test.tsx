// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { hydrationErrorsOf } from "~/test-utils/hydration";
import type { TocEntry } from "~/utilities/docs";
import { TableOfContents } from "./table-of-contents";
import { canUseDOM } from "@ngrok/mantle/browser-only";

const entries: Array<TocEntry> = [
	{ id: "first", text: "First", level: 2 },
	{ id: "second", text: "Second", level: 2 },
];

/** The server never gets the URL fragment, so only the client sees `#second`. */
function DirectLoadWithHash() {
	const url = canUseDOM() ? "/page#second" : "/page";
	return (
		<MemoryRouter initialEntries={[url]}>
			<TableOfContents entries={entries} />
		</MemoryRouter>
	);
}

describe("TableOfContents", () => {
	it("hydrates a direct load with a hash without a mismatch", () => {
		expect(hydrationErrorsOf(<DirectLoadWithHash />)).toEqual([]);
	});
});
