import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";
import { expect, it } from "vitest";
import { walk } from "~/utilities/mcp/ast-walk";
import { DOM_PROP_NAMES } from "~/utilities/mcp/dom-props";

it("lists each prop of the *Attributes interfaces in the installed @types/react", () => {
	const path = fileURLToPath(
		new URL("../../../node_modules/@types/react/index.d.ts", import.meta.url),
	);
	const names = new Set<string>();
	walk(parseSync(path, readFileSync(path, "utf8")).program, (node) => {
		if (
			node.type !== "TSInterfaceDeclaration" ||
			!String((node.id as { name?: string }).name).endsWith("Attributes")
		) {
			return;
		}
		const { body } = node.body as { body: Record<string, unknown>[] };
		for (const member of body) {
			const key =
				member.type === "TSPropertySignature"
					? (member.key as { name?: string; value?: string })
					: undefined;
			const name = key?.name ?? key?.value;
			if (name != null && !name.includes("-")) {
				names.add(name);
			}
		}
	});

	expect([...DOM_PROP_NAMES].toSorted()).toEqual([...names].toSorted());
});
