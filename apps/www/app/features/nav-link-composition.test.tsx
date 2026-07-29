// @vitest-environment happy-dom
import { Button } from "@ngrok/mantle/button";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, NavLink } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
	cleanup();
});

/**
 * The composition mantle's `Slot` exists for, against the real library it used to
 * break on: react-router's `NavLink` resolves `className` and `style` from active
 * state only it knows, and mantle parts compose it with `asChild`
 * ([#1374](https://github.com/ngrok/mantle/issues/1374)).
 *
 * These live in `www` rather than beside `Slot`'s own tests because `react-router`
 * is a `www` dependency, not a mantle one — mantle's tests use a `NavLink`-shaped
 * double. `www` resolves `@ngrok/mantle` through the `@ngrok/src-live-types`
 * condition, so this runs against mantle's source. Assertions are plain DOM, since
 * `www` has no `@testing-library/jest-dom`.
 */
describe("react-router NavLink composed through asChild", () => {
	it("resolves a render-prop className, and the child's classes still win", () => {
		render(
			<MemoryRouter initialEntries={["/endpoints"]}>
				<Sidebar.ItemButton asChild>
					<NavLink
						className={({ isActive }) => (isActive ? "font-medium" : undefined)}
						to="/endpoints"
					>
						Endpoints
					</NavLink>
				</Sidebar.ItemButton>
			</MemoryRouter>,
		);

		const link = screen.getByRole("link", { name: "Endpoints" });

		expect(link.classList.contains("font-medium")).toBe(true);
		// `Sidebar.ItemButton`'s own base styles survive the composition...
		expect(link.classList.contains("rounded-md")).toBe(true);
		expect(link.getAttribute("data-slot")).toBe("sidebar-item-button");
		// ...but the render prop keeps child-wins precedence over them: the part's
		// base `font-normal` loses to the resolved `font-medium`.
		expect(link.classList.contains("font-normal")).toBe(false);
		// NavLink marks itself as the current page, so the row needs no `current`.
		expect(link.getAttribute("aria-current")).toBe("page");
	});

	it("gets the current-row treatment from NavLink's own aria-current, with no props at all", () => {
		// The destination shape: no `current`, no `useMatch`, no render prop, and no
		// mantle internals in app code. `NavLink` resolved the match, so it marks
		// itself, and `Sidebar.ItemButton` styles the row from that attribute.
		render(
			<MemoryRouter initialEntries={["/endpoints"]}>
				<Sidebar.ItemButton asChild>
					<NavLink to="/endpoints">Endpoints</NavLink>
				</Sidebar.ItemButton>
			</MemoryRouter>,
		);

		const link = screen.getByRole("link", { name: "Endpoints" });

		expect(link.getAttribute("aria-current")).toBe("page");
		expect(link.classList.contains("aria-[current=page]:bg-neutral-500/15")).toBe(true);
		expect(link.classList.contains("aria-[current=page]:text-strong")).toBe(true);
	});

	it("marks no row as current when the route does not match, so the treatment does not apply", () => {
		render(
			<MemoryRouter initialEntries={["/domains"]}>
				<Sidebar.ItemButton asChild>
					<NavLink to="/endpoints">Endpoints</NavLink>
				</Sidebar.ItemButton>
			</MemoryRouter>,
		);

		const link = screen.getByRole("link", { name: "Endpoints" });

		// The variant classes ride on every row; the attribute is what gates them.
		expect(link.getAttribute("aria-current")).toBeNull();
		expect(link.hasAttribute("data-current")).toBe(false);
	});

	it("resolves the inactive branch when the route does not match", () => {
		render(
			<MemoryRouter initialEntries={["/domains"]}>
				<Sidebar.ItemButton asChild>
					<NavLink
						className={({ isActive }) => (isActive ? "font-medium" : "italic")}
						to="/endpoints"
					>
						Endpoints
					</NavLink>
				</Sidebar.ItemButton>
			</MemoryRouter>,
		);

		const link = screen.getByRole("link", { name: "Endpoints" });

		expect(link.classList.contains("italic")).toBe(true);
		expect(link.classList.contains("font-medium")).toBe(false);
		expect(link.getAttribute("aria-current")).toBeNull();
	});

	it("resolves a render-prop style, merged with the part's own", () => {
		render(
			<MemoryRouter initialEntries={["/endpoints"]}>
				<Button appearance="outlined" asChild intent="neutral" style={{ fontWeight: 500 }}>
					<NavLink style={({ isActive }) => ({ color: isActive ? "red" : "blue" })} to="/endpoints">
						Endpoints
					</NavLink>
				</Button>
			</MemoryRouter>,
		);

		const link = screen.getByRole("link", { name: "Endpoints" });

		expect(link.style.color).toBe("red");
		expect(link.style.fontWeight).toBe("500");
	});

	it("still supports NavLink's render-prop children alongside a render-prop className", () => {
		render(
			<MemoryRouter initialEntries={["/endpoints"]}>
				<Sidebar.ItemButton asChild>
					<NavLink
						className={({ isActive }) => (isActive ? "font-medium" : undefined)}
						to="/endpoints"
					>
						{({ isActive }) => (isActive ? "Endpoints (current)" : "Endpoints")}
					</NavLink>
				</Sidebar.ItemButton>
			</MemoryRouter>,
		);

		const link = screen.getByRole("link", { name: "Endpoints (current)" });

		expect(link.classList.contains("font-medium")).toBe(true);
	});
});
