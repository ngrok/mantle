// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoutesStub, Outlet, useLocation, useMatches } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { RouteBreadcrumbs } from "~/features/breadcrumbs/breadcrumbs";
import { findSelfOrigin } from "~/features/navigation-origin/origin-trail";
import { handle as domainHandle } from "./domain";
import DomainsHub, { handle as domainsHubHandle } from "./domains-hub";
import { handle as endpointHandle } from "./endpoint";
import EndpointIndex from "./endpoint-index";
import { handle as endpointsHandle } from "./endpoints";
import type { DemoVault } from "./fixtures";
import { demoPaths } from "./paths";
import { vaultQueryOptions } from "./queries";
import { handle as secretHandle } from "./secret";
import { handle as settingsGeneralHandle } from "./settings-general";
import { handle as settingsShellHandle } from "./settings-shell";
import { handle as teamMembersHandle } from "./team-members";
import { handle as tlsCertsHandle } from "./tls-certs";
import { handle as vaultHandle } from "./vault";
import { handle as vaultsHandle } from "./vaults";

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

/** Prints where the router is and what state it carried, so a redirect can be read. */
function LocationProbe() {
	const location = useLocation();
	return (
		<output data-testid="location">
			{JSON.stringify({ pathname: location.pathname, state: location.state })}
		</output>
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

describe("the settings shell", () => {
	// The real handles: a pathless shell that contributes the `Settings` label
	// over a gate that contributes nothing, the shape the dashboard's settings
	// area uses.
	const Stub = createRoutesStub([
		{
			path: shellPath,
			Component: ShellStub,
			children: [
				{
					handle: settingsShellHandle,
					children: [
						{
							children: [
								{ path: "settings/general", handle: settingsGeneralHandle },
								{ path: "team-members", handle: teamMembersHandle },
							],
						},
					],
				},
			],
		},
	]);

	it("prefixes a page with the shell's label, not a link", () => {
		render(<Stub initialEntries={[demoPaths.teamMembers]} />);

		const section = within(trail()).getByText("Settings");
		expect(section.closest("a")).toBeNull();
		expect(section.getAttribute("aria-current")).toBeNull();
		expect(currentPage().textContent).toBe("Team Members");
	});

	it("puts a URL under the shell by nesting, not by path", () => {
		render(<Stub initialEntries={[demoPaths.settingsGeneral]} />);

		expect(
			within(trail())
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Settings", "General"]);
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
					path: "endpoints/:endpointType/:endpointId",
					handle: endpointHandle,
					Component: () => (
						<>
							<SelfOriginProbe />
							<Outlet />
						</>
					),
					children: [
						{ index: true, Component: EndpointIndex },
						{ path: "overview", Component: LocationProbe },
						{ path: "traffic-policy" },
					],
				},
				{ path: "domains/:domainId", handle: domainHandle, Component: SelfOriginProbe },
			],
		},
	]);

	it("names the list as an ancestor the detail route is not nested under", () => {
		render(<Stub initialEntries={[demoPaths.endpointTab("cloud", "ep_1", "overview")]} />);

		expect(within(trail()).getByRole("link", { name: "Endpoints" }).getAttribute("href")).toBe(
			demoPaths.endpoints,
		);
		expect(currentPage().textContent).toBe("ep_1");
	});

	it("identifies the endpoint from its param and resolves a tab to the resource root", () => {
		render(<Stub initialEntries={[demoPaths.endpointTab("cloud", "ep_1", "traffic-policy")]} />);

		expect(JSON.parse(screen.getByTestId("self").textContent)).toEqual({
			kind: "endpoint",
			id: "ep_1",
			to: demoPaths.endpoint("cloud", "ep_1"),
			// the section the page lives in, so it can be the root of an origin stack
			ancestors: [{ label: "Endpoints", to: demoPaths.endpoints }],
		});
	});

	it("redirects the resource root to the Overview tab and forwards the origin trail", async () => {
		const origin = [{ kind: "domain", id: "rd_1", to: demoPaths.domain("rd_1"), ancestors: [] }];
		render(
			// the trail renders the domain's origin crumb, which reads its query
			<QueryClientProvider client={new QueryClient()}>
				<Stub
					initialEntries={[{ pathname: demoPaths.endpoint("cloud", "ep_1"), state: { origin } }]}
				/>
			</QueryClientProvider>,
		);

		const probe = await screen.findByTestId("location");

		// drop `state={location.state}` from the redirect and the trail arrives as null
		expect(JSON.parse(probe.textContent)).toEqual({
			pathname: demoPaths.endpointTab("cloud", "ep_1", "overview"),
			state: { origin },
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

describe("the vault's query-backed crumb", () => {
	const Stub = createRoutesStub([
		{
			path: shellPath,
			Component: ShellStub,
			children: [
				{ path: "vaults", handle: vaultsHandle },
				{
					path: "vaults/:vaultId",
					handle: vaultHandle,
					Component: Outlet,
					children: [{ index: true }, { path: "secrets/:secretId", handle: secretHandle }],
				},
			],
		},
	]);

	const production: DemoVault = { id: "vlt_1", name: "production" };

	function renderWarm(pathname: string) {
		const queryClient = new QueryClient();
		queryClient.setQueryData(vaultQueryOptions(production.id).queryKey, production);
		render(
			<QueryClientProvider client={queryClient}>
				<Stub initialEntries={[pathname]} />
			</QueryClientProvider>,
		);
	}

	it("is the current page on the vault's own page", () => {
		renderWarm(demoPaths.vault(production.id));

		expect(currentPage().textContent).toBe("production");
		expect(within(trail()).queryByRole("link", { name: "production" })).toBeNull();
		expect(
			within(trail())
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Vaults & Secrets", "production"]);
	});

	it("links back to the vault on a secret's page, where the secret's id is the leaf", () => {
		renderWarm(demoPaths.secret(production.id, "sec_1"));

		expect(within(trail()).getByRole("link", { name: "production" }).getAttribute("href")).toBe(
			demoPaths.vault(production.id),
		);
		expect(currentPage().textContent).toBe("sec_1");
	});

	it("holds the segment with a skeleton while the vault is cold", () => {
		render(
			<QueryClientProvider client={new QueryClient()}>
				<Stub initialEntries={[demoPaths.vault(production.id)]} />
			</QueryClientProvider>,
		);

		expect(within(trail()).getByRole("status").textContent).toBe("Loading breadcrumbs…");
		expect(within(trail()).queryByText("production")).toBeNull();
	});
});
