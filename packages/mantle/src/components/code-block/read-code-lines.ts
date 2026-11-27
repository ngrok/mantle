import type { CodeLine, CodeToken } from "./line-tokenizer.js";
import type { MantleCodeBlockValue } from "./mantle-code.js";
import { colorForTokenClass } from "./token-classes.js";

/** The content of one `.mantle-code-line` that `decorateHighlightedHtml` wrote. */
// Why `s`: a line can hold U+2028 or U+2029, and `.` matches neither without it.
const LINE_CONTENT = /<span class="mantle-code-line-content">(.*)<\/span><\/span>$/s;

/** One token span, with a token class, an inline style, or both, or a run of bare text. */
const TOKEN = /<span(?: class="([^"]*)")?(?: style="([^"]*)")?>([^<]*)<\/span>|([^<]+)/gy;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	quot: '"',
};

/** Decodes the named, decimal, and hex character references that Shiki and `escapeHtml` write. */
function decodeEntities(text: string): string {
	return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
		if (name.startsWith("#x") || name.startsWith("#X")) {
			return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
		}
		if (name.startsWith("#")) {
			return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
		}
		return NAMED_ENTITIES[name] ?? entity;
	});
}

/** Reads the color and the Shiki font-style bits from a token's inline style. */
function readStyle(style: string): Pick<CodeToken, "color" | "fontStyle"> {
	let color: string | undefined;
	let fontStyle = 0;
	for (const declaration of style.split(";")) {
		const colon = declaration.indexOf(":");
		const property = declaration.slice(0, colon).trim();
		const value = declaration.slice(colon + 1).trim();
		if (property === "color") {
			color = value;
		} else if (property === "font-style" && value === "italic") {
			fontStyle |= 1;
		} else if (property === "font-weight" && value === "bold") {
			fontStyle |= 2;
		} else if (property === "text-decoration") {
			fontStyle |= (value.includes("underline") ? 4 : 0) | (value.includes("line-through") ? 8 : 0);
		}
	}
	return { color, fontStyle: fontStyle === 0 ? undefined : fontStyle };
}

/**
 * Reads the tokens of one line of decorated HTML, or `undefined` when the markup
 * is not the shape that `decorateHighlightedHtml` and Shiki write.
 */
function readHighlightedLine(html: string): CodeLine | undefined {
	const content = LINE_CONTENT.exec(html)?.[1];
	if (content == null) {
		return undefined;
	}
	const tokens: CodeToken[] = [];
	TOKEN.lastIndex = 0;
	while (TOKEN.lastIndex < content.length) {
		const match = TOKEN.exec(content);
		if (match == null) {
			return undefined;
		}
		const [, tokenClass, style, spanText, bareText] = match;
		if (bareText != null) {
			tokens.push({ content: decodeEntities(bareText) });
			continue;
		}
		const classColor = tokenClass == null ? undefined : colorForTokenClass(tokenClass);
		if (tokenClass != null && classColor == null) {
			return undefined;
		}
		const fromStyle = style == null ? {} : readStyle(style);
		tokens.push({
			content: decodeEntities(spanText ?? ""),
			color: fromStyle.color ?? classColor,
			fontStyle: fromStyle.fontStyle,
		});
	}
	return tokens;
}

/**
 * Reads each line of a code value as highlighted tokens, for code that renders
 * as React elements. It takes `~lines` as they are, or reads the tokens from
 * `~preHtml`. A line keeps plain text when the value has no highlighting or
 * when its tokens do not spell its text, such as a line with an interpolated value.
 *
 * @example
 * readCodeLines(jsonCodeBlockValue({ a: 1 }))[1];
 * // [{ content: "  " }, { content: '"a"', color: "var(--shiki-token-keyword)" }, …]
 */
function readCodeLines(
	value: Pick<MantleCodeBlockValue, "code" | "~preHtml" | "~lines">,
): (CodeLine | string)[] {
	const lines = value.code.split("\n");
	const streamed = value["~lines"];
	if (streamed != null) {
		return lines.map((line, index) => streamed[index] ?? line);
	}
	const html = value["~preHtml"];
	if (html == null) {
		return lines;
	}
	const htmlLines = html.split("\n");
	return lines.map((line, index) => {
		const tokens = readHighlightedLine(htmlLines[index] ?? "");
		if (tokens == null) {
			return line;
		}
		const text = tokens.map((token) => token.content).join("");
		// Why a space: `decorateHighlightedHtml` writes one in an empty line, so the line keeps its height.
		if (text === line || (line === "" && text === " ")) {
			return line === "" ? line : tokens;
		}
		return line;
	});
}

export {
	//,
	readCodeLines,
};
