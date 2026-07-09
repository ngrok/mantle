import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";
import { NavLink } from "./nav-link";
import {
	basePages,
	baseRoutes,
	hooksRoute,
	previewComponents,
	previewComponentsRouteLookup,
	prodReadyComponents,
	prodReadyComponentRouteLookup,
	utilsPages,
	utilsRoutes,
	welcomePages,
	welcomeRoutes,
} from "./navigation-data";

/** Sidebar navigation for the docs section. */
export function DocsNavigation({ className, style }: WithStyleProps) {
	return (
		<nav className={cx("text-sm pb-16", className)} style={style}>
			<ul className="flex flex-col">
				<li className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">Welcome</li>

				{welcomePages.map((page) => (
					<li key={page}>
						<NavLink to={welcomeRoutes[page]} prefetch="intent">
							{page}
						</NavLink>
					</li>
				))}

				<li className="mt-6 text-xs font-medium uppercase tracking-wider font-mono">Base</li>

				<ul className="mt-2">
					{basePages.map((page) => (
						<li key={page}>
							<NavLink to={baseRoutes[page]} prefetch="intent">
								{page}
							</NavLink>
						</li>
					))}
				</ul>

				<li className="mt-6 text-xs font-medium uppercase tracking-wider font-mono">Components</li>
				<ul className="mt-2">
					{prodReadyComponents.map((component) => (
						<li key={component}>
							<NavLink to={prodReadyComponentRouteLookup[component]} prefetch="intent">
								{component}
							</NavLink>
						</li>
					))}
				</ul>

				<li className="mt-6 text-xs font-medium uppercase tracking-wider font-mono">
					Preview Components
				</li>
				<ul className="mt-2">
					{previewComponents.map((component) => (
						<li key={component}>
							<NavLink to={previewComponentsRouteLookup[component]} prefetch="intent">
								{component}
							</NavLink>
						</li>
					))}
				</ul>

				<li className="mt-6 text-xs font-medium uppercase tracking-wider font-mono">Hooks</li>
				<ul className="mt-2">
					<li>
						<NavLink to={hooksRoute} prefetch="intent">
							Hooks
						</NavLink>
					</li>
				</ul>

				<li className="mt-6 text-xs font-medium uppercase tracking-wider font-mono">Utils</li>
				<ul className="mt-2">
					{utilsPages.map((page) => (
						<li key={page}>
							<NavLink to={utilsRoutes[page]} prefetch="intent">
								{page}
							</NavLink>
						</li>
					))}
				</ul>
			</ul>
		</nav>
	);
}
