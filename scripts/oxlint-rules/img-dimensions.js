/**
 * Requires `width` and `height` on every `<img>`, so the browser reserves the
 * box before the image loads and the layout does not shift.
 *
 * Scope: only the lowercase `img` intrinsic element. An element with a spread
 * attribute is skipped, because the spread can carry both props.
 *
 * @example
 * // ❌ Incorrect
 * <img src={logo} alt="ngrok" />
 * <img src={logo} alt="ngrok" width={120} />
 *
 * // ✅ Correct
 * <img src={logo} alt="ngrok" width={120} height={32} />
 * <img {...imageProps} alt="ngrok" />
 */

/** Whether the opening element has a plain attribute with this name. */
function hasAttribute(node, name) {
	return node.attributes.some(
		(attribute) =>
			attribute.type === "JSXAttribute" &&
			attribute.name.type === "JSXIdentifier" &&
			attribute.name.name === name,
	);
}

const imgDimensions = {
	meta: {},
	create(context) {
		return {
			JSXOpeningElement(node) {
				if (node.name.type !== "JSXIdentifier" || node.name.name !== "img") {
					return;
				}
				if (node.attributes.some((attribute) => attribute.type === "JSXSpreadAttribute")) {
					return;
				}
				if (hasAttribute(node, "width") && hasAttribute(node, "height")) {
					return;
				}
				context.report({
					message:
						"Set `width` and `height` on every `<img>` so the browser reserves its box before the image loads. Use the CSS box or the asset's intrinsic size.",
					node,
				});
			},
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"img-dimensions": imgDimensions,
	},
};

export default plugin;
