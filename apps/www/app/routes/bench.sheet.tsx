import { Button } from "@ngrok/mantle/button";
import { Sheet } from "@ngrok/mantle/sheet";
import { useLocation } from "react-router";

/**
 * The sheet open benchmark page, a chrome-less document that `bench/sheet.ts`
 * loads: `/bench/sheet?impl=mounted`. It renders a mobile navigation sheet
 * that holds about 150 elements, which mounts on open (`impl=default`) or
 * stays mounted and server-rendered (`impl=mounted`, `forceMount`), so the
 * driver can time the tap that opens it.
 */
export function meta() {
	return [
		{ title: "Sheet open benchmark - @ngrok/mantle" },
		// A benchmark fixture is not a page to index.
		{ name: "robots", content: "noindex, nofollow" },
	];
}

/** Six sections of five links, like a marketing site's mobile navigation. */
const sections = ["Product", "Solutions", "Developers", "Resources", "Pricing", "Company"].map(
	(section) => ({
		section,
		links: ["Overview", "Gateway", "Agents", "Security", "Observability"].map((link) => ({
			href: `#${section.toLowerCase()}-${link.toLowerCase()}`,
			label: `${section} ${link}`,
			description: `Read about ${link.toLowerCase()} for ${section.toLowerCase()} teams.`,
		})),
	}),
);

function Navigation() {
	return (
		<nav aria-label="Main">
			{sections.map(({ section, links }) => (
				<section key={section} className="border-card-muted border-b py-3">
					<h3 className="text-muted px-2 text-xs font-medium uppercase">{section}</h3>
					<ul>
						{links.map((link) => (
							<li key={link.href}>
								<a
									href={link.href}
									className="hover:bg-neutral-500/10 flex flex-col rounded-md px-2 py-1.5"
								>
									<span className="text-strong text-sm font-medium">{link.label}</span>
									<span className="text-muted text-xs">{link.description}</span>
								</a>
							</li>
						))}
					</ul>
				</section>
			))}
		</nav>
	);
}

export default function SheetBenchPage() {
	const mounted = new URLSearchParams(useLocation().search).get("impl") === "mounted";
	return (
		<div className="p-4">
			<Sheet.Root>
				<Sheet.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral" data-bench-trigger>
						Menu
					</Button>
				</Sheet.Trigger>
				<Sheet.Content side="left" forceMount={mounted || undefined}>
					<Sheet.Header>
						<Sheet.TitleGroup>
							<Sheet.Title>Menu</Sheet.Title>
							<Sheet.Actions>
								<Sheet.CloseIconButton />
							</Sheet.Actions>
						</Sheet.TitleGroup>
					</Sheet.Header>
					<Sheet.Body>
						<Navigation />
					</Sheet.Body>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	);
}
