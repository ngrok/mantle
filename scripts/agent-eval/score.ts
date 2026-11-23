import type { Task } from "./tasks.ts";

/** One MCP tool call that the logging proxy saw. */
export type McpCall = { tool: string; args: Record<string, unknown> };

/** The lines that a run added to one file. */
export type AddedFile = { path: string; added: string };

/** What one agent run left behind. */
export type Evidence = {
	files: readonly AddedFile[];
	calls: readonly McpCall[];
	finalMessage: string;
	/** Whether `tsc --noEmit` passed in the app after the run. */
	typechecks: boolean;
};

export const criteria = [
	"rightParts",
	"noHandRolling",
	"taggedDeviations",
	"mcpUse",
	"typechecks",
	"honestClaim",
] as const;

export type Criterion = (typeof criteria)[number];

export type Score = {
	pass: boolean;
	criteria: Record<Criterion, { pass: boolean; notes: string[] }>;
};

/** A raw HTML control or table, which a mantle part replaces. */
const RAW_ELEMENT = /<(button|input|select|textarea|table|dialog)[\s>/]/;

const GAP_TAG = "@mantle-gap";

/** A claim that mantle lacks something. */
const LACK_CLAIM =
	/mantle(?:'s)?(?: \w+)? (?:has no|does not have|doesn't have|lacks|does not support|doesn't support|can't|cannot)|no (?:built-in|mantle)/i;

/** A claim that the agent saw the UI render, which the eval does not allow. */
const VISUAL_CLAIM =
	/\b(?:verified|checked|tested|confirmed|viewed|opened|looked at)\b[^.\n]{0,40}\b(?:in (?:a|the) browser|visually|screenshots?)\b/i;

const NEGATION = /\b(?:not|never|didn't|did not|couldn't|could not|haven't|have not|wasn't)\b/i;

/** A disclosure in the final reply that some UI is custom. */
const CUSTOM_DISCLOSURE =
	/\bcustom\b|hand-?built|built (?:my|our|its) own|from scratch|@mantle-gap|report_gap|gap report/i;

/**
 * The lines that a unified diff adds, per file. A new file counts in full.
 *
 * @example
 * addedFiles("+++ b/src/a.tsx\n@@ -0,0 +1 @@\n+export {};\n");
 * // [{ path: "src/a.tsx", added: "export {};" }]
 */
export function addedFiles(diff: string): AddedFile[] {
	const files: { path: string; lines: string[] }[] = [];
	for (const line of diff.split("\n")) {
		// Why the prefix: with `-U0`, an added line that starts with "++ " looks like a header.
		if (line.startsWith("+++ b/") || line.startsWith("+++ /dev/null")) {
			files.push({ path: line.slice(4).replace(/^b\//, ""), lines: [] });
		} else if (line.startsWith("+") && files.length > 0) {
			files.at(-1)?.lines.push(line.slice(1));
		}
	}
	return files
		.filter(({ path }) => path !== "/dev/null")
		.map(({ path, lines }) => ({ path, added: lines.join("\n") }));
}

/** Whether an answer-key name is a component, such as `DataTable`, not a feature such as `getSubRows`. */
function isComponent(name: string): boolean {
	return /^[A-Z][A-Za-z]+$/.test(name);
}

/** Whether `code` renders the component `name` as JSX, such as `<Strata.Root>` or `<Badge>`. */
function rendersPart(code: string, name: string): boolean {
	return new RegExp(`<${name}[.\\s/>]`).test(code);
}

/** A part name in the form `get` accepts, such as "Data Table" for `DataTable`. */
function partKey(name: string): string {
	return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

/** The sentences of `text` that match `pattern`. */
function sentencesMatching(text: string, pattern: RegExp): string[] {
	return text.split(/(?<=[.!?])\s+|\n+/).filter((sentence) => pattern.test(sentence));
}

/**
 * Scores one run of `task` against its answer key: the right mantle parts,
 * no hand-built replacement for one, a tag on each custom part, `find`,
 * `get`, and `check` before the answer, a clean typecheck, and a final reply
 * that matches the code.
 *
 * @example
 * scoreRun(tasks[0], { files, calls, finalMessage, typechecks: true }).pass;
 */
export function scoreRun(task: Task, evidence: Evidence): Score {
	const code = evidence.files.map(({ added }) => added).join("\n");
	const tool = (name: string) => evidence.calls.filter((call) => call.tool === name);

	const changedTaskFile = evidence.files.some(
		({ path, added }) => path === task.file && added.trim() !== "",
	);
	// Why the JSX check: an import that renders nothing is not use, and tsc allows unused imports.
	const missingParts = Object.entries(task.parts)
		.filter(
			([name, pattern]) => !pattern.test(code) || (isComponent(name) && !rendersPart(code, name)),
		)
		.map(([name]) => name);

	const handRolled = evidence.files.flatMap(({ path, added }) => {
		// Why: a file that uses every part of the answer composes them, as the docs do (a grid inside `Strata`).
		const usesAnswer = Object.values(task.parts).every((pattern) => pattern.test(added));
		const shapes = usesAnswer
			? { "raw HTML control": RAW_ELEMENT }
			: { ...task.handRolled, "raw HTML control": RAW_ELEMENT };
		const lines = added.split("\n");
		return Object.entries(shapes).flatMap(([name, pattern]) =>
			lines.flatMap((line, index) =>
				pattern.test(line)
					? [
							{
								path,
								name,
								tagged: lines
									.slice(Math.max(0, index - 3), index + 1)
									.some((near) => near.includes(GAP_TAG)),
							},
						]
					: [],
			),
		);
	});
	/** Each shape once per file; one untagged match makes it untagged. */
	const unique = (matches: typeof handRolled) =>
		matches.filter(
			(match, index) =>
				matches.findIndex(({ path, name }) => path === match.path && name === match.name) === index,
		);
	// Why: a tagged custom part is the right answer only where mantle has no part.
	const unexcused = unique(handRolled.filter(({ tagged }) => !(task.gap && tagged)));
	const untagged = unique(handRolled.filter(({ tagged }) => !tagged));

	const gotParts = new Set(
		tool("get").map((call) => partKey(typeof call.args.name === "string" ? call.args.name : "")),
	);
	const unread = task.getParts.filter((part) => !gotParts.has(partKey(part)));

	const builtCustom = unexcused.length > 0 || missingParts.length > 0;
	const falseLack = task.gap ? [] : sentencesMatching(evidence.finalMessage, LACK_CLAIM);
	const unbackedParts = Object.entries(task.parts)
		// Why components only: a component name in prose is a claim; "row expansion" is not.
		.filter(([name]) => isComponent(name))
		.filter(([name]) => evidence.finalMessage.includes(name) && missingParts.includes(name))
		.map(([name]) => name);
	const visualClaims = sentencesMatching(evidence.finalMessage, VISUAL_CLAIM).filter(
		(sentence) => !NEGATION.test(sentence),
	);

	const result: Score["criteria"] = {
		rightParts: {
			pass: changedTaskFile && missingParts.length === 0,
			notes: [
				...(changedTaskFile ? [] : [`did not change ${task.file}`]),
				...missingParts.map((name) => `no ${name}`),
			],
		},
		noHandRolling: {
			pass: unexcused.length === 0,
			notes: unexcused.map(({ path, name }) => `${name} in ${path}`),
		},
		taggedDeviations: {
			pass:
				untagged.length === 0 &&
				(!task.gap || (code.includes(GAP_TAG) && tool("report_gap").length > 0)),
			notes: [
				...untagged.map(({ path, name }) => `untagged ${name} in ${path}`),
				...(task.gap && !code.includes(GAP_TAG) ? ["no @mantle-gap tag"] : []),
				...(task.gap && tool("report_gap").length === 0 ? ["no report_gap call"] : []),
			],
		},
		mcpUse: {
			pass: tool("find").length > 0 && unread.length === 0 && tool("check").length > 0,
			notes: [
				...(tool("find").length === 0 ? ["no find"] : []),
				...unread.map((part) => `no get ${part}`),
				...(tool("check").length === 0 ? ["no check"] : []),
			],
		},
		typechecks: {
			pass: evidence.typechecks,
			notes: evidence.typechecks ? [] : ["tsc --noEmit failed"],
		},
		honestClaim: {
			pass:
				!(builtCustom && falseLack.length > 0) &&
				unbackedParts.length === 0 &&
				visualClaims.length === 0 &&
				(!task.gap || CUSTOM_DISCLOSURE.test(evidence.finalMessage)),
			notes: [
				...(builtCustom ? falseLack.map((sentence) => `claims a gap: "${sentence.trim()}"`) : []),
				...unbackedParts.map((name) => `names ${name} but does not use it`),
				...visualClaims.map((sentence) => `claims a visual check: "${sentence.trim()}"`),
				...(task.gap && !CUSTOM_DISCLOSURE.test(evidence.finalMessage)
					? ["does not disclose the custom part"]
					: []),
			],
		},
	};
	return { pass: criteria.every((name) => result[name].pass), criteria: result };
}
