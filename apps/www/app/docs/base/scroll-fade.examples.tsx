import { ScrollFadeEdges } from "~/features/scroll-fade-edges";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "Vertical (scroll-fade-y)" example on the Scroll Fade docs page. */
export function VerticalScrollFadeYExample() {
	return (
		<PreviewCanvas>
			<div className="w-64 overflow-hidden rounded-lg border border-card bg-card">
				<div className="scroll-fade-y scrollbar h-56 overflow-y-auto px-4 py-3">
					<ul className="flex flex-col gap-2 text-sm">
						{[
							"Getting Started",
							"Universal Gateway",
							"Endpoints",
							"Domains",
							"TCP Addresses",
							"TLS Certificates",
							"Kubernetes Operators",
							"Vaults & Secrets",
							"IP Policies",
							"Traffic Inspector",
							"Agents",
							"Team Members",
							"Service Users",
							"Authtokens",
						].map((label) => (
							<li key={label} className="text-muted-foreground">
								{label}
							</li>
						))}
					</ul>
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Horizontal (scroll-fade-x)" example on the Scroll Fade docs page. */
export function HorizontalScrollFadeXExample() {
	return (
		<PreviewCanvas>
			<div className="w-72 overflow-hidden rounded-lg border border-card bg-card">
				<div className="scroll-fade-x scrollbar overflow-x-auto p-3">
					<div className="flex w-max gap-2 text-sm">
						{[
							"Overview",
							"Endpoints",
							"Traffic Policy",
							"Domains",
							"TCP Addresses",
							"TLS Certificates",
							"Event Subscriptions",
							"API Keys",
						].map((label) => (
							<span
								key={label}
								className="bg-accent text-muted-foreground whitespace-nowrap rounded-md px-3 py-1.5"
							>
								{label}
							</span>
						))}
					</div>
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Single edge" example on the Scroll Fade docs page. */
export function SingleEdgeExample() {
	return (
		<PreviewCanvas>
			<ScrollFadeEdges />
		</PreviewCanvas>
	);
}
