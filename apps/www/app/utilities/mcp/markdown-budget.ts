/** The byte budget of one text tool result. */
export const RESULT_BUDGET_BYTES = 24 * 1024;

/** One `##` or deeper section of a markdown page. */
type Section = { heading: string; depth: number; text: string };

/** Splits markdown on its headings. Never splits inside a code fence. */
function splitSections(markdown: string): { preamble: string; sections: Section[] } {
	const lines = markdown.split("\n");
	const sections: Section[] = [];
	const preamble: string[] = [];
	let current: { heading: string; depth: number; lines: string[] } | undefined;
	let fence: string | undefined;

	for (const line of lines) {
		const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
		if (fenceMatch?.[1] != null) {
			const marker = fenceMatch[1];
			if (fence == null) {
				fence = marker;
			} else if (marker.startsWith(fence[0] ?? "") && marker.length >= fence.length) {
				fence = undefined;
			}
		}
		const heading = fence == null ? /^(#{2,4})\s+(.+?)\s*#*\s*$/.exec(line) : null;
		if (heading?.[1] != null && heading[2] != null) {
			if (current != null) {
				sections.push({
					heading: current.heading,
					depth: current.depth,
					text: current.lines.join("\n"),
				});
			}
			current = { heading: heading[2], depth: heading[1].length, lines: [line] };
			continue;
		}
		(current?.lines ?? preamble).push(line);
	}
	if (current != null) {
		sections.push({
			heading: current.heading,
			depth: current.depth,
			text: current.lines.join("\n"),
		});
	}
	return { preamble: preamble.join("\n"), sections };
}

function byteLength(text: string): number {
	return new TextEncoder().encode(text).length;
}

function normalize(heading: string): string {
	return heading.toLowerCase().replace(/[`*_]/g, "").trim();
}

/**
 * Fits a markdown page into the result budget.
 *
 * - With `sections`, returns those sections (and their subsections) only.
 * - Under the budget, returns the page whole.
 * - Over the budget, returns the preamble and an outline of the headings, so
 *   the caller can ask again with `sections`.
 *
 * @example
 * fitMarkdown({ markdown: page, sections: ["API Reference"] });
 * // { kind: "sections", text: "## API Reference\n…", missing: [] }
 */
export function fitMarkdown({
	markdown,
	sections,
	budgetBytes = RESULT_BUDGET_BYTES,
}: {
	markdown: string;
	sections?: readonly string[];
	budgetBytes?: number;
}):
	| { kind: "whole"; text: string }
	| { kind: "sections"; text: string; missing: string[] }
	| { kind: "outline"; text: string } {
	const split = splitSections(markdown);

	if (sections != null && sections.length > 0) {
		const wanted = new Set(sections.map(normalize));
		const found = new Set<string>();
		const picked: string[] = [];
		let pickDepth: number | undefined;
		for (const section of split.sections) {
			if (pickDepth != null && section.depth > pickDepth) {
				picked.push(section.text);
				continue;
			}
			pickDepth = undefined;
			const key = normalize(section.heading);
			if (wanted.has(key)) {
				found.add(key);
				pickDepth = section.depth;
				picked.push(section.text);
			}
		}
		const missing = sections.filter((section) => !found.has(normalize(section)));
		return { kind: "sections", text: truncate(picked.join("\n"), budgetBytes), missing };
	}

	if (byteLength(markdown) <= budgetBytes) {
		return { kind: "whole", text: markdown };
	}

	const outline = split.sections
		.map((section) => `${"  ".repeat(section.depth - 2)}- ${section.heading}`)
		.join("\n");
	const text = [
		truncate(split.preamble.trim(), Math.floor(budgetBytes / 2)),
		"",
		"This page is over the result budget. Ask again with `sections`, using headings from this outline:",
		"",
		outline,
	].join("\n");
	return { kind: "outline", text: truncate(text, budgetBytes) };
}

/** Cuts text to a byte budget at a line end, and says that it did. */
export function truncate(text: string, budgetBytes: number): string {
	if (byteLength(text) <= budgetBytes) {
		return text;
	}
	const note = "\n\n[Truncated at the result budget. Ask for fewer sections.]";
	const lines = text.split("\n");
	const kept: string[] = [];
	let used = byteLength(note);
	for (const line of lines) {
		const size = byteLength(line) + 1;
		if (used + size > budgetBytes) {
			break;
		}
		kept.push(line);
		used += size;
	}
	return `${kept.join("\n")}${note}`;
}
