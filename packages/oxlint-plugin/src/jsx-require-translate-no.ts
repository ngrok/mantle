import { elementName, inheritedTranslateMode, translateMode } from "./ast.ts";
import type { JsxElement, Rule, RuleContext } from "./types.ts";

/**
 * The elements the rule checks when the config names none.
 *
 * Both hold a string a reader copies or retypes, and neither can hold prose. `code` stays off the
 * list on purpose: mantle's `Code` also styles terms that are not code, so the attribute is a
 * default there rather than a lock.
 */
const DEFAULT_ELEMENTS = ["kbd", "samp"];

/**
 * Reads the element list out of the rule options, falling back to [DEFAULT_ELEMENTS].
 *
 * A config that names an empty list turns the rule off, which is the documented way to opt out of
 * it for one directory.
 *
 * @example
 * configuredElements([{ elements: ["kbd", "CodeBlock.Code"] }]); // Set { "kbd", "CodeBlock.Code" }
 * configuredElements([]); // Set { "kbd", "samp" }
 */
export function configuredElements(options: RuleContext["options"]): Set<string> {
	const [first] = options;
	if (
		first == null ||
		typeof first !== "object" ||
		Array.isArray(first) ||
		!("elements" in first)
	) {
		return new Set(DEFAULT_ELEMENTS);
	}
	const { elements } = first;
	if (!Array.isArray(elements)) {
		return new Set(DEFAULT_ELEMENTS);
	}
	return new Set(elements.filter((element) => typeof element === "string"));
}

/**
 * Reports an element that holds untranslatable content but carries no `translate="no"`.
 *
 * A reader copies or retypes a shortcut key, a CLI flag, an env var, a YAML key, a filename, an
 * ID, or a one-time passcode. A translated one is wrong, and the reader uses it anyway. The
 * attribute classifies content. It is never the fix for the crash the other two rules report.
 *
 * The rule checks the tag names in `elements`, which default to `kbd` and `samp`. It stays quiet
 * when the element's own `translate` is `no` or an expression it cannot read. Otherwise it reads the
 * nearest enclosing `translate`, because descendants inherit it. A later props spread can override
 * an earlier `translate="no"`, so stamp the attribute after the spread.
 *
 * @example
 * // ❌ a translated shortcut key names the wrong key
 * <kbd>{shortcut}</kbd>
 *
 * // ✅
 * <kbd translate="no">{shortcut}</kbd>
 *
 * // .oxlintrc.json: add the components that wrap an untranslatable string
 * // "ngrok/jsx-require-translate-no": ["error", { "elements": ["kbd", "samp", "CodeBlock.Code"] }]
 */
export const jsxRequireTranslateNo: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: 'Require `translate="no"` on elements that hold untranslatable content.',
			url: "https://github.com/ngrok/mantle/blob/main/docs/browser-translation.md#mark-untranslatable-content-translateno",
		},
		schema: [
			{
				type: "object",
				properties: {
					elements: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			missingTranslateNo:
				'`<{{name}}>` holds a string a reader copies or retypes, and a translated one is wrong. Set `translate="no"` on it. When the element can never hold prose, also omit `translate` from its props type and stamp the attribute after the props spread.',
		},
	},
	create(context) {
		const elements = configuredElements(context.options);
		if (elements.size === 0) {
			return {};
		}

		return {
			JSXElement(node: JsxElement) {
				const name = elementName(node.openingElement.name);
				if (!elements.has(name)) {
					return;
				}
				const own = translateMode(node);
				// Why `dynamic` passes: an expression value says the author decided.
				if (own === "no" || own === "dynamic") {
					return;
				}
				if (own == null && inheritedTranslateMode(node) === "no") {
					return;
				}
				context.report({
					node: node.openingElement,
					messageId: "missingTranslateNo",
					data: { name },
				});
			},
		};
	},
};
