import { AppLayout } from "@ngrok/mantle/app-layout";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button, IconButton } from "@ngrok/mantle/button";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { Fragment, useLayoutEffect, useRef, useState } from "react";

/**
 * The AppLayout shell on its own — no sidebar. A toggleable `Notice` strip
 * pinned above everything, a toolbar `Header`, and a `Body` page region that is
 * the only scroll container. Renders as an entire framed-preview document
 * (see preview-registry.ts), so it composes like a real app shell: pinned
 * with `fixed inset-0` and `AppLayout.Body` as the real `Main` landmark.
 */
export function AppLayoutDemo() {
	const [showNotice, setShowNotice] = useState(true);

	return (
		<AppLayout.Root className="fixed inset-0">
			<SkipToMainLink />
			<AppLayout.Notice>
				{showNotice && (
					<div className="text-on-filled flex items-center gap-2 bg-red-600 px-4 py-1 text-xs">
						<WarningCircleIcon weight="fill" className="shrink-0" />
						Scheduled maintenance in progress — the dashboard is read-only.
					</div>
				)}
			</AppLayout.Notice>
			<AppLayout.Workspace>
				<AppLayout.Content>
					<AppLayout.Header>
						<AppLayout.HeaderContent>
							<p className="text-strong text-sm font-medium">Endpoints</p>
						</AppLayout.HeaderContent>
						<AppLayout.HeaderActions>
							<Button
								type="button"
								appearance="outlined"
								intent="neutral"
								size="sm"
								onClick={() => setShowNotice((current) => !current)}
							>
								Toggle notice
							</Button>
						</AppLayout.HeaderActions>
					</AppLayout.Header>
					<AppLayout.Body>
						<div className="space-y-4 p-6">
							{Array.from({ length: 10 }, (_, index) => (
								<div key={index} className="border-card-muted rounded-lg border p-4">
									<p className="text-strong text-sm font-medium">Row {index + 1}</p>
									<p className="text-muted text-sm">
										Scroll happens inside this card with `overscroll-none` — the shell never moves
										and scroll never bounces the page.
									</p>
								</div>
							))}
						</div>
					</AppLayout.Body>
				</AppLayout.Content>
			</AppLayout.Workspace>
		</AppLayout.Root>
	);
}

/** Filler rows, so every demo page has enough content to scroll. */
function DemoRows({ count, label }: { count: number; label: string }) {
	return (
		<>
			{Array.from({ length: count }, (_, index) => (
				<div key={index} className="border-card-muted rounded-lg border p-4">
					<p className="text-strong text-sm font-medium">
						{label} {index + 1}
					</p>
				</div>
			))}
		</>
	);
}

/** The four page shapes documented under "Sizing a page to the card". */
const pageShapes = [
	{ id: "grow", label: "Grow and scroll" },
	{ id: "full-bleed", label: "Full bleed" },
	{ id: "contained", label: "Contained" },
	{ id: "fill", label: "Fill the card" },
] as const;

type PageShape = (typeof pageShapes)[number]["id"];

/**
 * The page a route renders inside `AppLayout.Body` for each documented shape.
 * Only the classes on the page's own root differ — the shell around it is
 * identical in all four cases, which is the whole point of the section.
 */
function DemoPage({ shape }: { shape: PageShape }) {
	if (shape === "full-bleed") {
		return (
			// nothing on the root: the tinted background runs edge to edge, and the
			// card clips it to its own rounded corners
			<div className="bg-emerald-600/10 min-h-full">
				<div className="space-y-3 p-6">
					<DemoRows count={8} label="Full-bleed row" />
				</div>
			</div>
		);
	}

	if (shape === "contained") {
		return (
			// mx-auto centers at the max width because AppLayout.Body is block
			// inside. A real dashboard page clamps at max-w-7xl, which is wider than
			// this preview — max-w-md keeps the centering visible at demo scale.
			<div className="mx-auto max-w-md space-y-3 p-6">
				<DemoRows count={8} label="Contained row" />
			</div>
		);
	}

	if (shape === "fill") {
		return (
			// h-full resolves against Body's definite height, so the status bar lands
			// on the card's bottom edge instead of below the fold
			<div className="flex h-full flex-col">
				<div className="border-card-muted flex shrink-0 items-center gap-3 border-b px-6 py-3">
					<p className="text-strong text-sm font-medium">Toolbar row</p>
				</div>
				<div className="relative min-h-0 flex-1 overflow-y-auto">
					<div className="space-y-3 p-6">
						<DemoRows count={8} label="Editor row" />
					</div>
				</div>
				<div className="border-card-muted text-muted flex shrink-0 items-center gap-2 border-t px-6 py-2 text-xs">
					<CheckCircleIcon weight="fill" className="fill-success-600 shrink-0" />
					Status bar, on the card&rsquo;s bottom edge
				</div>
			</div>
		);
	}

	// grow and scroll — the default, and the shape that needs nothing at all
	return (
		<div className="space-y-3 p-6">
			<DemoRows count={12} label="Row" />
		</div>
	);
}

/** The crumbs the header-slots example grows through, outermost first. */
const headerSlotsTrail = [
	"Endpoints",
	"https://forward-labels.test",
	"Traffic Policy",
	"Rules",
	"Rate limit",
	"Edit",
] as const;

/**
 * The header's three slots on their own. Grow the trail and watch it scroll
 * inside `AppLayout.HeaderContent` while `AppLayout.HeaderStart` and
 * `AppLayout.HeaderActions` hold the row's two ends at their own width. The
 * shell is embedded and has no sidebar, so a back link takes the start slot
 * that `Sidebar.Trigger` takes in an app shell.
 */
export function AppLayoutHeaderSlotsExample() {
	const [depth, setDepth] = useState(2);
	const crumbs = headerSlotsTrail.slice(0, depth);

	return (
		<AppLayout.Root className="rounded-lg">
			<AppLayout.Workspace>
				<AppLayout.Content>
					<AppLayout.Header>
						<AppLayout.HeaderStart>
							<IconButton
								asChild
								appearance="ghost"
								intent="neutral"
								size="sm"
								icon={<ArrowLeftIcon />}
								label="Back to endpoints"
							>
								<a href="/endpoints" onClick={(event) => event.preventDefault()}>
									Back
								</a>
							</IconButton>
						</AppLayout.HeaderStart>
						<AppLayout.HeaderContent>
							<Breadcrumb.Root>
								<Breadcrumb.List>
									{crumbs.map((crumb, index) => (
										<Fragment key={crumb}>
											{index > 0 && <Breadcrumb.Separator />}
											<Breadcrumb.Item>
												{index === crumbs.length - 1 ? (
													<Breadcrumb.Page>{crumb}</Breadcrumb.Page>
												) : (
													<Breadcrumb.Link href="#">{crumb}</Breadcrumb.Link>
												)}
											</Breadcrumb.Item>
										</Fragment>
									))}
								</Breadcrumb.List>
							</Breadcrumb.Root>
						</AppLayout.HeaderContent>
						<AppLayout.HeaderActions>
							<IconButton
								type="button"
								appearance="ghost"
								intent="neutral"
								size="sm"
								icon={<CopyIcon />}
								label="Copy endpoint URL"
							/>
							<IconButton
								type="button"
								appearance="ghost"
								intent="neutral"
								size="sm"
								icon={<TrashIcon />}
								label="Delete endpoint"
							/>
						</AppLayout.HeaderActions>
					</AppLayout.Header>
					{/* Why asChild: the docs page already owns the main landmark. */}
					<AppLayout.Body asChild>
						<div>
							<div className="flex flex-wrap items-center gap-2 p-6">
								<Button
									type="button"
									appearance="outlined"
									intent="neutral"
									size="sm"
									disabled={depth >= headerSlotsTrail.length}
									onClick={() => setDepth((current) => current + 1)}
								>
									Add a crumb
								</Button>
								<Button
									type="button"
									appearance="ghost"
									intent="neutral"
									size="sm"
									onClick={() => setDepth(2)}
								>
									Reset
								</Button>
							</div>
						</div>
					</AppLayout.Body>
				</AppLayout.Content>
			</AppLayout.Workspace>
		</AppLayout.Root>
	);
}

/**
 * The four page shapes from the docs' "Sizing a page to the card", switchable
 * live: the shell markup never changes, only the classes on the page's own
 * root. Embedded rather than pinned with `fixed inset-0`, so it can sit inside
 * the docs page — `AppLayout.Root` fills its nearest sized ancestor — and
 * `AppLayout.Body` renders a `<div>` through `asChild` because the page already
 * owns the `main` landmark.
 *
 * @example
 * ```tsx
 * <CodeExample.Preview className="p-0 md:p-0">
 *   <AppLayoutPageShapesExample />
 * </CodeExample.Preview>
 * ```
 */
export function AppLayoutPageShapesExample() {
	const [shape, setShape] = useState<PageShape>("grow");

	return (
		<div className="h-full w-full">
			<AppLayout.Root className="rounded-lg">
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Header>
							{pageShapes.map((candidate) => (
								<Button
									key={candidate.id}
									type="button"
									size="sm"
									appearance={candidate.id === shape ? "filled" : "outlined"}
									intent={candidate.id === shape ? "accent" : "neutral"}
									onClick={() => setShape(candidate.id)}
								>
									{candidate.label}
								</Button>
							))}
						</AppLayout.Header>
						{/* Why asChild: the docs page already owns the main landmark. */}
						<AppLayout.Body asChild>
							<div>
								<DemoPage shape={shape} />
							</div>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</div>
	);
}

/**
 * The three flex rules that pin a bar to the bottom of the card, live and at
 * small scale: a `shrink-0` toolbar, a `min-h-0 flex-1` region that absorbs the
 * slack and scrolls, and a `shrink-0` bar. Grow the policy with **Add rules** —
 * the bar holds the card's bottom edge however tall the content gets, and the
 * page owns the bar, which is why the shell ships no `Footer` part.
 *
 * @example
 * ```tsx
 * <CodeExample.Preview className="p-0 md:p-0">
 *   <AppLayoutPinnedFooterExample />
 * </CodeExample.Preview>
 * ```
 */
export function AppLayoutPinnedFooterExample() {
	const [ruleCount, setRuleCount] = useState(4);

	return (
		<div className="h-full w-full">
			<AppLayout.Root className="rounded-lg">
				<AppLayout.Workspace>
					<AppLayout.Content>
						{/* Why asChild: the docs page already owns the main landmark. */}
						<AppLayout.Body asChild>
							<div>
								{/* the page's own root — this is what "pinned to the bottom of the
							    card" means, and it is all three rules at once */}
								<div className="flex h-full flex-col">
									{/* anything that must keep its height: shrink-0 */}
									<div className="border-card-muted flex shrink-0 items-center gap-3 border-b px-6 py-3">
										<p className="text-strong text-sm font-medium">Traffic policy</p>
										<Button
											type="button"
											appearance="outlined"
											intent="neutral"
											size="sm"
											className="ml-auto"
											onClick={() => setRuleCount((current) => (current >= 16 ? 4 : current + 6))}
										>
											{ruleCount >= 16 ? "Reset policy" : "Add rules"}
										</Button>
									</div>
									{/* the region that absorbs the slack and scrolls: min-h-0 flex-1 */}
									<div className="relative min-h-0 flex-1 overflow-y-auto">
										<div className="space-y-3 p-6">
											<DemoRows count={ruleCount} label="Rule" />
										</div>
									</div>
									{/* the footer, on the card's bottom edge: shrink-0 */}
									<div className="border-card-muted text-muted flex shrink-0 items-center gap-2 border-t px-6 py-2 text-xs">
										<CheckCircleIcon weight="fill" className="fill-success-600 shrink-0" />
										Traffic policy is valid — {ruleCount} rules
									</div>
								</div>
							</div>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</div>
	);
}

/** The two fake destinations the scroll-reset demo navigates between. */
const scrollResetRoutes = [
	{ label: "Endpoints", path: "/endpoints" },
	{ label: "Domains", path: "/domains" },
] as const;

/**
 * Resetting the card's scroll on navigation. `AppLayout.Body` is the scroll
 * container, not the document, so React Router's `ScrollRestoration` has
 * nothing to restore — a ref on the scrollport and a layout effect keyed on the
 * navigation do the job instead.
 *
 * Navigation here is a **fake router**: the demo keeps a local `pathname` so it
 * can be embedded in the docs page (a real shell keys the effect on
 * `useLocation().key`, so a back/forward entry counts as a navigation too).
 * Scroll a page down, then switch pages — the card returns to the top.
 *
 * @example
 * ```tsx
 * <CodeExample.Preview className="p-0 md:p-0">
 *   <AppLayoutScrollResetExample />
 * </CodeExample.Preview>
 * ```
 */
export function AppLayoutScrollResetExample() {
	const scrollportRef = useRef<HTMLDivElement | null>(null);
	const [pathname, setPathname] = useState("/endpoints");
	const current =
		scrollResetRoutes.find((route) => route.path === pathname) ?? scrollResetRoutes[0];

	// Reset the card's scroll on every navigation. A real shell depends on
	// `useLocation().key` here rather than on this demo's local pathname.
	useLayoutEffect(() => {
		scrollportRef.current?.scrollTo({ top: 0 });
	}, [pathname]);

	return (
		<div className="h-full w-full">
			<AppLayout.Root className="rounded-lg">
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Header>
							{scrollResetRoutes.map((route) => (
								<Button
									key={route.path}
									type="button"
									size="sm"
									appearance={route.path === pathname ? "filled" : "outlined"}
									intent={route.path === pathname ? "accent" : "neutral"}
									onClick={() => setPathname(route.path)}
								>
									{route.label}
								</Button>
							))}
							<p className="text-muted ml-auto text-xs">Scroll down, then switch pages</p>
						</AppLayout.Header>
						{/* Why asChild: the docs page already owns the main landmark. */}
						<AppLayout.Body asChild ref={scrollportRef}>
							<div>
								<div className="space-y-3 p-6">
									<DemoRows count={12} label={`${current.label} row`} />
								</div>
							</div>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</div>
	);
}

/**
 * `AppLayout.Body` swapping its default `Main` landmark for a consumer element
 * via `asChild`, here a `<section>`. A shell embedded in a page that already
 * owns the `main` landmark composes a plain `<div>` the same way.
 */
export function AppLayoutPolymorphismDemo() {
	return (
		<div className="h-full w-full">
			<AppLayout.Root className="rounded-lg">
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Body asChild>
							<section aria-label="Demo content">
								<p className="text-muted p-6 text-sm">
									This scroll region is a `&lt;section&gt;` — inspect it to see the merged classes
									and `data-slot=&quot;app-layout-body&quot;`.
								</p>
							</section>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>
		</div>
	);
}
