import { Link, href } from "react-router";
import { DocIndexList } from "~/components/doc-index-list";
import { layoutDescriptions, layoutPages, layoutRoutes } from "~/components/navigation-data";

export const meta = () => {
	return [
		{ title: "Layouts - @ngrok/mantle" },
		{
			name: "description",
			content: "Published mantle primitives that own page and viewport structure",
		},
	];
};

export default function LayoutsPage() {
	return (
		<div>
			<h1 className="text-4xl font-medium text-strong sm:text-5xl mb-4">Layouts</h1>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				Published <code>@ngrok/mantle</code> primitives that own page and viewport structure: region
				skeletons, landmark wiring, and scroll architecture. A layout is the frame you put
				components in — it owns <em>where things go</em>, while a component owns an interaction or a
				widget. App state (routing, sessions, data) never enters a layout; it arrives as slotted
				JSX.
			</p>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				More residents are incubating in ngrok&rsquo;s apps and will graduate here once their APIs
				have survived real consumers. Two layout-family primitives are also published under
				components:{" "}
				<Link to={href("/components/primitives/main")} className="text-accent-600 hover:underline">
					Main
				</Link>{" "}
				and{" "}
				<Link
					to={href("/components/primitives/skip-to-main-link")}
					className="text-accent-600 hover:underline"
				>
					Skip to Main Link
				</Link>
				.
			</p>
			<div className="mt-8">
				<DocIndexList
					label="Layouts"
					items={layoutPages.map((page) => ({
						to: layoutRoutes[page],
						title: page,
						description: layoutDescriptions[page],
					}))}
				/>
			</div>
		</div>
	);
}
