import { parseSync } from "oxc-parser";
import type { VersionData } from "~/utilities/mcp/version-data.server";

const MAX_DIAGNOSTICS = 40;

/** One `check` finding. Messages name identifiers only; they never quote the code. */
export type Diagnostic = {
	code:
		| "parse-error"
		| "unknown-subpath"
		| "unknown-export"
		| "foreign-ui-library"
		| "clsx-classnames"
		| "classname-construction"
		| "incomplete-context";
	severity: "error" | "warning" | "info";
	message: string;
	/** One-based line and column of the start of the finding. */
	line: number;
	column: number;
	fix?: string;
	docsUrl?: string;
};

const FOREIGN_UI_LIBRARIES: readonly RegExp[] = [
	/^@radix-ui\//,
	/^radix-ui$/,
	/^@mui\//,
	/^@chakra-ui\//,
	/^antd$/,
	/^@headlessui\//,
	/^@ariakit\//,
	/^react-bootstrap$/,
	// Why: shadcn copies its parts into the app under `components/ui`.
	/(^|\/)components\/ui(\/|$)/,
];

function lineAndColumn(source: string, offset: number): { line: number; column: number } {
	const before = source.slice(0, offset);
	const line = before.split("\n").length;
	return { line, column: offset - before.lastIndexOf("\n") };
}

/** The specifiers that export `name`, for a fix hint. */
function specifiersExporting(data: VersionData, name: string): string[] {
	const found: string[] = [];
	for (const [specifier, names] of data.exportsBySpecifier) {
		if (names.has(name)) {
			found.push(specifier);
		}
	}
	return found;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value != null;
}

/** Calls `visit` on each AST node under `node`, depth first. */
function walk(node: unknown, visit: (node: Record<string, unknown>) => void): void {
	if (Array.isArray(node)) {
		for (const child of node) {
			walk(child, visit);
		}
		return;
	}
	if (!isRecord(node)) {
		return;
	}
	if (typeof node.type === "string") {
		visit(node);
	}
	for (const [key, value] of Object.entries(node)) {
		if (key !== "parent" && typeof value === "object") {
			walk(value, visit);
		}
	}
}

/** Whether a `className` value builds a string by hand instead of with `cx`. */
function isConstructedClassName(expression: Record<string, unknown>): boolean {
	if (expression.type === "TemplateLiteral") {
		return Array.isArray(expression.expressions) && expression.expressions.length > 0;
	}
	if (expression.type === "BinaryExpression") {
		return expression.operator === "+";
	}
	return expression.type === "ConditionalExpression";
}

/**
 * Runs `check` stage A on one TSX file: a parse, then mantle import, export,
 * and `className` rules for the selected version. No TypeScript type check.
 *
 * @example
 * checkCode({ code: 'import { Buton } from "@ngrok/mantle/button";', data });
 * // [{ code: "unknown-export", message: "@ngrok/mantle/button does not export Buton.", … }]
 */
export function checkCode({ code, data }: { code: string; data: VersionData }): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const add = (offset: number, diagnostic: Omit<Diagnostic, "line" | "column">) => {
		diagnostics.push({ ...diagnostic, ...lineAndColumn(code, offset) });
	};

	const parsed = parseSync("input.tsx", code);
	for (const error of parsed.errors) {
		add(error.labels[0]?.start ?? 0, {
			code: "parse-error",
			severity: "error",
			message: error.message,
		});
	}
	if (parsed.errors.length > 0) {
		return diagnostics.slice(0, MAX_DIAGNOSTICS);
	}

	const cxUrl = "https://mantle.ngrok.com/utils/cx";

	for (const statement of parsed.module.staticImports) {
		const specifier = statement.moduleRequest.value;
		const start = statement.moduleRequest.start;

		if (specifier === "clsx" || specifier === "classnames") {
			add(start, {
				code: "clsx-classnames",
				severity: "error",
				message: `Compose class names with cx, not ${specifier}.`,
				fix: 'import { cx } from "@ngrok/mantle/cx";',
				docsUrl: cxUrl,
			});
			continue;
		}
		if (FOREIGN_UI_LIBRARIES.some((pattern) => pattern.test(specifier))) {
			add(start, {
				code: "foreign-ui-library",
				severity: "error",
				message: `${specifier} is a UI library other than mantle. Use the mantle part for the same job.`,
				fix: "Call `find` with the job this import does, such as `dialog` or `select`.",
			});
			continue;
		}
		if (specifier.startsWith(".") || specifier.startsWith("~/") || specifier.startsWith("@/")) {
			add(start, {
				code: "incomplete-context",
				severity: "info",
				message: `${specifier} is a local module. check cannot see it, and preview cannot load it.`,
			});
			continue;
		}
		if (specifier !== "@ngrok/mantle" && !specifier.startsWith("@ngrok/mantle/")) {
			continue;
		}
		if (/\.(css|json|txt)$/.test(specifier)) {
			continue;
		}

		const exported = data.exportsBySpecifier.get(specifier);
		const importedNames = statement.entries.flatMap((entry) =>
			entry.importName.name == null ? [] : [entry.importName.name],
		);
		if (exported == null) {
			const hints = importedNames.map((name) => {
				const homes = specifiersExporting(data, name);
				return homes.length > 0
					? `${name} from ${homes.join(" or ")}`
					: `${name}: no subpath exports it`;
			});
			add(start, {
				code: "unknown-subpath",
				severity: "error",
				message: `@ngrok/mantle@${data.version} has no import path ${specifier}. Each part imports from its own subpath.`,
				fix: hints.length > 0 ? `Import ${hints.join("; ")}.` : undefined,
			});
			continue;
		}
		for (const entry of statement.entries) {
			const name = entry.importName.name;
			if (name == null || exported.has(name)) {
				continue;
			}
			const homes = specifiersExporting(data, name);
			add(entry.importName.start ?? start, {
				code: "unknown-export",
				severity: "error",
				message: `${specifier} does not export ${name} in @ngrok/mantle@${data.version}.`,
				fix:
					homes.length > 0
						? `Import ${name} from ${homes.join(" or ")}.`
						: "Call `get` with the component name to see what it exports.",
			});
		}
	}

	walk(parsed.program, (node) => {
		if (node.type !== "JSXAttribute" || !isRecord(node.name) || node.name.name !== "className") {
			return;
		}
		const value = isRecord(node.value) ? node.value : undefined;
		const expression =
			value?.type === "JSXExpressionContainer" && isRecord(value.expression)
				? value.expression
				: undefined;
		if (expression != null && isConstructedClassName(expression)) {
			add(typeof node.start === "number" ? node.start : 0, {
				code: "classname-construction",
				severity: "error",
				message: "Build className with cx, not a template string, `+`, or a ternary.",
				fix: 'className={cx("base", condition && "extra")}',
				docsUrl: cxUrl,
			});
		}
	});

	return diagnostics
		.toSorted((left, right) => left.line - right.line || left.column - right.column)
		.slice(0, MAX_DIAGNOSTICS);
}
