/** Whether `value` is a non-null object, such as an AST node. */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value != null;
}

/**
 * Calls `visit` on each AST node under `node`, depth first.
 *
 * @example
 * walk(parsed.program, (node) => {
 *   if (node.type === "JSXAttribute") { … }
 * });
 */
export function walk(node: unknown, visit: (node: Record<string, unknown>) => void): void {
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

/** Compares an oxc name kind as a string; the oxc kinds are `const enum` types. */
export function hasKind(name: { kind: string }, kind: "Name" | "None" | "Default"): boolean {
	return name.kind === kind;
}
