// @vitest-environment happy-dom
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoutesStub, Link, type UIMatch, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { DemoDomain, DemoEndpoint } from "~/examples/breadcrumbs-from-routes/fixtures";
import {
	domainQueryOptions,
	endpointQueryOptions,
} from "~/examples/breadcrumbs-from-routes/queries";
import { Breadcrumbs, RouteBreadcrumbs } from "~/features/breadcrumbs/breadcrumbs";
import { OriginLink } from "./origin-link";
import type { OriginHandle } from "./origin-trail";
import { useOriginCrumbs } from "./use-origin-crumbs";

afterEach(() => {
	cleanup();
});

/** Prints the raw location state, so a test can read what a link carried. */
function StateProbe() {
	const location = useLocation();
	return <output data-testid="state">{JSON.stringify(location.state)}</output>;
}

/** The location state the probe printed, or `null` for a navigation with none. */
function readProbe(): unknown {
	const text = screen.getByTestId("state").textContent;
	return text === "" ? undefined : JSON.parse(text);
}

const endpointHandle = {
	origin: (match) =>
		match.params.endpointId == null ? null : { kind: "endpoint", id: match.params.endpointId },
} satisfies OriginHandle<UIMatch>;

const domainHandle = {
	origin: (match) =>
		match.params.domainId == null ? null : { kind: "domain", id: match.params.domainId },
} satisfies OriginHandle<UIMatch>;

function EndpointPage() {
	return (
		<>
			<StateProbe />
			<OriginLink to="/domains/rd_1">domain</OriginLink>
			<Link to="/domains/rd_1">plain domain</Link>
		</>
	);
}

function DomainPage() {
	return (
		<>
			<StateProbe />
			<OriginLink to="/endpoints/ep_1">endpoint</OriginLink>
			<OriginLink to="/apps/app_1">app</OriginLink>
		</>
	);
}

function AppPage() {
	return (
		<>
			<StateProbe />
			<OriginLink to="/domains/rd_1">domain</OriginLink>
		</>
	);
}

const Stub = createRoutesStub([
	{ path: "/endpoints/:endpointId", handle: endpointHandle, Component: EndpointPage },
	{ path: "/domains/:domainId", handle: domainHandle, Component: DomainPage },
	// no origin handle: the app page has no identity of its own
	{ path: "/apps/:appId", Component: AppPage },
]);

describe("OriginLink", () => {
	it("carries the current page as the origin to its target", async () => {
		const user = userEvent.setup();
		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		await user.click(screen.getByRole("link", { name: "domain" }));

		expect(readProbe()).toEqual({
			origin: [{ kind: "endpoint", id: "ep_1", to: "/endpoints/ep_1", ancestors: [] }],
		});
	});

	it("pops the trail when the target is where the trail started", async () => {
		const user = userEvent.setup();
		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		await user.click(screen.getByRole("link", { name: "domain" }));
		await user.click(screen.getByRole("link", { name: "endpoint" }));

		expect(readProbe()).toEqual({ origin: [] });
	});

	it("passes the trail through a page with no identity", async () => {
		const user = userEvent.setup();
		render(<Stub initialEntries={["/endpoints/ep_1"]} />);

		await user.click(screen.getByRole("link", { name: "domain" }));
		await user.click(screen.getByRole("link", { name: "app" }));
		// the app page cannot add itself, so the domain page's trail arrives as-is plus the domain
		expect(readProbe()).toEqual({
			origin: [
				{ kind: "endpoint", id: "ep_1", to: "/endpoints/ep_1", ancestors: [] },
				{ kind: "domain", id: "rd_1", to: "/domains/rd_1", ancestors: [] },
			],
		});

		await user.click(screen.getByRole("link", { name: "domain" }));
		// back to the domain: pop to its position, and the app page adds nothing
		expect(readProbe()).toEqual({
			origin: [{ kind: "endpoint", id: "ep_1", to: "/endpoints/ep_1", ancestors: [] }],
		});
	});

	it("a plain Link drops the trail", async () => {
		const user = userEvent.setup();
		render(
			<Stub
				initialEntries={[
					{
						pathname: "/endpoints/ep_1",
						state: { origin: [{ kind: "domain", id: "rd_9", to: "/domains/rd_9", ancestors: [] }] },
					},
				]}
			/>,
		);

		await user.click(screen.getByRole("link", { name: "plain domain" }));

		expect(readProbe()).toBeNull();
	});
});

describe("useOriginCrumbs", () => {
	function OriginTrail() {
		return <Breadcrumbs crumbs={useOriginCrumbs()} />;
	}

	const TrailStub = createRoutesStub([{ path: "/domains/:domainId", Component: OriginTrail }]);

	const arrivedFromEndpoint = {
		pathname: "/domains/rd_2Kq9a",
		state: {
			origin: [
				{
					kind: "endpoint",
					id: "ep_3Exgo",
					to: "/endpoints/ep_3Exgo",
					ancestors: [{ label: "Endpoints", to: "/endpoints" }],
				},
			],
		},
	};

	it("links each entry to its resource root once its query resolves", () => {
		const queryClient = new QueryClient();
		const warmEndpoint: DemoEndpoint = {
			id: "ep_3Exgo",
			url: "https://forward-labels.test",
			domainId: "rd_2Kq9a",
			trafficPolicy: "",
		};
		// the referring page was just open, so its query is warm
		queryClient.setQueryData(endpointQueryOptions(warmEndpoint.id).queryKey, warmEndpoint);

		render(
			<QueryClientProvider client={queryClient}>
				<TrailStub initialEntries={[arrivedFromEndpoint]} />
			</QueryClientProvider>,
		);

		const crumb = screen.getByRole("link", { name: "https://forward-labels.test" });
		expect(crumb.getAttribute("href")).toBe("/endpoints/ep_3Exgo");
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("puts the oldest entry's ancestors in front of the hops", () => {
		const queryClient = new QueryClient();
		const warmEndpoint: DemoEndpoint = {
			id: "ep_3Exgo",
			url: "https://forward-labels.test",
			domainId: "rd_2Kq9a",
			trafficPolicy: "",
		};
		queryClient.setQueryData(endpointQueryOptions(warmEndpoint.id).queryKey, warmEndpoint);

		render(
			<QueryClientProvider client={queryClient}>
				<TrailStub initialEntries={[arrivedFromEndpoint]} />
			</QueryClientProvider>,
		);

		const links = screen.getAllByRole("link");
		expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
			["Endpoints", "/endpoints"],
			["https://forward-labels.test", "/endpoints/ep_3Exgo"],
		]);
	});

	it("holds the segment with a skeleton while the query is cold", () => {
		render(
			<QueryClientProvider client={new QueryClient()}>
				<TrailStub initialEntries={[arrivedFromEndpoint]} />
			</QueryClientProvider>,
		);

		expect(screen.getByRole("status").textContent).toBe("Loading breadcrumbs…");
		// the static ancestor needs no query, so it is already a link; the hop is not
		expect(screen.getByRole("link", { name: "Endpoints" }).getAttribute("href")).toBe("/endpoints");
		expect(screen.queryByRole("link", { name: "https://forward-labels.test" })).toBeNull();
	});

	it("pops the trail to an entry when its crumb is followed", async () => {
		const user = userEvent.setup();
		const queryClient = new QueryClient();
		const warmEndpoint: DemoEndpoint = {
			id: "ep_3Exgo",
			url: "https://forward-labels.test",
			domainId: "rd_2Kq9a",
			trafficPolicy: "",
		};
		const warmDomain: DemoDomain = {
			id: "rd_2Kq9a",
			name: "forward-labels.test",
			certId: "cert_1",
		};
		queryClient.setQueryData(endpointQueryOptions(warmEndpoint.id).queryKey, warmEndpoint);
		queryClient.setQueryData(domainQueryOptions(warmDomain.id).queryKey, warmDomain);
		const Stub = createRoutesStub([
			{
				path: "/endpoints/:endpointId",
				Component: () => (
					<>
						<OriginTrail />
						<StateProbe />
					</>
				),
			},
			{ path: "/domains/:domainId", Component: StateProbe },
		]);

		render(
			<QueryClientProvider client={queryClient}>
				<Stub
					initialEntries={[
						{
							// A → B → C: the reader is on C with [A, B] behind them
							pathname: "/endpoints/ep_7Hnq2",
							state: {
								origin: [
									{ kind: "endpoint", id: "ep_3Exgo", to: "/endpoints/ep_3Exgo", ancestors: [] },
									{ kind: "domain", id: "rd_2Kq9a", to: "/domains/rd_2Kq9a", ancestors: [] },
								],
							},
						},
					]}
				/>
			</QueryClientProvider>,
		);

		// C → B through B's own crumb: the trail resumes as [A], not as []
		await user.click(screen.getByRole("link", { name: "forward-labels.test" }));

		expect(readProbe()).toEqual({
			origin: [{ kind: "endpoint", id: "ep_3Exgo", to: "/endpoints/ep_3Exgo", ancestors: [] }],
		});
	});

	it("renders nothing for a navigation that carried no state", () => {
		const { container } = render(
			<QueryClientProvider client={new QueryClient()}>
				<TrailStub initialEntries={["/domains/rd_2Kq9a"]} />
			</QueryClientProvider>,
		);

		expect(container.querySelector("nav")).toBeNull();
	});
});

describe("RouteBreadcrumbs with an origin", () => {
	it("reads as a stack: the origin's ancestors, the hop, then this page's leaf only", () => {
		const queryClient = new QueryClient();
		const warmEndpoint: DemoEndpoint = {
			id: "ep_3Exgo",
			url: "https://forward-labels.test",
			domainId: "rd_2Kq9a",
			trafficPolicy: "",
		};
		queryClient.setQueryData(endpointQueryOptions(warmEndpoint.id).queryKey, warmEndpoint);
		const Stub = createRoutesStub([
			{
				path: "/domains/:domainId",
				// the domain page's own ancestor (`Domains`) is not where the reader was
				handle: {
					breadcrumb: (match: UIMatch) => [
						routeBreadcrumb("Domains", { to: "/domains" }),
						routeBreadcrumb(match.params.domainId),
					],
				},
				Component: RouteBreadcrumbs,
			},
		]);

		render(
			<QueryClientProvider client={queryClient}>
				<Stub
					initialEntries={[
						{
							pathname: "/domains/rd_2Kq9a",
							state: {
								origin: [
									{
										kind: "endpoint",
										id: "ep_3Exgo",
										to: "/endpoints/ep_3Exgo",
										ancestors: [{ label: "Endpoints", to: "/endpoints" }],
									},
								],
							},
						},
					]}
				/>
			</QueryClientProvider>,
		);

		const items = screen.getAllByRole("listitem").filter((item) => item.textContent !== "");
		expect(items.map((item) => item.textContent)).toEqual([
			"Endpoints",
			"https://forward-labels.test",
			"rd_2Kq9a",
		]);
		expect(screen.queryByRole("link", { name: "Domains" })).toBeNull();
		expect(screen.getByText("rd_2Kq9a").getAttribute("aria-current")).toBe("page");
	});
});
