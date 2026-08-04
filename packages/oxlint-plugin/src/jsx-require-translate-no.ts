import type { JsxElement, JsxElementName, Rule, RuleContext } from "./types.ts";

/**
 * The elements the rule checks when the config names none.
 *
 * Both hold a string a reader copies or retypes, and neither can hold prose. `code` stays off the
 * list on purpose — mantle's `Code` also styles terms that are not code, so the attribute is a
 * default there rather than a lock.
 */
const DEFAULT_ELEMENTS = ["kbd", "samp"];

/** Spells a JSX tag name the way the config names it — `kbd`, `Kbd`, or `CodeBlock.Code`. */
function elementName(name: JsxElementName): string {
	switch (name.type) {
		case "JSXIdentifier":
			return name.name;
		case "JSXNamespacedName":
			return `${name.namespace.name}:${name.name.name}`;
		case "JSXMemberExpression":
			return `${elementName(name.object)}.${name.property.name}`;
	}
}

/**
 * Reads an element's `translate` attribute: its string value, `""` when the value is dynamic or
 * the attribute stands bare, and `null` when the attribute is absent.
 */
function translateValue(node: JsxElement): string | null {
	for (const attribute of node.openingElement.attributes) {
		if (attribute.type !== "JSXAttribute") {
			continue;
		}
		if (attribute.name.type !== "JSXIdentifier" || attribute.name.name !== "translate") {
			continue;
		}
		const { value } = attribute;
		if (value != null && value.type === "Literal" && typeof value.value === "string") {
			return value.value;
		}
		// A bare or dynamic `translate` still says the author decided, so the rule stays quiet.
		return "";
	}
	return null;
}

/** Whether an enclosing element already carries `translate="no"`, which descendants inherit. */
function hasTranslateNoAncestor(node: JsxElement): boolean {
	let current: JsxElement["parent"] | null = node.parent;
	while (current != null) {
		if (current.type === "JSXElement" && translateValue(current) === "no") {
			return true;
		}
		current = "parent" in current ? current.parent : null;
	}
	return false;
}

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
 * attribute also keeps the engine out of the subtree, so it doubles as the second fix for the
 * translation crash the other two rules report.
 *
 * The rule checks the tag names in `elements`, which default to `kbd` and `samp`. It stays quiet
 * when the element carries any `translate` attribute, and when an enclosing element already
 * carries `translate="no"` — descendants inherit it.
 *
 * @example
 * // ❌ a translated shortcut key names the wrong key
 * <kbd>{shortcut}</kbd>
 *
 * // ✅
 * <kbd translate="no">{shortcut}</kbd>
 *
 * // .oxlintrc.json — add the components that wrap an untranslatable string
 * // "ngrok/jsx-require-translate-no": ["error", { "elements": ["kbd", "samp", "CodeBlock.Code"] }]
 */
export const jsxRequireTranslateNo: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: 'Require `translate="no"` on elements that hold untranslatable content.',
			url: "https://github.com/ngrok/mantle/blob/main/CONVENTIONS.md#browser-translation",
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
				if (translateValue(node) != null || hasTranslateNoAncestor(node)) {
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
