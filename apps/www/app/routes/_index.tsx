import { Anchor } from "@ngrok/mantle/anchor";
import {
	CodeBlock,
	CodeBlockBody,
	CodeBlockCode,
	CodeBlockCopyButton,
	CodeBlockHeader,
	fmtCode,
} from "@ngrok/mantle/code-block";
import { InlineCode } from "@ngrok/mantle/inline-code";
import { Table, TableBody, TableCell, TableRow } from "@ngrok/mantle/table";
import type { HeadersFunction, MetaFunction } from "@remix-run/node";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";

export const meta: MetaFunction = () => {
	return [
		{ title: "@ngrok/mantle" },
		{ name: "description", content: "mantle is ngrok's UI library and design system" },
	];
};

export const headers: HeadersFunction = () => {
	return {
		"Cache-Control": "max-age=300, stale-while-revalidate=604800",
	};
};

export default function Page() {
	return (
		<div>
			<PageHeader id="mantle">Mantle</PageHeader>
			<p className="font-weight font-body text-body mt-4 text-xl">
				Mantle is <Anchor href="https://ngrok.com">ngrok</Anchor>
				&rsquo;s UI library and design system that powers its front-end.
			</p>

			<h2 id="overview" className="mt-8 text-3xl font-medium">
				Overview
			</h2>

			<h3 id="dependencies" className="mt-6 text-xl font-medium">
				Dependencies
			</h3>
			<p className="font-body text-body mt-3">
				Mantle&rsquo;s styling is composed using <Anchor href="https://tailwindcss.com">Tailwind</Anchor>. Its{" "}
				<Anchor href="https://react.dev">React</Anchor> components are inspired by{" "}
				<Anchor href="https://ui.shadcn.com">shadcn/ui</Anchor>
				&rsquo;s markup and <Anchor href="https://www.radix-ui.com">Radix</Anchor>
				&rsquo;s primitives. Its documentation is built in <Anchor href="https://remix.run/">Remix</Anchor>.
			</p>

			<h3 id="status" className="mt-8 text-xl font-medium">
				Status
			</h3>
			<p className="font-body text-body mt-3">
				Mantle is a work in progress that&rsquo;s currently adding components. It intends to replace new and existing
				ngrok user interfaces.
			</p>

			<p className="font-body text-body mt-3">
				Mantle is available in its alpha state on{" "}
				<Anchor href="https://www.npmjs.com/package/@ngrok/mantle">NPM</Anchor>. It is open source and available on{" "}
				<Anchor href="https://github.com/ngrok-oss/mantle">GitHub</Anchor>.
			</p>

			<h2 className="mt-12 text-3xl font-medium">Setup</h2>
			<p className="font-body text-body mt-3">
				Start by installing <InlineCode>@ngrok/mantle</InlineCode> with your preferred package manager:
			</p>
			<div className="border-card scrollbar mt-4 overflow-x-scroll rounded-lg border">
				<Table>
					<TableBody>
						<TableRow>
							<TableCell className="font-body">npm</TableCell>
							<TableCell>
								<CodeBlock>
									<CodeBlockBody>
										<CodeBlockCopyButton />
										<CodeBlockCode language="sh" value={fmtCode`npm install -E @ngrok/mantle`} />
									</CodeBlockBody>
								</CodeBlock>
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-body">yarn</TableCell>
							<TableCell>
								<CodeBlock>
									<CodeBlockBody>
										<CodeBlockCopyButton />
										<CodeBlockCode language="sh" value={fmtCode`yarn add -E @ngrok/mantle`} />
									</CodeBlockBody>
								</CodeBlock>
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-body">pnpm</TableCell>
							<TableCell>
								<CodeBlock>
									<CodeBlockBody>
										<CodeBlockCopyButton />
										<CodeBlockCode language="sh" value={fmtCode`pnpm add -E @ngrok/mantle`} />
									</CodeBlockBody>
								</CodeBlock>
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-body">bun</TableCell>
							<TableCell>
								<CodeBlock>
									<CodeBlockBody>
										<CodeBlockCopyButton />
										<CodeBlockCode language="sh" value={fmtCode`bun add -E @ngrok/mantle`} />
									</CodeBlockBody>
								</CodeBlock>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>

			<section>
				<h2 className="mt-8 text-xl font-medium">Tailwind Configuration</h2>
				<p className="font-body text-body mt-3">
					Then, add the <Anchor href="https://tailwindcss.com/docs/presets">tailwind preset</Anchor> and mantle content
					to your tailwind configuration:
				</p>
				<CodeBlock className="mt-4">
					<CodeBlockHeader>tailwind.config.ts</CodeBlockHeader>
					<CodeBlockBody>
						<CodeBlockCopyButton />
						<CodeBlockCode
							language="ts"
							value={fmtCode`
								import { createRequire } from "node:module";
								import { mantlePreset, resolveMantleContentGlob } from "@ngrok/mantle/tailwind-preset";
								import type { Config } from "tailwindcss";

								const require = createRequire(import.meta.url);

								export default {
									presets: [mantlePreset],
									content: [resolveMantleContentGlob(require), "./app/**/*.tsx"], // 👈 don't forget to swap out app content glob here!
									// ... the rest of your tailwind config!
								} satisfies Config;
							`}
						/>
					</CodeBlockBody>
				</CodeBlock>
			</section>

			<section>
				<h2 className="mt-8 text-xl font-medium">Application Scaffolding</h2>
				<p className="font-body text-body mt-3">
					In your application&rsquo;s entry/root, import the <InlineCode>mantle.css</InlineCode> file to apply the
					mantle styles:
				</p>
				<CodeBlock className="mt-4">
					<CodeBlockHeader>root.tsx</CodeBlockHeader>
					<CodeBlockBody>
						<CodeBlockCopyButton />
						<CodeBlockCode
							language="tsx"
							value={fmtCode`
							import { StrictMode } from "react";
							import { createRoot } from "react-dom/client";

							// 👇 add this import to your root file to apply mantle styles! 👇
							import "@ngrok/mantle/mantle.css";

							const container = window.document.getElementById("app");

							if (!container) {
								throw new Error("Something went wrong: cannot render application! Please refresh the page to try again.");
							}

							const root = createRoot(container);

							root.render(
								<StrictMode>
									<App />
								</StrictMode>,
							);
						`}
						/>
					</CodeBlockBody>
				</CodeBlock>
				<p className="font-body text-body mt-8">
					Next, you should add the <Link to="/components/theme-provider">Theme Provider</Link> to your application to
					provide the mantle theme to your components. You are now ready to use mantle components in your application!
				</p>
				<p className="font-body text-body mt-4">
					You are now ready to use mantle components in your application! For example, you can use the{" "}
					<Link to="/components/button">Button</Link>!
				</p>
			</section>
		</div>
	);
}
