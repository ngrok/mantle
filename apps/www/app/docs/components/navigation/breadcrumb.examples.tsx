import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Link, href } from "react-router";

import { PreviewCanvas } from "~/components/preview-canvas";

export function BreadcrumbExample() {
	return (
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Home</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Endpoints</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

export function BreadcrumbSlashSeparatorExample() {
	return (
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Home</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator>
					<span>/</span>
				</Breadcrumb.Separator>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Domains</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator>
					<span>/</span>
				</Breadcrumb.Separator>
				<Breadcrumb.Item>
					<Breadcrumb.Page>app.example.com</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

export function BreadcrumbPrefixCrumbExample() {
	return (
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Label>Settings</Breadcrumb.Label>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>General</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

export function BreadcrumbSkeletonExample() {
	return (
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="#">Apps</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Skeleton className="w-40" />
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

export function BreadcrumbOverflowExample() {
	return (
		<div className="border-card-muted bg-card flex w-full max-w-sm items-center gap-2 rounded-lg border px-4 py-3">
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="#">Acme Corp</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="#">Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="#">Cloud Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="#">Traffic Policy</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>ep_2h8xyz</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	);
}

export function BreadcrumbRouterLinkExample() {
	return (
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link asChild>
						<Link to={href("/")}>Home</Link>
					</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link asChild>
						<Link to={href("/components/navigation/anchor")}>Anchor</Link>
					</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>Breadcrumb</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

/** The first example on the Breadcrumb docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<BreadcrumbExample />
		</PreviewCanvas>
	);
}

/** The "Custom separator" example on the Breadcrumb docs page. */
export function CustomSeparatorExample() {
	return (
		<PreviewCanvas>
			<BreadcrumbSlashSeparatorExample />
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Breadcrumb docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<BreadcrumbRouterLinkExample />
		</PreviewCanvas>
	);
}

/** The "The prefix crumb" example on the Breadcrumb docs page. */
export function ThePrefixCrumbExample() {
	return (
		<PreviewCanvas>
			<BreadcrumbPrefixCrumbExample />
		</PreviewCanvas>
	);
}

/** The "The pending trail" example on the Breadcrumb docs page. */
export function ThePendingTrailExample() {
	return (
		<PreviewCanvas>
			<BreadcrumbSkeletonExample />
		</PreviewCanvas>
	);
}

/** The "Overflow" example on the Breadcrumb docs page. */
export function OverflowExample() {
	return (
		<PreviewCanvas>
			<BreadcrumbOverflowExample />
		</PreviewCanvas>
	);
}
