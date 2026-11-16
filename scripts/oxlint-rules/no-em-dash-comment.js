/**
 * Bans the em dash in comments, so an em-dash aside cannot come back after a
 * sweep. Example code is exempt: a fenced block, and the body of an `@example`
 * tag. An inline code span is exempt, so a rule can name the character.
 * CONVENTIONS.md § Writing owns the rule.
 *
 * @example
 * // ❌ Incorrect
 * // The flush resets the cursor — and the queue.
 *
 * // ✅ Correct
 * // The flush resets the cursor and the queue.
 */

const EM_DASH = "—";
const FENCE = /^(`{3,}|~{3,})/;
const TAG = /^@(\w+)/;
const INLINE_CODE = /(`+)[^`]*?\1/g;

/**
 * The 0-based offsets of the comment lines that hold an em dash in prose.
 *
 * @example
 * proseEmDashLines(" a — b\n * @example\n * c — d"); // => [0]
 */
function proseEmDashLines(commentValue) {
	const offsets = [];
	let openFence = null;
	let inExample = false;
	commentValue.split("\n").forEach((rawLine, offset) => {
		const line = rawLine.replace(/^\s*\*?\s?/, "").trimEnd();
		const fence = FENCE.exec(line.trimStart())?.[1];
		if (fence != null) {
			if (openFence == null) {
				openFence = fence;
			} else if (fence.startsWith(openFence.charAt(0)) && fence.length >= openFence.length) {
				openFence = null;
			}
			return;
		}
		if (openFence != null) {
			return;
		}
		const tag = TAG.exec(line.trimStart())?.[1];
		if (tag != null) {
			inExample = tag === "example";
		}
		if (!inExample && line.replace(INLINE_CODE, "").includes(EM_DASH)) {
			offsets.push(offset);
		}
	});
	return offsets;
}

const noEmDashComment = {
	meta: {},
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					for (const offset of proseEmDashLines(comment.value)) {
						const line = comment.loc.start.line + offset;
						context.report({
							message:
								"Rewrite the em-dash aside as a parenthetical, a colon, a comma, or a separate sentence. See CONVENTIONS.md § Writing.",
							loc: { start: { line, column: 0 }, end: { line, column: 0 } },
						});
					}
				}
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-em-dash-comment": noEmDashComment,
	},
};

export default plugin;
