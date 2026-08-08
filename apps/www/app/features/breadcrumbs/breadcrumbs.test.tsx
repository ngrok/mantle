// @vitest-environment happy-dom
import { Breadcrumb, buildCrumbs, routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { cleanup, render, screen } from "@testing-library/react";
import { createRoutesStub, MemoryRouter, type UIMatch } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Breadcrumbs, RouteBreadcrumbs } from "./breadcrumbs";

afterEach(() => {
	cleanup();
});

describe("buildCrumbs", () => {
	// Mantle owns buildCrumbs' contract; what belongs here is a trail-shaped
	// assertion per detail URL your app cares about, like this one.
	it("keeps the ancestor a sibling detail route names for itself", () => {
		// The sibling-route case: `endpoints/:type/:id` is registered beside
		// `endpoints`, not inside it, so the detail route has to name the ancestor.
		const crumbs = buildCrumbs([
			{
				id: "endpoint",
				pathname: "/endpoints/cloud/ep_1",
				handle: {
					breadcrumb: () => [
						routeBreadcrumb("Endpoints", { to: "/endpoints" }),
						routeBreadcrumb("ep_1"),
					],
				},
			},
		]);

		expect(crumbs).toEqual([
			{ kind: "link", key: "endpoint:0", label: "Endpoints", to: "/endpoints" },
			{ kind: "link", key: "endpoint:1", label: "ep_1", to: "/endpoints/cloud/ep_1" },
		]);
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
						{ kind: "link", key: "endpoints:0", label: "Endpoints", to: "/endpoints" },
						{ kind: "link", key: "endpoint:0", label: "ep_1", to: "/endpoints/cloud/ep_1" },
					]}
				/>
			</MemoryRouter>,
		);

		expect(screen.getByRole("link", { name: "Endpoints" }).getAttribute("href")).toBe("/endpoints");
		// the leaf is not a link, and carries aria-current
		expect(screen.queryByRole("link", { name: "ep_1" })).toBeNull();
		expect(screen.getByText("ep_1").getAttribute("aria-current")).toBe("page");
	});

	it("renders a prefix crumb as plain text — no link, no aria-current", () => {
		render(
			<MemoryRouter>
				<Breadcrumbs
					crumbs={[
						{ kind: "label", key: "settings:0", label: "Settings" },
						{ kind: "link", key: "general:0", label: "General", to: "/settings/general" },
					]}
				/>
			</MemoryRouter>,
		);

		const settings = screen.getByText("Settings");
		expect(settings.closest("a")).toBeNull();
		expect(settings.getAttribute("aria-current")).toBeNull();
		expect(screen.getByText("General").getAttribute("aria-current")).toBe("page");
	});

	it("renders a content crumb's own items after its separator", () => {
		const { container } = render(
			<MemoryRouter>
				<Breadcrumbs
					crumbs={[
						{ kind: "link", key: "apps:0", label: "Apps", to: "/apps" },
						{
							kind: "content",
							key: "app:0",
							content: (
								<Breadcrumb.Item>
									<Breadcrumb.Page>my-app</Breadcrumb.Page>
								</Breadcrumb.Item>
							),
						},
					]}
				/>
			</MemoryRouter>,
		);

		expect(screen.getByText("my-app").getAttribute("aria-current")).toBe("page");
		expect(container.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(1);
	});

	it("renders a pending content crumb as the skeleton placeholder", () => {
		render(
			<MemoryRouter>
				<Breadcrumbs
					crumbs={[
						{
							kind: "content",
							key: "app:0",
							content: <Breadcrumb.Skeleton itemCount={2} />,
						},
					]}
				/>
			</MemoryRouter>,
		);

		expect(screen.getByRole("status").textContent).toBe("Loading breadcrumbs…");
		expect(screen.queryByRole("link")).toBeNull();
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
						handle: { breadcrumb: (m: UIMatch) => [routeBreadcrumb(m.params.endpointId)] },
					},
				],
			},
		]);

		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		expect(screen.getByRole("link", { name: "Endpoints" }).getAttribute("href")).toBe("/endpoints");
		expect(screen.getByText("ep_1").getAttribute("aria-current")).toBe("page");
	});

	it("renders a layout route's prefix crumb as a non-link", () => {
		// The settings shape: `/settings` only redirects to `/settings/general`, so
		// the layout route opts its crumb out of linking with `routeBreadcrumb.label`.
		const Stub = createRoutesStub([
			{
				path: "/settings",
				handle: { breadcrumb: () => [routeBreadcrumb.label("Settings")] },
				Component: () => <RouteBreadcrumbs />,
				children: [{ path: "general", handle: { breadcrumb: "General" } }],
			},
		]);

		render(<Stub initialEntries={["/settings/general"]} />);

		const settings = screen.getByText("Settings");
		expect(settings.closest("a")).toBeNull();
		expect(settings.getAttribute("aria-current")).toBeNull();
		expect(screen.getByText("General").getAttribute("aria-current")).toBe("page");
	});

	it("renders a route's content crumb", () => {
		const Stub = createRoutesStub([
			{
				path: "/apps/:appId",
				handle: {
					breadcrumb: () => [
						routeBreadcrumb.content(
							<Breadcrumb.Item>
								<Breadcrumb.Page>my-app</Breadcrumb.Page>
							</Breadcrumb.Item>,
						),
					],
				},
				Component: () => <RouteBreadcrumbs />,
			},
		]);

		render(<Stub initialEntries={["/apps/app_123"]} />);

		expect(screen.getByText("my-app").getAttribute("aria-current")).toBe("page");
	});

	it("loses the ancestor when the detail route is a sibling, not a child", () => {
		// Regression guard on the recipe's central caveat: the trail follows route
		// NESTING, not URL depth. Registered as siblings, `/endpoints` never matches
		// on the detail URL, so its handle is never read.
		const Stub = createRoutesStub([
			{ path: "/endpoints", handle: { breadcrumb: "Endpoints" } },
			{
				path: "/endpoints/:endpointId",
				handle: { breadcrumb: (m: UIMatch) => [routeBreadcrumb(m.params.endpointId)] },
				Component: () => <RouteBreadcrumbs />,
			},
		]);

		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		expect(screen.queryByRole("link", { name: "Endpoints" })).toBeNull();
		expect(screen.getByText("ep_1").getAttribute("aria-current")).toBe("page");
	});
});
