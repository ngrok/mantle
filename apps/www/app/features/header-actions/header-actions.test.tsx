// @vitest-environment happy-dom
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoutesStub, Outlet } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
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
	/** Two actions, the first with the spy under test. */
	function renderActions(onSelect: () => void) {
		render(
			<TooltipProvider>
				<PageActions
					actions={[
						{ id: "new", label: "New endpoint", icon: <svg />, onSelect },
						{ id: "refresh", label: "Refresh", icon: <svg />, onSelect: () => {} },
					]}
				/>
			</TooltipProvider>,
		);
	}

	it("runs an action from its desktop icon button", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn<() => void>();
		renderActions(onSelect);

		await user.click(screen.getByRole("button", { name: "New endpoint" }));

		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("opens the menu and runs the same action from its item", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn<() => void>();
		renderActions(onSelect);
		// The items mount when the menu opens, so the closed state holds only the
		// icon buttons and the one menu trigger.
		expect(screen.queryByRole("menu")).toBeNull();

		await user.click(screen.getByRole("button", { name: "More actions" }));
		expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
			"New endpoint",
			"Refresh",
		]);

		await user.click(screen.getByRole("menuitem", { name: "New endpoint" }));

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("keeps focus on a desktop button whose label changes", async () => {
		const user = userEvent.setup();
		const actions = (label: string) => (
			<TooltipProvider>
				<PageActions actions={[{ id: "sessions", label, icon: <svg />, onSelect: () => {} }]} />
			</TooltipProvider>
		);
		const { rerender } = render(actions("Show sessions"));
		await user.tab();
		const button = screen.getByRole("button", { name: "Show sessions" });
		expect(document.activeElement).toBe(button);

		// The key is the id, so a label change updates the button in place. A key
		// on the label would remount it and drop focus to the body.
		rerender(actions("Hide sessions"));

		expect(screen.getByRole("button", { name: "Hide sessions" })).toBe(button);
		expect(document.activeElement).toBe(button);
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
