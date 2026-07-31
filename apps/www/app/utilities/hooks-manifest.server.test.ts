import { describe, expect, it } from "vitest";

import { firstSentenceFromJsDoc } from "~/utilities/hooks-manifest.server";

describe("firstSentenceFromJsDoc", () => {
	it("stops at the paragraph break when the summary is followed by a markdown block", () => {
		// Regression: `Badge` published a 393-character "summary" carrying two
		// bulleted lists. Its first sentence ends in front of `**When to use**`,
		// which is not an uppercase letter, so the sentence search ran to the end
		// of the description.
		const jsdoc = `/**
 * A non-interactive label used to highlight short, scannable information.
 *
 * **When to use**
 *
 * - Status indicators: \`Succeeded\`, \`Failed\`.
 * - Counts (e.g. \`12 new\`) when paired with brief context.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe(
			"A non-interactive label used to highlight short, scannable information.",
		);
	});

	it("stops at the paragraph break when a table follows", () => {
		const jsdoc = `/**
 * The scrollable region that owns the alert stack.
 *
 * | Attribute | Purpose |
 * | --- | --- |
 * | \`data-slot\` | Styling hook. |
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("The scrollable region that owns the alert stack.");
	});

	it("takes one sentence when the first paragraph holds several", () => {
		const jsdoc = `/**
 * The band below the body. Unless it is the first child, it draws a top border.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("The band below the body.");
	});

	it("keeps an abbreviation that a period-plus-space rule would split", () => {
		const jsdoc = `/**
 * Renders a count, e.g. \`12 new\`, beside its label.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("Renders a count, e.g. `12 new`, beside its label.");
	});

	it("ignores text after the first block tag", () => {
		const jsdoc = `/**
 * The palette's query field.
 *
 * @see https://mantle.ngrok.com/components/navigation/command
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("The palette's query field.");
	});

	it("renders an inline link tag as its label", () => {
		const jsdoc = `/**
 * See {@link Trigger} for the click target.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("See Trigger for the click target.");
	});

	it("returns undefined when the block carries only tags", () => {
		expect(firstSentenceFromJsDoc("/**\n * @internal\n */")).toBeUndefined();
	});
});
