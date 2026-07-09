import type { SupportedLanguage } from "./supported-languages.js";
import { isSupportedLanguage } from "./supported-languages.js";
import { parseBooleanish } from "../../types/booleanish.js";
import { type Indentation, isIndentation } from "./indentation.js";
import {
	parseCodeBlockHighlightLines,
	parseCodeBlockLineNumberStart,
	parseCodeBlockShowLineNumbers,
} from "./parse-line-options.js";

const modes = [
	//,
	"cli",
	"file",
	"traffic-policy",
] as const;
/** The visual mode preset for a code block (determines header icon). */
type Mode = (typeof modes)[number];

/** User-facing input shape for code block metadata (metastring key-value pairs). */
type MetaInput = {
	collapsible?: boolean | undefined;
	disableCopy?: boolean | undefined;
	indentation?: Indentation | undefined;
	mode?: Mode | undefined;
	title?: string | undefined;
};

/** Resolved code block metadata with defaults applied. */
type Meta = {
	collapsible: boolean;
	disableCopy: boolean;
	indentation?: Indentation | undefined;
	mode?: Mode | undefined;
	title?: string | undefined;
};

const defaultMeta = {
	collapsible: false,
	disableCopy: false,
	indentation: undefined,
	mode: undefined,
	title: undefined,
} as const satisfies Meta;

/** The type of the default metadata constant. */
type DefaultMeta = typeof defaultMeta;

/** Parses a code fence metastring (e.g. `title="example" collapsible`) into a structured `Meta` object. */
function parseMetastring(input: string | undefined): Meta {
	const metastring = input?.trim() ?? "";
	if (!metastring) {
		return defaultMeta;
	}

	const metaJson: Record<string, unknown> = {};
	const tokens = tokenizeMetastring(metastring);
	for (const token of tokens) {
		const separatorIndex = token.indexOf("=");
		const key = separatorIndex === -1 ? token : token.slice(0, separatorIndex);
		const value = separatorIndex === -1 ? undefined : token.slice(separatorIndex + 1);

		if (!key) {
			continue;
		}

		const normalized = normalizeValue(value);
		metaJson[key] = normalized ?? true;
	}

	return parseMetaJson(metaJson);
}

/** Strips surrounding double-quotes and trims whitespace from a metastring value. */
function normalizeValue(value: string | undefined) {
	if (value == null) {
		return undefined;
	}
	const trimmed = value.trim();
	const lastIndex = trimmed.length - 1;
	if (lastIndex >= 1 && trimmed.charCodeAt(0) === 34 && trimmed.charCodeAt(lastIndex) === 34) {
		return trimmed.slice(1, lastIndex);
	}
	return trimmed;
}

/** Splits a metastring into whitespace-delimited tokens, respecting double-quoted segments. */
function tokenizeMetastring(value: string | undefined): string[] {
	const input = value?.trim() ?? "";
	const result: string[] = [];

	let current = "";
	let inQuotes = false;

	for (let i = 0; i < input.length; i++) {
		const char = input[i] ?? "";
		if (!inQuotes && isMetastringWhitespace(char)) {
			if (current) {
				result.push(current);
				current = "";
			}
		} else if (char === '"') {
			inQuotes = !inQuotes;
			current += char;
		} else {
			current += char;
		}
	}

	if (current) {
		result.push(current);
	}

	return result;
}

/** Returns `true` for the ASCII whitespace characters a metastring may use to separate tokens. */
function isMetastringWhitespace(char: string): boolean {
	return char === " " || char === "\t" || char === "\n" || char === "\r";
}

/** Type predicate: checks if a value is a valid code block `Mode`. */
function isMode(input: unknown): input is Mode {
	return input === "cli" || input === "file" || input === "traffic-policy";
}

/** Converts a raw key-value record (from tokenized metastring) into a validated `Meta` object. */
function parseMetaJson(input: Record<string, unknown>): Meta {
	const {
		collapsible = defaultMeta.collapsible,
		disableCopy = defaultMeta.disableCopy,
		indentation = defaultMeta.indentation,
		mode = defaultMeta.mode,
		title = defaultMeta.title,
	} = input;

	return {
		collapsible:
			typeof collapsible === "string" || typeof collapsible === "boolean"
				? parseBooleanish(collapsible)
				: defaultMeta.collapsible,
		disableCopy:
			typeof disableCopy === "string" || typeof disableCopy === "boolean"
				? parseBooleanish(disableCopy)
				: defaultMeta.disableCopy,
		indentation: isIndentation(indentation) ? indentation : defaultMeta.indentation,
		mode: isMode(mode) ? mode : defaultMeta.mode,
		title: typeof title === "string" ? title.trim() : defaultMeta.title,
	};
}

/** Props that the rehype plugin attaches to `<pre>` elements for pre-rendered code blocks. */
type ResolvePreRenderedCodeBlockPropsInput = {
	collapsible?: unknown;
	disableCopy?: unknown;
	mantleCode?: unknown;
	mantleCollapsible?: unknown;
	mantleDisableCopy?: unknown;
	mantleHighlightLines?: unknown;
	mantleLanguage?: unknown;
	mantleLineNumberStart?: unknown;
	mantleMode?: unknown;
	mantlePreHtml?: unknown;
	mantleShowLineNumbers?: unknown;
	mantleTitle?: unknown;
	mode?: unknown;
	title?: unknown;
};

/** Combined input type for a `<pre>` element that may carry both metastring and pre-rendered props. */
type CodeBlockPreElementInput = MetaInput & ResolvePreRenderedCodeBlockPropsInput;

type PreRenderedCodeBlockPropKey = keyof ResolvePreRenderedCodeBlockPropsInput;

/** Normalized code block props extracted from pre-rendered `<pre>` element attributes. */
type ResolvedPreRenderedCodeBlockProps = {
	code: string | undefined;
	collapsible: boolean | undefined;
	disableCopy: boolean | undefined;
	highlightLines: (number | `${number}-${number}`)[] | undefined;
	language: SupportedLanguage | undefined;
	lineNumberStart: number | undefined;
	mode: Mode | undefined;
	preHtml: string | undefined;
	rawLanguage: unknown;
	showLineNumbers: boolean | undefined;
	title: string | undefined;
};

/** Result of {@link resolvePreRenderedCodeBlockProps}: extracted Mantle props and remaining pass-through props. */
type ResolvePreRenderedCodeBlockPropsResult<T extends Record<string, unknown>> = {
	mantleCode: ResolvedPreRenderedCodeBlockProps | undefined;
	props: Omit<T, PreRenderedCodeBlockPropKey>;
};

/**
 * Extracts and normalizes `mantle*` props from a `<pre>` element's attributes,
 * separating them from pass-through props. Returns `undefined` for the Mantle
 * payload when no pre-rendered attributes are present.
 */
function resolvePreRenderedCodeBlockProps<
	T extends ResolvePreRenderedCodeBlockPropsInput & Record<string, unknown>,
>(input: T): ResolvePreRenderedCodeBlockPropsResult<T> {
	const {
		collapsible,
		disableCopy,
		mantleCode,
		mantleCollapsible,
		mantleDisableCopy,
		mantleHighlightLines,
		mantleLanguage,
		mantleLineNumberStart,
		mantleMode,
		mantlePreHtml,
		mantleShowLineNumbers,
		mantleTitle,
		mode,
		title,
		...props
	} = input;

	const hasPayload =
		mantleLanguage != null ||
		mantleCode != null ||
		mantlePreHtml != null ||
		mantleShowLineNumbers != null ||
		mantleHighlightLines != null ||
		mantleLineNumberStart != null ||
		mantleCollapsible != null ||
		mantleDisableCopy != null ||
		mantleMode != null ||
		mantleTitle != null;

	if (!hasPayload) {
		return {
			mantleCode: undefined,
			props: props as Omit<T, PreRenderedCodeBlockPropKey>,
		};
	}

	return {
		mantleCode: {
			code: typeof mantleCode === "string" ? mantleCode : undefined,
			collapsible:
				(typeof mantleCollapsible === "string" || typeof mantleCollapsible === "boolean"
					? parseBooleanish(mantleCollapsible)
					: undefined) ??
				(typeof collapsible === "string" || typeof collapsible === "boolean"
					? parseBooleanish(collapsible)
					: undefined),
			disableCopy:
				typeof mantleDisableCopy === "string" || typeof mantleDisableCopy === "boolean"
					? parseBooleanish(mantleDisableCopy)
					: typeof disableCopy === "string" || typeof disableCopy === "boolean"
						? parseBooleanish(disableCopy)
						: undefined,
			highlightLines: parseCodeBlockHighlightLines(mantleHighlightLines),
			language:
				typeof mantleLanguage === "string" && isSupportedLanguage(mantleLanguage)
					? mantleLanguage
					: undefined,
			lineNumberStart: parseCodeBlockLineNumberStart(mantleLineNumberStart),
			mode: isMode(mantleMode) ? mantleMode : isMode(mode) ? mode : undefined,
			preHtml: typeof mantlePreHtml === "string" ? mantlePreHtml : undefined,
			rawLanguage: mantleLanguage,
			showLineNumbers: parseCodeBlockShowLineNumbers(mantleShowLineNumbers),
			title:
				typeof mantleTitle === "string"
					? mantleTitle.trim()
					: typeof title === "string"
						? title.trim()
						: undefined,
		},
		props: props as Omit<T, PreRenderedCodeBlockPropKey>,
	};
}

export { resolvePreRenderedCodeBlockProps };
export {
	//,
	defaultMeta,
	normalizeValue,
	parseMetastring,
	tokenizeMetastring,
};

export type {
	CodeBlockPreElementInput,
	DefaultMeta,
	Meta,
	MetaInput,
	Mode,
	ResolvePreRenderedCodeBlockPropsInput,
	ResolvePreRenderedCodeBlockPropsResult,
	ResolvedPreRenderedCodeBlockProps,
};
