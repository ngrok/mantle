/**
 * Enforces that named exports with multiple specifiers are written in multi-line
 * format with a `//,` marker comment, but only when the single-line form would
 * fit within the project's printWidth (120, matching .oxcfmtrc.json).
 *
 * oxfmt collapses export specifier lists to a single line regardless of
 * `objectWrap: preserve`, because export specifiers are not object literals.
 * Adding `//,` as the first item in the specifier list prevents that collapse.
 * For exports that already exceed printWidth, the formatter won't reasonably
 * collapse them, so the marker is not required.
 *
 * @example
 * // ✅ Correct
 * export {
 *   //,
 *   foo,
 *   bar,
 * } from "./foo.js";
 *
 * // ✅ Also fine — exceeds printWidth, so the formatter expands it to multi-line naturally;
 * // the //,  marker is not needed because the formatter won't collapse it back.
 * // The result after formatting:
 * export {
 *   reallyLongExportNameA,
 *   reallyLongExportNameB,
 *   reallyLongExportNameC,
 * } from "./foo.js";
 *
 * // ❌ Incorrect — fits on one line so formatter will collapse it; add the marker
 * export { foo, bar } from "./foo.js";
 */

const PRINT_WIDTH = 120; // matches printWidth in .oxcfmtrc.json
const TAB_WIDTH = 2; // matches tabWidth in .oxcfmtrc.json

const multilineExports = {
	meta: {
		fixable: "code",
	},
	create(context) {
		return {
			ExportNamedDeclaration(node) {
				if (node.specifiers.length < 2) {
					return;
				}

				const sourceCode = context.getSourceCode();

				// Find the opening { of the specifier list
				const firstSpec = node.specifiers[0];
				const openBrace = sourceCode.getTokenBefore(firstSpec);
				if (!openBrace || openBrace.value !== "{") {
					return;
				}

				// Find the closing } of the specifier list, skipping a trailing comma
				const lastSpec = node.specifiers[node.specifiers.length - 1];
				let closeBrace = sourceCode.getTokenAfter(lastSpec);
				if (closeBrace?.value === ",") {
					closeBrace = sourceCode.getTokenAfter(closeBrace);
				}
				if (!closeBrace || closeBrace.value !== "}") {
					return;
				}

				// Check for existing //,  marker in the text between { and the first specifier
				const textBeforeFirstSpec = sourceCode.text.slice(openBrace.range[1], firstSpec.range[0]);
				if (/\/\/,/.test(textBeforeFirstSpec)) {
					return;
				}

				// Skip enforcement when the single-line form exceeds printWidth — the
				// formatter won't reasonably collapse those, so the //, marker isn't needed.
				const exportLine = sourceCode.lines[node.loc.start.line - 1];
				const baseIndent = exportLine.match(/^(\s*)/)?.[1] ?? "";
				const indentVisualWidth = [...baseIndent].reduce(
					(w, ch) => w + (ch === "\t" ? TAB_WIDTH : 1),
					0,
				);
				const exportKindPrefix = node.exportKind === "type" ? "type " : "";
				const specTexts = node.specifiers.map((spec) => {
					let text = spec.exportKind === "type" ? "type " : "";
					text +=
						spec.local.name === spec.exported.name
							? spec.local.name
							: `${spec.local.name} as ${spec.exported.name}`;
					return text;
				});
				const fromClause = node.source ? ` from "${node.source.value}"` : "";
				const singleLineWidth =
					indentVisualWidth +
					`export ${exportKindPrefix}{ ${specTexts.join(", ")} }${fromClause};`.length;
				if (singleLineWidth > PRINT_WIDTH) {
					return;
				}

				context.report({
					message:
						'Named exports with multiple specifiers must use multi-line format with a "//," marker to prevent formatter collapse.',
					node,
					fix(fixer) {
						const specIndent = `${baseIndent}\t`;

						const specLines = specTexts.map((text) => `${specIndent}${text},`);

						const expanded = `{\n${specIndent}//,\n${specLines.join("\n")}\n${baseIndent}}`;

						return fixer.replaceTextRange([openBrace.range[0], closeBrace.range[1]], expanded);
					},
				});
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"multiline-exports": multilineExports,
	},
};

export default plugin;
