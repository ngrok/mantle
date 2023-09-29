import type { MetaFunction } from "@vercel/remix";

export const meta: MetaFunction = () => {
	return [
		{ title: "@ngrok/mantle" },
		{ name: "description", content: "mantle is ngrok’s UI library and design system" },
	];
};

export default function Page() {
	return (
		<div>
			<h1 className="text-5xl">Mantle</h1>
			<p className="mt-4 text-xl text-gray-600">
				Mantle is{" "}
				<a className="text-brand-primary-500" href="https://ngrok.com">
					ngrok
				</a>
				’s UI library and design system that powers its front-end.
			</p>

			<h2 id="variables" className="mt-8 text-3xl">
				Dependencies
			</h2>
			<p className="mt-3 text-gray-600">
				Mantle’s styling is written using{" "}
				<a className="text-brand-primary-500" href="https://tailwindcss.com">
					Tailwind
				</a>
				. Its{" "}
				<a className="text-brand-primary-500" href="https://react.dev">
					React
				</a>{" "}
				components are powered by{" "}
				<a className="text-brand-primary-500" href="https://ui.shadcn.com">
					shadcn/ui
				</a>
				’s markup and{" "}
				<a className="text-brand-primary-500" href="#">
					radix
				</a>
				’s primitives. Its documentation is built in{" "}
				<a className="text-brand-primary-500" href="https://remix.run/">
					Remix
				</a>
				.
			</p>
		</div>
	);
}
