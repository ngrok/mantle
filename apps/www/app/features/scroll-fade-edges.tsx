import { cx } from "@ngrok/mantle/cx";

// Pre-scroll each demo box to its midpoint so the single faded edge — and the
// flush opposite edge, which is the whole point — is visible at rest without
// interacting. Ref callbacks run on the client during commit (before paint) and
// never on the server, so there's no SSR layout access.
function scrollToMiddleY(node: HTMLDivElement | null) {
	if (node != null) {
		node.scrollTop = (node.scrollHeight - node.clientHeight) / 2;
	}
}

function scrollToMiddleX(node: HTMLDivElement | null) {
	if (node != null) {
		node.scrollLeft = (node.scrollWidth - node.clientWidth) / 2;
	}
}

const verticalItems = Array.from({ length: 14 }, (_, index) => `Item ${index + 1}`);

const horizontalItems = [
	"Overview",
	"Endpoints",
	"Traffic Policy",
	"Domains",
	"TCP Addresses",
	"TLS Certificates",
	"Event Subscriptions",
	"API Keys",
];

function VerticalItems() {
	return (
		<ul className="flex flex-col gap-2 text-sm">
			{verticalItems.map((item) => (
				<li key={item} className="text-muted-foreground">
					{item}
				</li>
			))}
		</ul>
	);
}

function HorizontalItems() {
	return (
		<div className="flex w-max gap-2 text-sm">
			{horizontalItems.map((item) => (
				<span
					key={item}
					className="bg-accent text-muted-foreground whitespace-nowrap rounded-md px-3 py-1.5"
				>
					{item}
				</span>
			))}
		</div>
	);
}

const boxClassName = "scrollbar rounded-lg border border-card bg-card px-4 py-3";

/**
 * Live demo grid for the single-edge `scroll-fade-{t,b,l,r}` utilities. Each box
 * is pre-scrolled to its midpoint so the one faded edge stands out against the
 * flush opposite edge.
 *
 * @example
 * <ScrollFadeEdges />
 */
export function ScrollFadeEdges() {
	return (
		<div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
			<figure className="flex flex-col gap-2">
				<figcaption className="text-muted-foreground font-mono text-xs">scroll-fade-t</figcaption>
				<div
					ref={scrollToMiddleY}
					className={cx("scroll-fade-t h-44 overflow-y-auto", boxClassName)}
				>
					<VerticalItems />
				</div>
			</figure>

			<figure className="flex flex-col gap-2">
				<figcaption className="text-muted-foreground font-mono text-xs">scroll-fade-b</figcaption>
				<div
					ref={scrollToMiddleY}
					className={cx("scroll-fade-b h-44 overflow-y-auto", boxClassName)}
				>
					<VerticalItems />
				</div>
			</figure>

			<figure className="flex flex-col gap-2">
				<figcaption className="text-muted-foreground font-mono text-xs">scroll-fade-l</figcaption>
				<div ref={scrollToMiddleX} className={cx("scroll-fade-l overflow-x-auto", boxClassName)}>
					<HorizontalItems />
				</div>
			</figure>

			<figure className="flex flex-col gap-2">
				<figcaption className="text-muted-foreground font-mono text-xs">scroll-fade-r</figcaption>
				<div ref={scrollToMiddleX} className={cx("scroll-fade-r overflow-x-auto", boxClassName)}>
					<HorizontalItems />
				</div>
			</figure>
		</div>
	);
}
