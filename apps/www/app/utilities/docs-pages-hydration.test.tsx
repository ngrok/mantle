// @vitest-environment happy-dom
// @vitest-environment-options {"settings": {"disableIframePageLoading": true}}
// (happy-dom otherwise fetches every preview frame's document for real)
import type { ComponentType } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { ContentLayout } from "~/components/content-layout";
import { hydrationErrorsOf } from "~/test-utils/hydration";

/**
 * Every docs page hydrates its server markup without a mismatch, inline demos
 * included. The preview sweep covers the framed examples; this one renders
 * each compiled MDX page the way `doc-page.tsx` does, so a demo written in the
 * page itself, or a helper the page renders in its prose, is covered the
 * moment it lands. The glob mirrors `docs.ts`, which is the module-resolution
 * shape TypeScript can follow for `.mdx`.
 */
const pages = import.meta.glob<{ default: ComponentType }>("../docs/**/*.mdx", { eager: true });

/** The URL path a page's glob key maps to: `../docs/base/colors.mdx` is `/base/colors`. */
function pathOf(key: string): string {
	const path = key.replace(/^\.\.\/docs\//, "/").replace(/\.mdx$/, "");
	return path === "/index" ? "/" : path;
}

describe("docs pages hydrate without a mismatch", () => {
	it.for(Object.entries(pages))("%s", ([key, { default: Page }]) => {
		expect(
			hydrationErrorsOf(
				<MemoryRouter initialEntries={[pathOf(key)]}>
					<ContentLayout>
						<Page />
					</ContentLayout>
				</MemoryRouter>,
			),
		).toEqual([]);
	});
});
