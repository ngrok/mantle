import { AppLayout } from "@ngrok/mantle/app-layout";
import { Badge } from "@ngrok/mantle/badge";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button, ButtonGroup, IconButton } from "@ngrok/mantle/button";
import { Main } from "@ngrok/mantle/main";
import { Separator } from "@ngrok/mantle/separator";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { Tabs } from "@ngrok/mantle/tabs";
import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { DownloadSimpleIcon } from "@phosphor-icons/react/DownloadSimple";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/GlobeHemisphereWest";
import { GraphIcon } from "@phosphor-icons/react/Graph";
import { ShieldCheckIcon } from "@phosphor-icons/react/ShieldCheck";
import { useState } from "react";

/**
 * A traffic-policy-style editor page: the page shape that used to be impossible
 * to build against this shell without rediscovering a two-part CSS invariant.
 *
 * It exercises three things at once that each used to fail silently:
 *
 * 1. **Filling the card exactly.** The route root is `flex h-full flex-col`, and
 *    `h-full` now resolves against `AppLayout.Body`'s definite height instead of
 *    overflowing the card by the toolbar's height.
 * 2. **A bottom-pinned status bar.** The last child is `shrink-0`, so it sits on
 *    the card's bottom edge instead of hanging below the fold.
 * 3. **Floating actions over the editor.** The editor region is `relative`, so
 *    the absolutely-positioned button group resolves against it rather than
 *    escaping to `AppLayout.Root` and painting across the sidebar rail.
 *
 * The "editor" is a static code block — the point is the geometry, not a real
 * editor. Grow the fake policy with the toolbar's button to watch the editor
 * scroll while the toolbar and status bar stay put.
 *
 * @example
 * ```tsx
 * previewExamples["app-layout-editor"] = {
 *   title: "Editor page demo",
 *   Component: AppLayoutEditorDemo,
 * };
 * ```
 */
export function AppLayoutEditorDemo() {
	const [ruleCount, setRuleCount] = useState(3);

	return (
		// the framed demo narrows the mobile breakpoint; most apps keep the "lg" default
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Workspace>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Body>
							<Sidebar.Group>
								<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
								<Sidebar.List>
									<Sidebar.Item>
										<Sidebar.Tooltip label="Endpoints">
											<Sidebar.ItemButton current>
												<GraphIcon />
												Endpoints
											</Sidebar.ItemButton>
										</Sidebar.Tooltip>
									</Sidebar.Item>
									<Sidebar.Item>
										<Sidebar.Tooltip label="Traffic Policy">
											<Sidebar.ItemButton>
												<ShieldCheckIcon />
												Traffic Policy
											</Sidebar.ItemButton>
										</Sidebar.Tooltip>
									</Sidebar.Item>
								</Sidebar.List>
							</Sidebar.Group>
						</Sidebar.Body>
					</Sidebar.Nav>
					<AppLayout.Content>
						<AppLayout.Header>
							<Sidebar.Trigger />
							<Breadcrumb.Root>
								<Breadcrumb.List>
									<Breadcrumb.Item>
										<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
									</Breadcrumb.Item>
									<Breadcrumb.Separator />
									<Breadcrumb.Item>
										<Breadcrumb.Page>Traffic Policy</Breadcrumb.Page>
									</Breadcrumb.Item>
								</Breadcrumb.List>
							</Breadcrumb.Root>
						</AppLayout.Header>
						<AppLayout.Body asChild>
							<Main>
								{/* The page fills the card: flex column, h-full. */}
								<div className="flex h-full flex-col">
									{/* Toolbar row — shrink-0 so it never gives up height */}
									<div className="border-card-muted flex shrink-0 items-center gap-3 border-b px-6 py-3">
										<p className="text-strong text-sm font-medium">Policy editor</p>
										<Badge appearance="muted" color="neutral">
											YAML
										</Badge>
										<Button
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											className="ml-auto"
											onClick={() => setRuleCount((current) => (current >= 12 ? 3 : current + 3))}
										>
											{ruleCount >= 12 ? "Reset policy" : "Add rules"}
										</Button>
									</div>

									{/*
									 * The editor region: `relative` contains the floating actions,
									 * `min-h-0 flex-1` lets it absorb the leftover height and scroll
									 * internally instead of pushing the status bar off the card.
									 */}
									<div className="relative min-h-0 flex-1 overflow-y-auto">
										<div className="absolute top-2 right-6 z-10">
											<ButtonGroup appearance="panel">
												<IconButton
													type="button"
													appearance="ghost"
													intent="neutral"
													icon={<DownloadSimpleIcon />}
													label="Download policy"
												/>
												<Separator orientation="vertical" className="min-h-5" />
												<IconButton
													type="button"
													appearance="ghost"
													intent="neutral"
													icon={<CopyIcon />}
													label="Copy policy"
												/>
											</ButtonGroup>
										</div>
										<pre className="text-body p-6 font-mono text-xs leading-6">
											{fakePolicy(ruleCount)}
										</pre>
									</div>

									{/* Status bar — shrink-0, so it pins to the card's bottom edge */}
									<div className="border-card-muted text-muted flex shrink-0 items-center gap-2 border-t px-6 py-2 text-xs">
										<CheckCircleIcon weight="fill" className="fill-success-600 shrink-0" />
										Policy is valid — {ruleCount} rules
									</div>
								</div>
							</Main>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}

/**
 * The same bottom-pinned bar, but two route levels deep — the shape of ngrok's
 * endpoint detail route, where a parent route owns the title and tabs and a
 * child route owns an editor with a validity bar beneath it.
 *
 * This is the case worth having live, because the invariant has to hold at
 * *every* level: each ancestor hands the next a definite height via
 * `min-h-0 flex-1`, and a single missing `min-h-0` makes everything below it
 * overflow the card instead of scrolling — pushing the pinned bar below the fold
 * while still looking "pinned" in the markup.
 *
 * @example
 * ```tsx
 * previewExamples["app-layout-pinned-footer"] = {
 *   title: "Pinned footer demo",
 *   Component: AppLayoutPinnedFooterDemo,
 * };
 * ```
 */
export function AppLayoutPinnedFooterDemo() {
	const [ruleCount, setRuleCount] = useState(3);

	return (
		// the framed demo narrows the mobile breakpoint; most apps keep the "lg" default
		<Sidebar.Root mobileBreakpoint="md">
			<AppLayout.Root className="fixed inset-0">
				<SkipToMainLink />
				<AppLayout.Workspace>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Body>
							<Sidebar.Group>
								<Sidebar.GroupLabel>Gateway</Sidebar.GroupLabel>
								<Sidebar.List>
									<Sidebar.Item>
										<Sidebar.Tooltip label="Endpoints">
											<Sidebar.ItemButton current>
												<GraphIcon />
												Endpoints
											</Sidebar.ItemButton>
										</Sidebar.Tooltip>
									</Sidebar.Item>
									<Sidebar.Item>
										<Sidebar.Tooltip label="Domains">
											<Sidebar.ItemButton>
												<GlobeHemisphereWestIcon />
												Domains
											</Sidebar.ItemButton>
										</Sidebar.Tooltip>
									</Sidebar.Item>
								</Sidebar.List>
							</Sidebar.Group>
						</Sidebar.Body>
					</Sidebar.Nav>
					<AppLayout.Content>
						<AppLayout.Header>
							<Sidebar.Trigger />
						</AppLayout.Header>
						<AppLayout.Body asChild>
							<Main>
								{/*
								 * Level 1 — the "parent route": owns the endpoint title, its
								 * badges, and the tab row. h-full fills the card; gap-0 because
								 * the rows below manage their own spacing.
								 */}
								<Tabs.Root defaultValue="traffic-policy" className="h-full gap-0">
									<div className="shrink-0 px-6 pt-4">
										<div className="mb-1 flex flex-wrap items-center gap-1">
											<h1 className="text-strong text-xl font-medium break-all">
												https://forward-labels.test
											</h1>
										</div>
										<div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
											<Badge appearance="muted" color="info">
												HTTPS
											</Badge>
											<Badge appearance="muted" color="success">
												Public
											</Badge>
											<Badge appearance="muted" color="accent">
												Cloud
											</Badge>
											<Badge appearance="muted" color="warning">
												Traffic Policy
											</Badge>
											<span className="text-muted text-xs">Last updated 2mo ago</span>
										</div>
										<Tabs.List>
											<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
											<Tabs.Trigger value="traffic-policy">Traffic Policy</Tabs.Trigger>
											<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
										</Tabs.List>
									</div>

									{/*
									 * min-h-0 flex-1 is what hands the child route a definite
									 * height. Drop the min-h-0 and the editor below stops
									 * scrolling and shoves the validity bar past the card's edge.
									 */}
									<Tabs.Content value="traffic-policy" className="min-h-0 flex-1">
										{/* Level 2 — the "child route": toolbar, editor, validity bar */}
										<div className="flex h-full flex-col">
											<div className="border-card-muted flex shrink-0 items-center gap-3 border-y px-6 py-3">
												<Badge appearance="muted" color="neutral">
													YAML
												</Badge>
												<Button
													type="button"
													appearance="outlined"
													intent="neutral"
													size="sm"
													className="ml-auto"
													onClick={() =>
														setRuleCount((current) => (current >= 12 ? 3 : current + 3))
													}
												>
													{ruleCount >= 12 ? "Reset policy" : "Add rules"}
												</Button>
												<Button type="button" appearance="filled" intent="accent" size="sm">
													Save
												</Button>
											</div>
											<div className="min-h-0 flex-1 overflow-y-auto">
												<pre className="text-body p-6 font-mono text-xs leading-6">
													{fakePolicy(ruleCount)}
												</pre>
											</div>
											<div className="border-card-muted text-muted flex shrink-0 items-center gap-2 border-t px-6 py-2 text-xs">
												<CheckCircleIcon weight="fill" className="fill-success-600 shrink-0" />
												Traffic policy is valid
											</div>
										</div>
									</Tabs.Content>

									<Tabs.Content value="overview" className="min-h-0 flex-1">
										<p className="text-muted p-6 text-sm">
											Switch back to <strong>Traffic Policy</strong> — the validity bar stays on the
											card&rsquo;s bottom edge however tall the policy gets.
										</p>
									</Tabs.Content>
									<Tabs.Content value="settings" className="min-h-0 flex-1">
										<p className="text-muted p-6 text-sm">Settings would render here.</p>
									</Tabs.Content>
								</Tabs.Root>
							</Main>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</Sidebar.Root>
	);
}

/**
 * Builds a plausible-looking traffic policy document of `ruleCount` rules, so
 * the demo can grow past the editor's height on demand.
 */
function fakePolicy(ruleCount: number): string {
	const rules = Array.from({ length: ruleCount }, (_, index) => {
		const ordinal = index + 1;
		return [
			`  - expressions:`,
			`      - "req.url.path.startsWith('/api/v${ordinal}')"`,
			`    actions:`,
			`      - type: rate-limit`,
			`        config:`,
			`          name: api-v${ordinal}`,
			`          capacity: ${ordinal * 100}`,
			`          rate: 60s`,
		].join("\n");
	});

	return ["on_http_request:", ...rules].join("\n");
}
