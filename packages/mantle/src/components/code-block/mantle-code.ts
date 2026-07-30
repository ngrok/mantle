import type { SupportedLanguage } from "../code-block/supported-languages.js";
import type { LineRange } from "../code-block/line-numbers.js";
import type { Indentation } from "../code-block/indentation.js";

/** Languages that represent shell/terminal commands. */
const shellLanguages = new Set<SupportedLanguage>(["bash", "sh", "shell"]);

/** Returns the default `showLineNumbers` value for a given language and code string. Single-line shell snippets default to `false`; everything else defaults to `true`. */
function defaultShowLineNumbers(language: SupportedLanguage, code: string): boolean {
	if (shellLanguages.has(language) && !code.trim().includes("\n")) {
		return false;
	}
	return true;
}

const mantleCodeBlockValueBrand: unique symbol = Symbol("MantleCodeBlockValue");

/**
 * The value produced by `mantleCode()`. Contains pre-rendered Shiki HTML (injected
 * by the Vite plugin at build time) and the original code string for the copy button.
 *
 * `~preHtml` is required at render time. Runtime syntax highlighting is intentionally
 * unsupported; `CodeBlock.Code` only substitutes placeholders for interpolated values.
 */
type MantleCodeBlockValue = {
	/**
	 * Nominal type brand to prevent accidental use of plain objects.
	 */
	[mantleCodeBlockValueBrand]: true;
	/**
	 * The language used for syntax highlighting.
	 */
	language: SupportedLanguage;
	/**
	 * The original code string (used by the copy button).
	 */
	code: string;
	/**
	 * Fully pre-rendered Shiki HTML injected by the Vite plugin or server highlighter.
	 * This must be present for rendering.
	 *
	 * **Security:** This HTML is injected via `dangerouslySetInnerHTML`. It must
	 * come from a trusted source (Shiki output from the Vite plugin or
	 * `createMantleServerSyntaxHighlighter`). Never pass unsanitized user input.
	 */
	"~preHtml"?: string | undefined;
	/**
	 * Runtime values used to replace `SHIKI_VAL_N` placeholders in `~preHtml`.
	 * This enables interpolated template expressions while preserving build-time highlighting.
	 */
	"~preVals"?: unknown[] | undefined;
	/**
	 * Placeholder token prefix used by the Vite transform for interpolated values.
	 * When omitted, CodeBlock falls back to the legacy `SHIKI_VAL_<n>` format.
	 */
	"~preValToken"?: string | undefined;
	/**
	 * Optional default for line-number rendering when this value is displayed.
	 */
	"~showLineNumbers"?: boolean | undefined;
	/**
	 * Optional default highlighted line numbers/ranges when this value is displayed.
	 */
	"~highlightLines"?: (LineRange | number)[] | undefined;
	/**
	 * Optional default start line number when line numbers are displayed.
	 * @default 1
	 */
	"~lineNumberStart"?: number | undefined;
};

/** Maps each key starting with `OldPrefix` to `NewPrefix`, leaving other keys unchanged. */
type ReplacePrefix<T, OldPrefix extends string, NewPrefix extends string> = {
	[K in keyof T as K extends `${OldPrefix}${infer Rest}` ? `${NewPrefix}${Rest}` : K]: T[K];
};

/** Public input shape for `createMantleCodeBlockValue`, with `~`-prefixed keys renamed to unprefixed. */
type MantleCodeBlockValueInput = ReplacePrefix<
	Omit<MantleCodeBlockValue, typeof mantleCodeBlockValueBrand>,
	"~",
	""
>;

/** Options for configuring line numbers, highlights, and indentation in `mantleCode()`. */
type MantleCodeOptions = {
	/** Line numbers or ranges to visually highlight in the code block. */
	highlightLines?: (LineRange | number)[] | undefined;
	/** The indentation style to use when normalizing the code string. */
	indentation?: Indentation | undefined;
	/**
	 * The starting line number when line numbers are displayed.
	 * @default 1
	 */
	lineNumberStart?: number | undefined;
	/**
	 * Whether to show line numbers in the code block. Defaults to `true` for most
	 * languages, but `false` for single-line shell snippets (`bash`, `sh`, `shell`).
	 */
	showLineNumbers?: boolean | undefined;
};

/**
 * Creates a `MantleCodeBlockValue` for use with `CodeBlock.Code`.
 *
 * **Security:** The `preHtml` field is rendered via `dangerouslySetInnerHTML`.
 * Only pass HTML produced by Shiki (via the Vite plugin or
 * `createMantleServerSyntaxHighlighter`). Never pass unsanitized user input as `preHtml`.
 */
function createMantleCodeBlockValue({
	preHtml,
	preValToken,
	preVals,
	highlightLines,
	lineNumberStart,
	showLineNumbers,
	code,
	language,
}: MantleCodeBlockValueInput): MantleCodeBlockValue {
	return {
		[mantleCodeBlockValueBrand]: true,
		language,
		code,
		"~preHtml": preHtml,
		"~preValToken": preValToken,
		"~preVals": preVals,
		"~highlightLines": highlightLines,
		"~lineNumberStart": lineNumberStart,
		"~showLineNumbers": showLineNumbers,
	};
}

/** Joins a `TemplateStringsArray` and its interpolated values into a single code string. */
function buildCodeFromTemplate(strings: TemplateStringsArray, values: unknown[]): string {
	let code = "";
	for (let index = 0; index < strings.length; index += 1) {
		code += strings[index] ?? "";
		if (index < values.length) {
			code += String(values[index]);
		}
	}
	return code;
}

/**
 * Tagged template literal for Shiki syntax highlighting.
 *
 * Returns a `MantleCodeBlockValue` that `CodeBlock.Code` renders.
 * The Vite transform plugin rewrites calls to this function at build time,
 * inlining pre-rendered Shiki HTML so that no highlighting work happens in the browser.
 * Configure it via `mantleCodeBlockPlugins()` in `vite.config.ts`.
 *
 * Interpolated template expressions are supported via placeholder substitution.
 *
 * Line numbers are shown by default (`showLineNumbers` defaults to `true`),
 * except for single-line shell snippets (`bash`, `sh`, `shell`) where they default to `false`.
 *
 * @example
 * ```tsx
 * // Static string (line numbers shown by default)
 * mantleCode("typescript")`const x: string = "hello";`
 * // Interpolated string
 * mantleCode("typescript")`const greeting = "Hello, ${name}!";`
 * // Disable line numbers
 * mantleCode("typescript", { showLineNumbers: false })`const x = 1;`
 * // Single-line shell — line numbers hidden by default
 * mantleCode("bash")`npm install @ngrok/mantle`
 * ```
 */
function mantleCode(
	language: SupportedLanguage,
	options: MantleCodeOptions = {},
): (strings: TemplateStringsArray, ...values: unknown[]) => MantleCodeBlockValue {
	const { showLineNumbers, highlightLines, lineNumberStart } = options;

	return (strings, ...values) => {
		const code = buildCodeFromTemplate(strings, values);

		return createMantleCodeBlockValue({
			language,
			code,
			preHtml: undefined,
			preVals: values.length > 0 ? values : undefined,
			highlightLines,
			lineNumberStart,
			showLineNumbers: showLineNumbers ?? defaultShowLineNumbers(language, code),
		});
	};
}

export { defaultShowLineNumbers, mantleCode };
export { createMantleCodeBlockValue };
export type { MantleCodeBlockValue, MantleCodeOptions };
