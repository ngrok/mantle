declare module "virtual:mdx-doc-component-imports" {
	import type { ComponentType } from "react";
	type ComponentsByFile = Record<string, Record<string, unknown>>;
	const content: ComponentsByFile;
	export default content;
}
