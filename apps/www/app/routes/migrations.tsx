import { Link } from "react-router";
import {
	migrationDescriptions,
	migrationPages,
	migrationRoutes,
} from "~/components/navigation-data";

export const meta = () => {
	return [
		{ title: "Migrations - @ngrok/mantle" },
		{
			name: "description",
			content: "Step-by-step guides for migrating to new @ngrok/mantle APIs and behaviors",
		},
	];
};

export default function MigrationsPage() {
	return (
		<div>
			<h1 className="text-4xl font-medium text-strong sm:text-5xl font-family mb-4">Migrations</h1>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				Step-by-step guides for migrating existing code to new <code>@ngrok/mantle</code> APIs and
				behaviors. Each guide is written to be handed directly to a coding agent — append{" "}
				<code>.md</code> to any guide&rsquo;s URL to fetch its raw markdown.
			</p>
			<ul className="mt-8 max-w-3xl divide-y divide-gray-300 border-y border-gray-300">
				{migrationPages.map((page) => (
					<li key={page}>
						<Link
							to={migrationRoutes[page]}
							prefetch="intent"
							className="group block rounded py-4 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-focus-accent"
						>
							<span className="font-medium text-strong group-hover:text-accent-600">{page}</span>
							<p className="mt-1 text-sm leading-relaxed text-body">
								{migrationDescriptions[page]}
							</p>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
