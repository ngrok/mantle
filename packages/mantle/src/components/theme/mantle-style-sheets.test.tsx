import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { MantleStyleSheets, mantleStyleSheetUrls } from "./mantle-style-sheets.js";

describe("MantleStyleSheets", () => {
	test("renders nothing, because mantle.css holds both themes", () => {
		// oxlint-disable-next-line typescript/no-deprecated -- Why: the test covers the deprecated part.
		const html = renderToString(
			// oxlint-disable-next-line typescript/no-deprecated -- Why: the test covers the deprecated part.
			<MantleStyleSheets {...mantleStyleSheetUrls({ darkCssUrl: "/dark.css" })} />,
		);

		expect(html).toBe("");
	});
});
