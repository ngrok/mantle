/** The key of a JSON object member line, such as `max_tokens` in `  "max_tokens": 4096,`. */
const MEMBER_KEY = /^\s*"((?:[^"\\]|\\.)*)"\s*:/;

/** One open container: its path, and for an array the index of its next item. */
type Container = { path: readonly (string | number)[]; nextIndex: number | undefined };

/** Decodes the escapes in a key, such as `\"`, or keeps the raw text of a key that is not valid JSON. */
function decodeKey(raw: string): string {
	try {
		return String(JSON.parse(`"${raw}"`));
	} catch {
		return raw;
	}
}

/**
 * Reads the path of the value on each line of pretty-printed JSON, such as
 * `["messages", 0, "role"]`. An object member adds its key and an array item
 * adds its index. A line that only closes a container has no path. It expects
 * one member or item on each line, as `JSON.stringify(value, null, 2)` writes.
 *
 * @example
 * jsonLinePaths('{\n  "thinking": {\n    "budget_tokens": 10\n  }\n}');
 * // [[], ["thinking"], ["thinking", "budget_tokens"], undefined, undefined]
 */
function jsonLinePaths(code: string): (readonly (string | number)[] | undefined)[] {
	const stack: Container[] = [];
	return code.split("\n").map((line) => {
		const text = line.trim();
		if (text.startsWith("}") || text.startsWith("]")) {
			stack.pop();
			return undefined;
		}
		if (text === "") {
			return undefined;
		}
		const parent = stack.at(-1);
		const keyMatch = MEMBER_KEY.exec(text);
		let path: readonly (string | number)[];
		if (parent == null) {
			path = [];
		} else if (parent.nextIndex != null) {
			path = [...parent.path, parent.nextIndex];
			parent.nextIndex += 1;
		} else if (keyMatch != null) {
			path = [...parent.path, decodeKey(keyMatch[1] ?? "")];
		} else {
			return undefined;
		}
		if (text.endsWith("{") || text.endsWith("[")) {
			stack.push({ path, nextIndex: text.endsWith("[") ? 0 : undefined });
		}
		return path;
	});
}

export {
	//,
	jsonLinePaths,
};
