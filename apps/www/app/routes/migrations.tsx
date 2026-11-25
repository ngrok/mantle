import { MigrationsList } from "~/features/migrations-list";

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
			<h1 className="text-4xl font-medium text-strong sm:text-5xl mb-4">Migrations</h1>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				Step-by-step guides for migrating existing code to new{" "}
				<code translate="no">@ngrok/mantle</code> APIs and behaviors. Each guide is written to be
				handed directly to a coding agent. Append <code translate="no">.md</code> to any
				guide&rsquo;s URL to fetch its raw markdown.
			</p>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				Each guide gets a number when it ships, and the list shows the newest guide first. A guide
				that has not shipped yet shows Unreleased.
			</p>
			<MigrationsList />
		</div>
	);
}
