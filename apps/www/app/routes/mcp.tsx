import { Anchor } from "@ngrok/mantle/anchor";
import { Code } from "@ngrok/mantle/code";
import { CodeBlock, mantleCode } from "@ngrok/mantle/code-block";
import { Main } from "@ngrok/mantle/main";
import { data, href, Link } from "react-router";
import { DocsNavigation } from "~/components/docs-navigation";
import { PageContainer } from "~/components/page-container";
import { MobileNavigation } from "~/components/page-layout";
import { canonicalHref } from "~/utilities/canonical-origin";
import { mcpFlags } from "~/utilities/mcp/flags.server";

const title = "Connect your agent to mantle";
const description =
	"Add the mantle MCP server to Claude, Codex, Cursor, or VS Code. Your agent reads the mantle API of the version you installed, checks its code, and previews it.";

export function meta() {
	const url = canonicalHref(href("/mcp"));
	const pageTitle = `${title} - @ngrok/mantle`;
	return [
		{ title: pageTitle },
		{ name: "description", content: description },
		{ property: "og:title", content: pageTitle },
		{ name: "twitter:title", content: pageTitle },
		{ property: "og:description", content: description },
		{ name: "twitter:description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: url },
		{ name: "og:url", property: "og:url", content: url },
		{ name: "twitter:url", content: url },
	];
}

/**
 * The setup page answers 404 while the `MANTLE_MCP` flag is off, as the
 * server does. `server.ts` sends each MCP request to the server, so only a
 * browser gets here.
 */
export function loader() {
	if (!mcpFlags().enabled) {
		throw data(null, { status: 404 });
	}
	return null;
}

/** The setup page of the MCP server, for a browser at `/mcp`. */
export default function McpSetupPage() {
	return (
		<>
			<PageContainer>
				<Main className="mx-auto max-w-3xl space-y-16 pb-16 sm:px-8">
					<header>
						<h1 className="text-strong text-4xl font-medium sm:text-5xl">{title}</h1>
						<p className="text-body mt-5 text-lg leading-relaxed text-pretty">
							This URL is an MCP server. Add it to your agent, and the agent reads the API of the
							mantle version you installed instead of guessing from its training data. It has no
							sign-in, and it never stores your code.
						</p>
						<CodeBlock.Root className="mt-8">
							<CodeBlock.Body>
								<CodeBlock.CopyButton label="Copy URL" />
								<CodeBlock.Code
									value={mantleCode("text", {
										showLineNumbers: false,
									})`https://mantle.ngrok.com/mcp`}
								/>
							</CodeBlock.Body>
						</CodeBlock.Root>
					</header>

					<section aria-labelledby="setup-title">
						<h2 id="setup-title" className="text-strong text-2xl font-medium">
							Add it to your agent
						</h2>
						<p className="text-body mt-2 leading-relaxed text-pretty">
							Run the command for your agent, or add the config. In Claude, open{" "}
							<strong>Settings</strong> → <strong>Connectors</strong>, click{" "}
							<strong>Add custom connector</strong>, and paste the URL.
						</p>
						<CodeBlock.Root defaultTab="claude-code" className="mt-6">
							<CodeBlock.Header>
								<CodeBlock.TabList>
									<CodeBlock.TabTrigger value="claude-code">Claude Code</CodeBlock.TabTrigger>
									<CodeBlock.TabTrigger value="codex">Codex</CodeBlock.TabTrigger>
									<CodeBlock.TabTrigger value="cursor">Cursor</CodeBlock.TabTrigger>
									<CodeBlock.TabTrigger value="vscode">VS Code</CodeBlock.TabTrigger>
								</CodeBlock.TabList>
							</CodeBlock.Header>
							<CodeBlock.Body>
								<CodeBlock.CopyButton />
								<CodeBlock.TabContent value="claude-code">
									<CodeBlock.Code
										value={mantleCode(
											"sh",
										)`claude mcp add --transport http mantle https://mantle.ngrok.com/mcp`}
									/>
								</CodeBlock.TabContent>
								<CodeBlock.TabContent value="codex">
									<CodeBlock.Code
										value={mantleCode(
											"sh",
										)`codex mcp add mantle --url https://mantle.ngrok.com/mcp`}
									/>
								</CodeBlock.TabContent>
								<CodeBlock.TabContent value="cursor">
									{/* Cursor reads this from ~/.cursor/mcp.json, or from .cursor/mcp.json in a project. */}
									<CodeBlock.Code
										value={mantleCode("json")`{
	"mcpServers": {
		"mantle": { "url": "https://mantle.ngrok.com/mcp" }
	}
}`}
									/>
								</CodeBlock.TabContent>
								<CodeBlock.TabContent value="vscode">
									<CodeBlock.Code
										value={mantleCode(
											"sh",
										)`code --add-mcp '{"name":"mantle","type":"http","url":"https://mantle.ngrok.com/mcp"}'`}
									/>
								</CodeBlock.TabContent>
							</CodeBlock.Body>
						</CodeBlock.Root>
						<p className="text-body mt-4 leading-relaxed text-pretty">
							To give everyone on a repo the server, commit it to the project config.{" "}
							<Anchor asChild>
								<Link to={href("/for-ai-agents")}>For AI Agents</Link>
							</Anchor>{" "}
							has the config file of each client.
						</p>
					</section>

					<section aria-labelledby="tools-title">
						<h2 id="tools-title" className="text-strong text-2xl font-medium">
							What your agent can call
						</h2>
						<p className="text-body mt-2 leading-relaxed text-pretty">
							The server tells the agent when to call each tool, so you don&apos;t have to.
						</p>
						<ul className="text-body mt-4 list-disc space-y-3 pl-5 leading-relaxed">
							<li>
								<Code>find</Code> ranks components, hooks, utilities, and docs pages for an intent,
								such as &ldquo;confirm before delete&rdquo;, or a name, such as &ldquo;modal&rdquo;.
							</li>
							<li>
								<Code>get</Code> returns the import, the examples, and the prop contract of one
								part.
							</li>
							<li>
								<Code>read_docs</Code> returns a docs page as Markdown.
							</li>
							<li>
								<Code>check</Code> checks one TSX file for wrong imports, other UI libraries, and
								class names built by hand.
							</li>
							<li>
								<Code>preview</Code> renders one TSX file in a sandbox. In Claude, ChatGPT, and VS
								Code, the prototype shows in the conversation.
							</li>
							<li>
								<Code>migrate</Code> lists the migration guides and codemods between two versions.
							</li>
							<li>
								<Code>report_gap</Code> tells the mantle team that mantle has no part for a need.
							</li>
						</ul>
					</section>

					<section aria-labelledby="prompts-title">
						<h2 id="prompts-title" className="text-strong text-2xl font-medium">
							Then ask it something
						</h2>
						<ul className="text-body mt-4 list-disc space-y-3 pl-5 leading-relaxed">
							<li>Build a settings page with a form and a confirm dialog before delete.</li>
							<li>Upgrade mantle to the latest version, and run the codemods.</li>
							<li>Check this file for mantle imports that don&apos;t exist.</li>
						</ul>
					</section>

					<section aria-labelledby="limits-title">
						<h2 id="limits-title" className="text-strong text-2xl font-medium">
							What to know before you rely on it
						</h2>
						<ul className="text-body mt-4 list-disc space-y-3 pl-5 leading-relaxed">
							<li>
								The agent passes the exact version you installed, from the lockfile. The server
								supports 0.90.0 and later.
							</li>
							<li>
								The server never logs the code you send to <Code>check</Code> or{" "}
								<Code>preview</Code>.{" "}
								<Anchor asChild>
									<Link to={href("/for-ai-agents")}>For AI Agents</Link>
								</Anchor>{" "}
								lists what it logs for each call.
							</li>
							<li>
								Your agent can&apos;t add an MCP server? Point it at{" "}
								<Anchor href="/llms.txt">/llms.txt</Anchor> instead. It reads the same docs as plain
								Markdown.
							</li>
						</ul>
					</section>
				</Main>
			</PageContainer>
			<MobileNavigation sidebar={<DocsNavigation />} />
		</>
	);
}
