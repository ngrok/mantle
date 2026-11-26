import { beforeAll, describe, expect, test } from "vitest";
import { loadGrammar } from "./grammars.js";
import {
	registerGrammar,
	tokenizeChangedLines,
	type CodeLine,
	type LineTokenizerState,
} from "./line-tokenizer.js";

function colorOf(line: CodeLine | undefined, content: string): string | undefined {
	return line?.find((token) => token.content.includes(content))?.color;
}

describe("tokenizeChangedLines", () => {
	beforeAll(async () => {
		await registerGrammar(await loadGrammar("typescript"));
		await registerGrammar(await loadGrammar("yaml"));
		await registerGrammar(await loadGrammar("json"));
	});

	test("highlights only the lines from the first changed line", async () => {
		const state: LineTokenizerState = { lines: [], endStates: [] };
		const first = await tokenizeChangedLines({
			state,
			code: "const a = 1;\nconst b",
			grammar: "typescript",
		});
		expect(first.start).toBe(0);
		expect(first.lineCount).toBe(2);

		const second = await tokenizeChangedLines({
			state,
			code: "const a = 1;\nconst b = 2;\nconst c = 3;",
			grammar: "typescript",
		});
		expect(second.start).toBe(1);
		expect(second.lines.map((line) => line.map((token) => token.content).join(""))).toEqual([
			"const b = 2;",
			"const c = 3;",
		]);
		expect(colorOf(second.lines[0], "const")).toBe("var(--shiki-token-keyword)");
	});

	test("carries the grammar state from one line to the next", async () => {
		const state: LineTokenizerState = { lines: [], endStates: [] };
		await tokenizeChangedLines({ state, code: "/* open\n", grammar: "typescript" });
		const result = await tokenizeChangedLines({
			state,
			code: "/* open\nconst still = 'a comment';",
			grammar: "typescript",
		});
		// Why: without the state at the end of line 1, line 2 would highlight as code.
		expect(colorOf(result.lines[0], "const")).toBe("var(--shiki-token-comment)");
	});

	test("reports the new line count when the code shrinks", async () => {
		const state: LineTokenizerState = { lines: [], endStates: [] };
		await tokenizeChangedLines({ state, code: "a: 1\nb: 2\nc: 3", grammar: "yaml" });
		const result = await tokenizeChangedLines({ state, code: "a: 1\nb: 2", grammar: "yaml" });
		expect(result.start + result.lines.length).toBe(2);
		expect(result.lineCount).toBe(2);
	});

	test("folds a JSON object around a bracket in a key", async () => {
		const state: LineTokenizerState = { lines: [], endStates: [] };
		const code = JSON.stringify({ "[": 1, two: 2 }, null, 2);
		const result = await tokenizeChangedLines({
			state,
			code,
			grammar: "json",
			foldLanguage: "json",
		});
		expect(result.foldableRanges?.map(({ startLine, endLine }) => [startLine, endLine])).toEqual([
			[1, 4],
		]);
	});
});
