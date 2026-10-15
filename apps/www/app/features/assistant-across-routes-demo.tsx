import { AppLayout } from "@ngrok/mantle/app-layout";
import { Badge } from "@ngrok/mantle/badge";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { Sidebar, useSidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { Table } from "@ngrok/mantle/table";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
	AssistantPage,
	AssistantPanel,
	AssistantSidebarRoot,
	assistantPath,
	assistantViewTransitionClassName,
	crossesAssistant,
	isAssistantPath,
} from "~/features/assistant-across-routes/assistant-across-routes";
import { AssistantConversationProvider } from "~/features/assistant-across-routes/assistant-conversation";

/*
 * Navigation in this demo is a FAKE ROUTER, because a preview renders inside
 * the docs app's router and React Router permits one router per tree. A real
 * app renders react-router's `Link` through `Sidebar.ItemButton`'s `asChild`,
 * reads `useLocation()`, and passes `viewTransition` on a crossing.
 */

type DemoNavItem = {
	label: string;
	icon: ReactNode;
	path: string;
};

const demoNavItems: ReadonlyArray<DemoNavItem> = [
	{ label: "Assistant", icon: <SparkleIcon />, path: assistantPath },
	{ label: "Endpoints", icon: <GraphIcon />, path: "/endpoints" },
	{ label: "Domains", icon: <GlobeHemisphereWestIcon />, path: "/domains" },
];

type DemoEndpoint = {
	url: string;
	type: "Cloud" | "Agent";
	policy: "Traffic Policy" | "No Traffic Policy";
};

const demoEndpoints: ReadonlyArray<DemoEndpoint> = [
	{ url: "https://api.acme-demo.ngrok.app", type: "Cloud", policy: "Traffic Policy" },
	{ url: "https://checkout.acme-demo.com", type: "Cloud", policy: "Traffic Policy" },
	{ url: "https://billing.acme-demo.com", type: "Cloud", policy: "No Traffic Policy" },
	{ url: "https://nimble-otter-1423.ngrok.app", type: "Agent", policy: "No Traffic Policy" },
	{ url: "https://orders.internal", type: "Agent", policy: "No Traffic Policy" },
];

type DemoDomain = {
	name: string;
	certificate: "Managed" | "Pending";
};

const demoDomains: ReadonlyArray<DemoDomain> = [
	{ name: "api.acme-demo.ngrok.app", certificate: "Managed" },
	{ name: "checkout.acme-demo.com", certificate: "Managed" },
	{ name: "billing.acme-demo.com", certificate: "Pending" },
];

/**
 * A product page's chrome: the route-owned header with the assistant's trigger
 * in its actions slot, and the `main` body with the page heading at
 * production's scale.
 */
function DemoProductPage({
	title,
	description,
	action,
	children,
}: {
	title: string;
	description: string;
	action: ReactNode;
	children: ReactNode;
}) {
	return (
		<>
			<AppLayout.Header>
				<AppLayout.HeaderStart>
					<Sidebar.Trigger />
				</AppLayout.HeaderStart>
				<AppLayout.HeaderContent>
					<Breadcrumb.Root>
						<Breadcrumb.List>
							<Breadcrumb.Item>
								<Breadcrumb.Page>{title}</Breadcrumb.Page>
							</Breadcrumb.Item>
						</Breadcrumb.List>
					</Breadcrumb.Root>
				</AppLayout.HeaderContent>
				<AppLayout.HeaderActions>
					<AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
				</AppLayout.HeaderActions>
			</AppLayout.Header>
			<AppLayout.Body>
				<div className="mx-auto max-w-7xl p-6">
					<header className="mb-6">
						<h1 className="text-strong mb-2 text-3xl font-medium">{title}</h1>
						<p className="text-body max-w-prose text-sm">{description}</p>
					</header>
					<div className="mb-4 flex justify-end">{action}</div>
					{children}
				</div>
			</AppLayout.Body>
		</>
	);
}

function DemoEndpointsPage() {
	return (
		<DemoProductPage
			title="Endpoints"
			description="Endpoints are the starting point for all connections in ngrok: the gateway for your HTTP/S, TLS, or TCP applications, configurable with the Traffic Policy you control."
			action={
				<Button type="button" appearance="filled" intent="neutral">
					<PlusIcon />
					New endpoint
				</Button>
			}
		>
			<Table.Root>
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header>URL</Table.Header>
							<Table.Header className="w-24">Type</Table.Header>
							<Table.Header className="w-40">Policy</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						{demoEndpoints.map((endpoint) => (
							<Table.Row key={endpoint.url}>
								<Table.Cell className="text-strong font-medium" translate="no">
									{endpoint.url}
								</Table.Cell>
								<Table.Cell>{endpoint.type}</Table.Cell>
								<Table.Cell>
									<Badge
										appearance="muted"
										color={endpoint.policy === "Traffic Policy" ? "amber" : "neutral"}
									>
										{endpoint.policy}
									</Badge>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Element>
			</Table.Root>
		</DemoProductPage>
	);
}

function DemoDomainsPage() {
	return (
		<DemoProductPage
			title="Domains"
			description="Reserve a domain and ngrok serves your endpoints on it, with a managed certificate and nothing to renew."
			action={
				<Button type="button" appearance="filled" intent="neutral">
					<PlusIcon />
					New domain
				</Button>
			}
		>
			<Table.Root>
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header>Domain</Table.Header>
							<Table.Header className="w-36">Certificate</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						{demoDomains.map((domain) => (
							<Table.Row key={domain.name}>
								<Table.Cell className="text-strong font-medium" translate="no">
									{domain.name}
								</Table.Cell>
								<Table.Cell>
									<Badge
										appearance="muted"
										color={domain.certificate === "Managed" ? "success" : "neutral"}
									>
										{domain.certificate}
									</Badge>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Element>
			</Table.Root>
		</DemoProductPage>
	);
}

/**
 * The rail. Lives inside `Sidebar.Root`, so it can close the mobile sheet when
 * a row "navigates", the same shape a real app uses with its router.
 */
function DemoNav({
	pathname,
	onNavigate,
}: {
	pathname: string;
	onNavigate: (path: string) => void;
}) {
	const { setOpenMobile } = useSidebar();

	return (
		<Sidebar.Nav aria-label="Main">
			<Sidebar.Body>
				<Sidebar.Group>
					<Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
					<Sidebar.List>
						{demoNavItems.map((item) => (
							<Sidebar.Item key={item.path}>
								<Sidebar.Tooltip label={item.label}>
									<Sidebar.ItemButton asChild current={pathname === item.path}>
										<a
											href={item.path}
											onClick={(event) => {
												event.preventDefault();
												setOpenMobile(false);
												onNavigate(item.path);
											}}
										>
											{item.icon}
											{item.label}
										</a>
									</Sidebar.ItemButton>
								</Sidebar.Tooltip>
							</Sidebar.Item>
						))}
					</Sidebar.List>
				</Sidebar.Group>
			</Sidebar.Body>
		</Sidebar.Nav>
	);
}

/**
 * The assistant on its own route and beside every other one. The conversation
 * is `main` on the assistant route and the `complementary` panel everywhere
 * else, one store feeds both, and a crossing between the two runs a view
 * transition. Renders as an entire framed-preview document (see
 * preview-registry.ts). Start a conversation, then click Endpoints to watch the
 * page fold into the panel with the reply still streaming.
 */
export function AssistantAcrossRoutesDemo() {
	const [pathname, setPathname] = useState(assistantPath);
	const onAssistantPage = isAssistantPath(pathname);

	const navigate = (to: string) => {
		if (to === pathname) {
			return;
		}
		// What react-router's `viewTransition` does: a crossing commits inside
		// `startViewTransition`, so the browser snapshots both states and morphs
		// the named element between them. Every other navigation is a plain update.
		if (crossesAssistant(pathname, to) && typeof document.startViewTransition === "function") {
			document.startViewTransition(() => {
				flushSync(() => {
					setPathname(to);
				});
			});
			return;
		}
		setPathname(to);
	};

	return (
		<AssistantConversationProvider>
			{/* Open by default so the first crossing shows the morph. An app reads
			    the preference from the side panel cookie in its loader instead. */}
			<AppLayout.SidePanelRoot defaultOpen>
				{/* the framed demo narrows the mobile breakpoints; most apps keep the "lg" default */}
				<AssistantSidebarRoot panelMounted={!onAssistantPage} mobileBreakpoint="md">
					<AppLayout.Root className="fixed inset-0">
						<SkipToMainLink />
						<AppLayout.Workspace>
							<DemoNav pathname={pathname} onNavigate={navigate} />
							<AppLayout.Content
								className={cx(onAssistantPage && assistantViewTransitionClassName)}
							>
								{onAssistantPage && <AssistantPage />}
								{pathname === "/endpoints" && <DemoEndpointsPage />}
								{pathname === "/domains" && <DemoDomainsPage />}
							</AppLayout.Content>
							{!onAssistantPage && <AssistantPanel mobileBreakpoint="md" />}
						</AppLayout.Workspace>
					</AppLayout.Root>
				</AssistantSidebarRoot>
			</AppLayout.SidePanelRoot>
		</AssistantConversationProvider>
	);
}
