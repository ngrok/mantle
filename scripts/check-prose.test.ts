import { describe, expect, it } from "vitest";

import { emDashLines } from "./check-prose.ts";

describe("emDashLines", () => {
	it("reports markdown prose, and skips code blocks and inline code", () => {
		const text = 'Keep it — always.\nThe `—` character.\n```ts\nconst a = "—";\n```\n| a | — |';

		expect(emDashLines({ file: "a.mdx", text })).toEqual([1, 6]);
	});

	it("reports stylesheet comments, and skips declarations", () => {
		const text =
			'.a {\n\t/* Why — the cascade. */\n\tcontent: "—";\n}\n/*\n * line one\n * line — two\n */';

		expect(emDashLines({ file: "a.css", text })).toEqual([2, 7]);
	});
});
