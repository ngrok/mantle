// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";

/**
 * Every chart docs-page demo mounts without throwing.
 *
 * `pnpm build` compiles the pages and the surface-drift test reads their
 * frontmatter, but neither renders a demo — so a page can ship an example that
 * type-checks and then throws on a reader's first paint. This mounts each one and
 * checks the engine reached a canvas.
 *
 * Both lists are derived rather than written out, so a new chart page or a new
 * example is covered the moment it lands. The glob mirrors `docs.ts`, which is
 * the module-resolution shape TypeScript can follow for `.mdx`.
 */
const chartPages = import.meta.glob<Record<string, unknown>>("../docs/components/charts/*.mdx", {
	eager: true,
});

/** The page's demo components — by convention every `*Example` export. */
const demosOf = (page: Record<string, unknown>): Array<[string, () => ReactNode]> =>
	Object.entries(page).flatMap(([name, value]) =>
		name.endsWith("Example") && typeof value === "function"
			? [[name, value as () => ReactNode]]
			: [],
	);

test("every chart page is globbed", () => {
	// Guards the glob: a moved directory would otherwise leave this file testing
	// nothing at all, silently.
	expect(Object.keys(chartPages)).toHaveLength(4);
});

describe.each(Object.entries(chartPages))("%s", (_path, page) => {
	const demos = demosOf(page);

	test("the page exports demo components", () => {
		// Guards the derivation: a renamed export convention would otherwise leave
		// the per-demo table empty and vacuously green.
		expect(demos.length).toBeGreaterThan(0);
	});

	test.each(demos)("%s mounts and paints a canvas", (_name, Demo) => {
		const { container } = render(<Demo />);
		expect(container.querySelector("canvas")).not.toBeNull();
	});
});
