// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoutesStub, Outlet, useMatches } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { RouteBreadcrumbs } from "~/features/breadcrumbs/breadcrumbs";
import { findSelfOrigin } from "~/features/navigation-origin/origin-trail";
import { handle as domainHandle } from "./domain";
import DomainsHub, { handle as domainsHubHandle } from "./domains-hub";
import { handle as endpointHandle } from "./endpoint";
import { handle as endpointsHandle } from "./endpoints";
import { demoPaths } from "./paths";
import { handle as settingsAccountHandle } from "./settings-account";
import { handle as settingsGeneralHandle } from "./settings-general";
import { handle as settingsIdentityAccessHandle } from "./settings-identity-access";
import { handle as teamMembersHandle } from "./team-members";
import { handle as tlsCertsHandle } from "./tls-certs";

afterEach(() => {
	cleanup();
});

const shellPath = "/preview/breadcrumbs-from-routes";

/** The demo shell reduced to what the trail needs: the header and the outlet. */
function ShellStub() {
	return (
		<>
			<RouteBreadcrumbs />
			<Outlet />
		</>
	);
}

function trail() {
	return screen.getByRole("navigation", { name: "Breadcrumb" });
}

function currentPage() {
	const page = trail().querySelector('[aria-current="page"]');
	if (page == null) {
		throw new Error("the trail has no current page");
	}
	return page;
}

describe("section layouts", () => {
	// The real section handles, under a pathless gate that contributes nothing,
	// the shape the dashboard's settings area uses.
	const Stub = createRoutesStub([
		{
			path: shellPath,
			Component: ShellStub,
			children: [
				{
					children: [
						{
							handle: settingsAccountHandle,
							children: [{ path: "settings/general", handle: settingsGeneralHandle }],
						},
						{
							handle: settingsIdentityAccessHandle,
							children: [{ path: "team-members", handle: teamMembersHandle }],
						},
					],
				},
			],
		},
	]);

	it("prefixes a page with its section as a label, not a link", () => {
		render(<Stub initialEntries={[demoPaths.teamMembers]} />);

		const section = within(trail()).getByText("Identity & Access");
		expect(section.closest("a")).toBeNull();
		expect(section.getAttribute("aria-current")).toBeNull();
		expect(currentPage().textContent).toBe("Team Members");
	});

	it("puts a top-level URL under its section by nesting, not by path", () => {
		render(<Stub initialEntries={[demoPaths.settingsGeneral]} />);

		expect(
			within(trail())
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Account", "General"]);
	});
});

describe("domains hub", () => {
	const Stub = createRoutesStub([
		{
			path: shellPath,
			Component: ShellStub,
			children: [
				{
					handle: domainsHubHandle,
					Component: DomainsHub,
					children: [{ path: "domains" }, { path: "tls-certs", handle: tlsCertsHandle }],
				},
			],
		},
	]);

	it("names the hub as a link to its first member on the second member's page", () => {
		render(<Stub initialEntries={[demoPaths.tlsCerts]} />);

		// the pathless layout's own pathname is the shell's, so this only holds
		// while the handle passes an explicit `to`
		const hub = within(trail()).getByRole("link", { name: "Domains" });
		expect(hub.getAttribute("href")).toBe(demoPaths.domains);
		expect(currentPage().textContent).toBe("TLS Certificates");
	});

	it("shows one crumb on the hub's first member, because that member has no handle", () => {
		render(<Stub initialEntries={[demoPaths.domains]} />);

		const items = within(trail()).getAllByRole("listitem");
		expect(items).toHaveLength(1);
		expect(currentPage().textContent).toBe("Domains");
	});

	it("selects the tab for the current member and links every tab", () => {
		render(<Stub initialEntries={[demoPaths.tlsCerts]} />);

		const tlsTab = screen.getByRole("tab", { name: "TLS Certificates" });
		expect(tlsTab.getAttribute("aria-selected")).toBe("true");
		expect(tlsTab.getAttribute("href")).toBe(demoPaths.tlsCerts);
		expect(screen.getByRole("tab", { name: "Domains" }).getAttribute("href")).toBe(
			demoPaths.domains,
		);
	});

	it("keeps focus on the clicked tab across the route change", async () => {
		const user = userEvent.setup();
		render(<Stub initialEntries={[demoPaths.domains]} />);

		const tlsTab = screen.getByRole("tab", { name: "TLS Certificates" });
		await user.click(tlsTab);

		await screen.findByRole("tab", { name: "TLS Certificates", selected: true });
		// the hub layout stayed mounted, so the trigger the reader clicked is the
		// same element and never lost focus
		expect(document.activeElement).toBe(tlsTab);
		expect(currentPage().textContent).toBe("TLS Certificates");
	});
});

describe("detail routes that are siblings of their list", () => {
	function SelfOriginProbe() {
		return <output data-testid="self">{JSON.stringify(findSelfOrigin(useMatches()))}</output>;
	}

	const Stub = createRoutesStub([
		{
			path: shellPath,
			Component: ShellStub,
			children: [
				{ path: "endpoints", handle: endpointsHandle },
				{
					path: "endpoints/:endpointId",
					handle: endpointHandle,
					Component: () => (
						<>
							<SelfOriginProbe />
							<Outlet />
						</>
					),
					children: [{ index: true }, { path: "traffic-policy" }],
				},
				{ path: "domains/:domainId", handle: domainHandle, Component: SelfOriginProbe },
			],
		},
	]);

	it("names the list as an ancestor the detail route is not nested under", () => {
		render(<Stub initialEntries={[demoPaths.endpoint("ep_1")]} />);

		expect(within(trail()).getByRole("link", { name: "Endpoints" }).getAttribute("href")).toBe(
			demoPaths.endpoints,
		);
		expect(currentPage().textContent).toBe("ep_1");
	});

	it("identifies the endpoint from its param and resolves a tab to the resource root", () => {
		render(<Stub initialEntries={[demoPaths.endpointTrafficPolicy("ep_1")]} />);

		expect(JSON.parse(screen.getByTestId("self").textContent)).toEqual({
			kind: "endpoint",
			id: "ep_1",
			to: demoPaths.endpoint("ep_1"),
			// the section the page lives in, so it can be the root of an origin stack
			ancestors: [{ label: "Endpoints", to: demoPaths.endpoints }],
		});
	});

	it("identifies the domain from its param", () => {
		render(<Stub initialEntries={[demoPaths.domain("rd_1")]} />);

		expect(JSON.parse(screen.getByTestId("self").textContent)).toEqual({
			kind: "domain",
			id: "rd_1",
			to: demoPaths.domain("rd_1"),
			ancestors: [{ label: "Domains", to: demoPaths.domains }],
		});
		expect(within(trail()).getByRole("link", { name: "Domains" }).getAttribute("href")).toBe(
			demoPaths.domains,
		);
	});
});
