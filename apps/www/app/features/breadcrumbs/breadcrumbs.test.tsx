// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { createRoutesStub, MemoryRouter, type UIMatch } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Breadcrumbs, RouteBreadcrumbs } from "./breadcrumbs";
import { buildCrumbs } from "./route-breadcrumb";

afterEach(() => {
	cleanup();
});

/**
 * Builds a `UIMatch` fixture. Only the four fields `buildCrumbs` reads are
 * meaningful; the rest of `UIMatch` is irrelevant to it, which is the point of
 * keeping the builder pure.
 */
function match(fields: {
	id: string;
	pathname: string;
	params?: Record<string, string | undefined>;
	loaderData?: unknown;
	handle?: unknown;
}): UIMatch {
	return {
		id: fields.id,
		pathname: fields.pathname,
		params: fields.params ?? {},
		loaderData: fields.loaderData,
		handle: fields.handle,
	};
}

describe("buildCrumbs", () => {
	it("returns nothing when no route named itself", () => {
		expect(buildCrumbs([match({ id: "root", pathname: "/" })])).toEqual([]);
	});

	it("skips routes with no breadcrumb handle — omitting it is the opt-out", () => {
		const crumbs = buildCrumbs([
			match({ id: "root", pathname: "/" }),
			match({ id: "gate", pathname: "/", handle: { requiresAuth: true } }),
			match({ id: "endpoints", pathname: "/endpoints", handle: { breadcrumb: "Endpoints" } }),
		]);
		expect(crumbs.map((crumb) => crumb.label)).toEqual(["Endpoints"]);
	});

	it("defaults a static crumb's link to the contributing route's pathname", () => {
		const [crumb] = buildCrumbs([
			match({ id: "endpoints", pathname: "/endpoints", handle: { breadcrumb: "Endpoints" } }),
		]);
		expect(crumb).toEqual({ key: "endpoints:0", label: "Endpoints", to: "/endpoints" });
	});

	it("derives a label from params", () => {
		const crumbs = buildCrumbs([
			match({
				id: "endpoint",
				pathname: "/endpoints/cloud/ep_1",
				params: { endpointId: "ep_1" },
				handle: { breadcrumb: (m: UIMatch) => [{ label: m.params.endpointId }] },
			}),
		]);
		expect(crumbs.map((crumb) => crumb.label)).toEqual(["ep_1"]);
	});

	it("derives a label from loaderData, falling back to a param", () => {
		const handle = {
			breadcrumb: (m: UIMatch<{ url?: string }>) => [
				{ label: m.loaderData?.url ?? m.params.endpointId },
			],
		};
		const withData = buildCrumbs([
			match({
				id: "endpoint",
				pathname: "/e/ep_1",
				params: { endpointId: "ep_1" },
				loaderData: { url: "https://forward-labels.test" },
				handle,
			}),
		]);
		const withoutData = buildCrumbs([
			match({ id: "endpoint", pathname: "/e/ep_1", params: { endpointId: "ep_1" }, handle }),
		]);

		expect(withData.map((crumb) => crumb.label)).toEqual(["https://forward-labels.test"]);
		expect(withoutData.map((crumb) => crumb.label)).toEqual(["ep_1"]);
	});

	it("lets one route contribute several crumbs, for an ancestor it is not nested under", () => {
		// The sibling-route case: `endpoints/:type/:id` is registered beside
		// `endpoints`, not inside it, so the detail route has to name the ancestor.
		const crumbs = buildCrumbs([
			match({
				id: "endpoint",
				pathname: "/endpoints/cloud/ep_1",
				params: { endpointId: "ep_1" },
				handle: {
					breadcrumb: (m: UIMatch) => [
						{ label: "Endpoints", to: "/endpoints" },
						{ label: m.params.endpointId },
					],
				},
			}),
		]);

		expect(crumbs).toEqual([
			{ key: "endpoint:0", label: "Endpoints", to: "/endpoints" },
			{ key: "endpoint:1", label: "ep_1", to: "/endpoints/cloud/ep_1" },
		]);
	});

	it("keys stay unique when one route contributes several crumbs", () => {
		const crumbs = buildCrumbs([
			match({
				id: "endpoint",
				pathname: "/e",
				handle: { breadcrumb: () => [{ label: "a" }, { label: "b" }, { label: "c" }] },
			}),
		]);
		expect(new Set(crumbs.map((crumb) => crumb.key)).size).toBe(crumbs.length);
	});
});

describe("Breadcrumbs", () => {
	it("renders nothing for an empty trail", () => {
		const { container } = render(
			<MemoryRouter>
				<Breadcrumbs crumbs={[]} />
			</MemoryRouter>,
		);
		expect(container.querySelector('[data-slot="breadcrumb"]')).toBeNull();
	});

	it("marks only the deepest crumb as the current page", () => {
		render(
			// MemoryRouter, because ancestor crumbs render a router Link
			<MemoryRouter>
				<Breadcrumbs
					crumbs={[
						{ key: "endpoints:0", label: "Endpoints", to: "/endpoints" },
						{ key: "endpoint:0", label: "ep_1", to: "/endpoints/cloud/ep_1" },
					]}
				/>
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Endpoints" }).getAttribute("href")).toBe("/endpoints");
		// the leaf is not a link, and carries aria-current
		expect(screen.queryByRole("link", { name: "ep_1" })).toBeNull();
		expect(screen.getByText("ep_1").getAttribute("aria-current")).toBe("page");
	});

	it("renders an ordered list inside a labeled nav landmark", () => {
		const { container } = render(
			<MemoryRouter>
				<Breadcrumbs crumbs={[{ key: "a:0", label: "Endpoints", to: "/endpoints" }]} />
			</MemoryRouter>,
		);

		expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeDefined();
		expect(container.querySelector("ol")).not.toBeNull();
		expect(container.querySelectorAll("li")).toHaveLength(1);
	});
});

describe("RouteBreadcrumbs (through a real router)", () => {
	it("builds the trail from nested route handles", () => {
		// createRoutesStub forwards `handle` onto the matches, so this exercises the
		// real useMatches() path without standing up the whole app.
		const Stub = createRoutesStub([
			{
				path: "/endpoints",
				handle: { breadcrumb: "Endpoints" },
				Component: () => <RouteBreadcrumbs />,
				children: [
					{
						path: ":endpointId",
						handle: { breadcrumb: (m: UIMatch) => [{ label: m.params.endpointId }] },
					},
				],
			},
		]);

		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		expect(screen.getByRole("link", { name: "Endpoints" }).getAttribute("href")).toBe("/endpoints");
		expect(screen.getByText("ep_1").getAttribute("aria-current")).toBe("page");
	});

	it("loses the ancestor when the detail route is a sibling, not a child", () => {
		// Regression guard on the recipe's central caveat: the trail follows route
		// NESTING, not URL depth. Registered as siblings, `/endpoints` never matches
		// on the detail URL, so its handle is never read.
		const Stub = createRoutesStub([
			{ path: "/endpoints", handle: { breadcrumb: "Endpoints" } },
			{
				path: "/endpoints/:endpointId",
				handle: { breadcrumb: (m: UIMatch) => [{ label: m.params.endpointId }] },
				Component: () => <RouteBreadcrumbs />,
			},
		]);

		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		expect(screen.queryByRole("link", { name: "Endpoints" })).toBeNull();
		expect(screen.getByText("ep_1").getAttribute("aria-current")).toBe("page");
	});
});
