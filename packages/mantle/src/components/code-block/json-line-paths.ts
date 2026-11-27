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
 * adds its index. A line that only closes containers has no path. It expects
 * one member or item on each line, as `JSON.stringify(value, null, 2)` writes,
 * and also reads openers or closers that share a line, such as `"messages": [{`.
 *
 * @example
 * jsonLinePaths('{\n  "thinking": {\n    "budget_tokens": 10\n  }\n}');
 * // [[], ["thinking"], ["thinking", "budget_tokens"], undefined, undefined]
 */
function jsonLinePaths(code: string): (readonly (string | number)[] | undefined)[] {
	const stack: Container[] = [];
	return code.split("\n").map((line) => {
		const text = line.trim();
		const closers = /^[}\]]*/.exec(text)?.[0].length ?? 0;
		for (let index = 0; index < closers; index += 1) {
			stack.pop();
		}
		const rest = text.slice(closers).replace(/^,\s*/, "");
		if (rest === "") {
			return undefined;
		}
		const parent = stack.at(-1);
		const keyMatch = MEMBER_KEY.exec(rest);
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
		// Why each opener after the first: it opens the first item of the array before it, as in `[{`.
		const openers = /[[{]*$/.exec(rest)?.[0] ?? "";
		let openerPath = path;
		for (const [index, opener] of openers.split("").entries()) {
			if (index > 0) {
				const array = stack.at(-1);
				openerPath = [...openerPath, array?.nextIndex ?? 0];
				if (array?.nextIndex != null) {
					array.nextIndex += 1;
				}
			}
			stack.push({ path: openerPath, nextIndex: opener === "[" ? 0 : undefined });
		}
		return path;
	});
}

export {
	//,
	jsonLinePaths,
};
