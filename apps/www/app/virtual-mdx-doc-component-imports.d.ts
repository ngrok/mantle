declare module "virtual:mdx-doc-component-imports" {
	import type { ComponentType } from "react";
	type ComponentsByFile = Record<string, Record<string, ComponentType<unknown> | unknown>>;
	const content: ComponentsByFile;
	export default content;
}
