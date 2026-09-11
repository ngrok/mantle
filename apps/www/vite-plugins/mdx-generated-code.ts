import { format } from "oxfmt";
import type { Plugin } from "vite";

/** Returns the raw script string that one marker inlines. */
type GeneratedCodeSource = () => Promise<string>;

/**
 * The scripts a docs page can inline by name. Each key is the function a
 * marker names. Each value runs that export from the built `@ngrok/mantle`
 * package, so the docs show the string a consumer gets from npm.
 */
const defaultGeneratedCodeSources: Record<string, GeneratedCodeSource> = {
	preventWrongThemeFlashScriptContent: async () => {
		const { preventWrongThemeFlashScriptContent } = await import("@ngrok/mantle/theme");
		return preventWrongThemeFlashScriptContent();
	},
	fixMediaScriptContent: async () => {
		const { fixMediaScriptContent } = await import("@ngrok/mantle/theme");
		return fixMediaScriptContent();
	},
};

/**
 * One marker line: optional indentation, a `//` comment, the tag, and a
 * bare call such as `preventWrongThemeFlashScriptContent()`.
 */
const markerPattern = /^([ \t]*)\/\/ @mantle-generated ([A-Za-z_$][\w$]*)\(\)[ \t]*$/;

const markerTag = "@mantle-generated";

/**
 * Formats a generated script for a docs code fence. The generators return
 * one minified line, which no reader can follow and which forces a
 * horizontal scroll in the code block.
 */
async function formatGeneratedCode(code: string): Promise<string> {
	const result = await format("generated.js", code, {
		printWidth: 100,
		tabWidth: 2,
		useTabs: true,
	});
	if (result.errors.length > 0) {
		const messages = result.errors.map((error) => error.message).join("\n");
		throw new Error(`oxfmt could not format the generated code:\n${messages}`);
	}
	return result.code.trimEnd();
}

/** Prefixes every non-empty line of `code` with `indent`. */
function indentLines(code: string, indent: string): string {
	return code
		.split("\n")
		.map((line) => (line.length === 0 ? line : `${indent}${line}`))
		.join("\n");
}

/**
 * Replaces every `// @mantle-generated <name>()` line in an MDX source with
 * the formatted output of that generator, indented like the marker.
 *
 * When the source has no marker, it returns the source unchanged. When a
 * marker names a generator the map does not have, it throws, so a typo
 * fails the build instead of shipping the marker.
 *
 * @example
 * ```ts
 * await fillGeneratedCode("<script>\n\t// @mantle-generated fixMediaScriptContent()\n</script>");
 * // "<script>\n\t(function O(e) {\n\t\t…\n\t})({ … });\n</script>"
 * ```
 */
export async function fillGeneratedCode(
	source: string,
	sources: Record<string, GeneratedCodeSource> = defaultGeneratedCodeSources,
): Promise<string> {
	if (!source.includes(markerTag)) {
		return source;
	}

	const lines = await Promise.all(
		source.split("\n").map(async (line) => {
			const match = markerPattern.exec(line);
			if (match == null) {
				return line;
			}
			const indent = match[1] ?? "";
			const name = match[2] ?? "";
			// Why hasOwn: a bracket lookup reads inherited members, so a marker such as
			// `toString()` would call `Object.prototype.toString` instead of failing.
			const generate = Object.hasOwn(sources, name) ? sources[name] : undefined;
			if (generate == null) {
				const known = Object.keys(sources).join(", ");
				throw new Error(
					`Unknown ${markerTag} source "${name}()". Known sources: ${known}. Line: ${line.trim()}`,
				);
			}
			return indentLines(await formatGeneratedCode(await generate()), indent);
		}),
	);

	return lines.join("\n");
}

/**
 * Vite plugin that fills `@mantle-generated` markers in the docs MDX before
 * `@mdx-js/rollup` parses the file. The rehype highlighter then sees the
 * script, not the marker, so the fence renders highlighted and the copy
 * button copies the script.
 *
 * @example
 * ```ts
 * // in vite.config.ts, before `rawMdxDocs`:
 * mdxGeneratedCode(path.resolve(import.meta.dirname, "app/docs"))
 * ```
 */
export function mdxGeneratedCode(docsDir: string): Plugin {
	return {
		name: "mdx-generated-code",
		// Why pre: `@mdx-js/rollup` compiles the fence into pre-rendered HTML in
		// its own transform, so the marker must be gone before that runs.
		enforce: "pre",
		async transform(code, id) {
			if (!(id.startsWith(docsDir) && id.endsWith(".mdx"))) {
				return;
			}
			const filled = await fillGeneratedCode(code);
			if (filled === code) {
				return;
			}
			return { code: filled, map: null };
		},
	};
}
