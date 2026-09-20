// @vitest-environment happy-dom
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { cleanup, render, screen } from "@testing-library/react";
import { createRoutesStub, Outlet } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { findHeaderActions, PageActions, RouteHeaderActions } from "./header-actions";

afterEach(() => {
	cleanup();
});

const listActions = <button type="button">New endpoint</button>;
const detailActions = <button type="button">Delete endpoint</button>;

describe("findHeaderActions", () => {
	it("returns the actions of the deepest match that declares them", () => {
		const matches = [
			{ handle: { headerActions: listActions } },
			{ handle: { headerActions: detailActions } },
		];
		expect(findHeaderActions(matches)).toBe(detailActions);
	});

	it("lets a child route without a handle inherit its ancestor's actions", () => {
		// The tab-route shape: `/endpoints/:id/traffic-policy` declares nothing, so
		// the detail route's actions stay in the header across every tab.
		const matches = [{ handle: { headerActions: detailActions } }, { handle: undefined }];
		expect(findHeaderActions(matches)).toBe(detailActions);
	});

	it("lets a child route opt out with null", () => {
		const matches = [
			{ handle: { headerActions: listActions } },
			{ handle: { headerActions: null } },
		];
		expect(findHeaderActions(matches)).toBeNull();
	});

	it("skips a handle whose headerActions is not an element", () => {
		// A string there is a text node in a flex row, and never what the route
		// meant, so the guard treats it as no declaration at all.
		const matches = [
			{ handle: { headerActions: listActions } },
			{ handle: { headerActions: "…" } },
		];
		expect(findHeaderActions(matches)).toBe(listActions);
	});

	it("returns null when no match declares actions", () => {
		expect(
			findHeaderActions([{ handle: { breadcrumb: "Settings" } }, { handle: undefined }]),
		).toBeNull();
	});
});

describe("RouteHeaderActions (through a real router)", () => {
	it("renders the leaf route's actions from its handle", () => {
		// createRoutesStub forwards `handle` onto the matches, so this exercises the
		// real useMatches() path without standing up the whole app.
		const Stub = createRoutesStub([
			{
				path: "/endpoints",
				handle: { headerActions: listActions },
				Component: () => (
					<>
						<RouteHeaderActions />
						<Outlet />
					</>
				),
				children: [{ path: ":endpointId", handle: { headerActions: detailActions } }],
			},
		]);

		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		expect(screen.queryByRole("button", { name: "Delete endpoint" })).not.toBeNull();
		expect(screen.queryByRole("button", { name: "New endpoint" })).toBeNull();
	});
});

describe("PageActions", () => {
	it("renders every action twice: as an icon button and as a menu item behind one trigger", () => {
		render(
			<TooltipProvider>
				<PageActions
					actions={[
						{ label: "New endpoint", icon: <svg />, onSelect: () => {} },
						{ label: "Refresh", icon: <svg />, onSelect: () => {} },
					]}
				/>
			</TooltipProvider>,
		);

		// Both renderings are in the HTML, and CSS picks one per breakpoint. The
		// menu's items mount only once it opens, so the closed state shows the
		// icon buttons and the one menu trigger.
		expect(
			screen.getAllByRole("button").map((button) => button.getAttribute("aria-label")),
		).toEqual(["New endpoint", "Refresh", "More actions"]);
	});

	it("renders nothing for an empty list", () => {
		const { container } = render(
			<TooltipProvider>
				<PageActions actions={[]} />
			</TooltipProvider>,
		);
		expect(container.querySelector("button")).toBeNull();
	});
});
