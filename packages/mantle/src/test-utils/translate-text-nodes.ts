/**
 * Test-only helper that reproduces what a browser translation engine does to
 * the DOM, so a component's update path can be asserted against it.
 *
 * Google Translate wraps each text node in a `<font>` element. The original
 * text node is _reparented_ — React's reference to it stays alive, but its
 * parent is now the `<font>` rather than the element React rendered it into.
 * A later `insertBefore` or `removeChild` that React aims at that node then
 * names a node its parent no longer owns, and the DOM raises `NotFoundError`.
 */

/**
 * Wrap every non-blank text node under `root` in a `<font>` element and mark
 * its text, the way Google Translate does. Mutates the subtree in place.
 *
 * The `-es` suffix stands in for a translated string, so a test can tell the
 * translated text apart from what React rendered.
 *
 * @param root - The subtree to translate in place.
 *
 * @example
 * ```ts
 * render(
 *   <Button appearance="filled" intent="neutral">
 *     Save changes
 *   </Button>,
 * );
 * translateTextNodes(screen.getByRole("button"));
 * // => <button …><span data-slot="button-label">
 * //      <font style="vertical-align: inherit;">[Save changes-es]</font>
 * //    </span></button>
 * ```
 */
function translateTextNodes(root: Node): void {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const translatable: { node: Node; text: string }[] = [];

	// Collect first, then mutate. Wrapping as the walker advances would make it
	// step into the `<font>` elements this adds.
	for (let node = walker.nextNode(); node != null; node = walker.nextNode()) {
		const text = node.nodeValue?.trim();
		if (text) {
			translatable.push({ node, text });
		}
	}

	for (const { node, text } of translatable) {
		const { parentNode } = node;
		if (parentNode == null) {
			continue;
		}

		const font = document.createElement("font");
		font.setAttribute("style", "vertical-align: inherit;");
		parentNode.insertBefore(font, node);
		font.appendChild(node);
		node.nodeValue = `[${text}-es]`;
	}
}

export {
	//,
	translateTextNodes,
};
