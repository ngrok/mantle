import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

// RuleTester declares its own suites, so it needs Vitest's `describe` and `it` injected.
RuleTester.describe = describe;
RuleTester.it = it;

/**
 * A `RuleTester` that parses every case as TSX, which is the only shape the rules in this package
 * read. Each case states its code as source text, so the assertions run against the real oxlint
 * parser rather than a hand-built tree.
 */
export const ruleTester = new RuleTester({
	languageOptions: { parserOptions: { lang: "tsx" } },
});
