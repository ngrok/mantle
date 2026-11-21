/**
 * The parts of the `Breadcrumb` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	List,
	Item,
	Link,
	Label,
	Page,
	Separator,
	BreadcrumbSkeleton as Skeleton,
} from "./breadcrumb.js";
