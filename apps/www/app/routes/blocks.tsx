export const meta = () => {
	return [
		{ title: "Blocks - @ngrok/mantle" },
		{ name: "description", content: "Layout blocks and patterns built with mantle" },
	];
};

export default function BlocksPage() {
	return (
		<div>
			<h1 className="text-4xl font-medium text-strong sm:text-5xl font-family mb-4">Blocks</h1>
			<p className="mb-4 leading-relaxed text-pretty text-body">
				Layout blocks and patterns built with mantle. Coming soon.
			</p>
		</div>
	);
}
