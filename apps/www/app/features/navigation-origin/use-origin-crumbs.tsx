import type { ResolvedCrumb } from "@ngrok/mantle/breadcrumb";
import { useIsHydrated } from "@ngrok/mantle/hooks";
import { useLocation } from "react-router";
import { originCrumbs } from "./origin-labels";
import { readOriginTrail } from "./origin-trail";

/**
 * The origin trail as crumbs: the oldest entry's static ancestors, then one
 * content crumb per hop. Put the current page's leaf after them and the trail
 * reads as a stack. Empty on the server and during hydration: the browser
 * keeps `location.state` across a reload, the server never sees it, and
 * reading it in the hydration pass would mismatch the HTML.
 *
 * @example
 * ```tsx
 * const originCrumbs = useOriginCrumbs();
 * const routeCrumbs = buildCrumbs(useMatches());
 * <Breadcrumbs crumbs={originCrumbs.length === 0 ? routeCrumbs : [...originCrumbs, ...routeCrumbs.slice(-1)]} />
 * ```
 */
function useOriginCrumbs(): ReadonlyArray<ResolvedCrumb> {
	const location = useLocation();
	const isHydrated = useIsHydrated();

	if (!isHydrated) {
		return [];
	}

	const entries = readOriginTrail(location.state);
	const [root] = entries;
	if (root == null) {
		return [];
	}

	const ancestorCrumbs = root.ancestors.map((ancestor, index): ResolvedCrumb => {
		const key = `origin-ancestor:${index}`;
		if (ancestor.to == null) {
			return { kind: "label", key, label: ancestor.label };
		}
		return { kind: "link", key, label: ancestor.label, to: ancestor.to };
	});
	const hopCrumbs = entries.map((entry): ResolvedCrumb => {
		const OriginCrumb = originCrumbs[entry.kind];
		return {
			kind: "content",
			key: `origin:${entry.kind}:${entry.id}`,
			content: <OriginCrumb {...entry} />,
		};
	});

	return [...ancestorCrumbs, ...hopCrumbs];
}

export {
	//,
	useOriginCrumbs,
};
