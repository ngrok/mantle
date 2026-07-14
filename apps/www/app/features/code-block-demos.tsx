import { Button } from "@ngrok/mantle/button";
import {
	CodeBlock,
	createMantleCodeBlockValue,
	jsonCodeBlockValue,
	mantleCode,
	parseCodeBlockHighlightLines,
	parseLanguage,
	type MantleCodeBlockValue,
} from "@ngrok/mantle/code-block";
import { Field } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { Switch } from "@ngrok/mantle/switch";
import { TextArea } from "@ngrok/mantle/text-area";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { href } from "react-router";
import { z } from "zod";
import { Example } from "~/components/example";
import { oauthPolicyFragment } from "~/features/shared-policies";

/**
 * Primary code block demo with a full-featured example showing header, copy button, and expander.
 */
export function PrimaryCodeBlockDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Header>
					<CodeBlock.Icon preset="file" />
					<CodeBlock.Title>ngrok-example.js</CodeBlock.Title>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode("javascript")`
							const listener = await ngrok.connect({
								// session configuration
								addr: \`localhost:8080\`, // or \`8080\` or \`unix:\${UNIX_SOCKET}\`
								authtoken: "<authtoken>",
								authtoken_from_env: true,
								on_status_change: (addr, error) => {
									console.log(\`disconnected, addr \${addr} error: \${error}\`);
								},
								session_metadata: "Online in One Line",
								// listener configuration
								allow_user_agent: "^mozilla.*",
								basic_auth: ["ngrok:online1line"],
								circuit_breaker: 0.1,
								compression: true,
								deny_user_agent: "^curl.*",
								domain: "<domain>",
								ip_restriction_allow_cidrs: ["0.0.0.0/0"],
								ip_restriction_deny_cidrs: ["10.1.1.1/32"],
								metadata: "example listener metadata from nodejs",
								mutual_tls_cas: [fs.readFileSync('ca.crt', 'utf8')],
								oauth_provider: "google",
								oauth_allow_domains: ["<domain>"],
								oauth_allow_emails: ["<email>"],
								oauth_scopes: ["<scope>"],
								oauth_client_id: "<id>",
								oauth_client_secret: "<secret>",
								oidc_issuer_url: "<url>",
								oidc_client_id: "<id>",
								oidc_client_secret: "<secret>",
								oidc_allow_domains: ["<domain>"],
								oidc_allow_emails: ["<email>"],
								oidc_scopes: ["<scope>"],
								proxy_proto: "", // One of: "", "1", "2"
								request_header_remove: ["X-Req-Nope"],
								response_header_remove: ["X-Res-Nope"],
								request_header_add: ["X-Req-Yup:true"],
								response_header_add: ["X-Res-Yup:true"],
								schemes: ["HTTPS"],
								verify_webhook_provider: "twilio",
								verify_webhook_secret: "asdf",
								websocket_tcp_converter: true,
							});
						`}
					/>
				</CodeBlock.Body>
				<CodeBlock.ExpanderButton />
			</CodeBlock.Root>
		</Example>
	);
}

/**
 * Single line command line code block with a header.
 */
export function SingleLineWithHeaderDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Header>
					<CodeBlock.Icon preset="cli" />
					<CodeBlock.Title>Command Line</CodeBlock.Title>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode(
							"bash",
						)`sudo unzip ~/Downloads/ngrok-v3-stable-darwin.zip -d /usr/local/bin`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

/**
 * Code block demonstrating horizontal scrolling with long lines.
 */
export function HorizontalScrollingDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Header>
					<CodeBlock.Icon preset="file" />
					<CodeBlock.Title>ngrok-example.js</CodeBlock.Title>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode("javascript")`
							const http = require('http');
							const ngrok = require("@ngrok/ngrok");
							const server = http.createServer((req, res) => {
								res.writeHead(200);
								res.end("Hello!");
								setTimeout(() => {
									Promise.resolve().then(() => {
										console.log("url:", server.tunnel.url());
									});
								}, timeout);
							});
							// Consumes authtoken from env automatically
							ngrok.listen(server).then(() => {
								console.log("url:", server.tunnel.url());
							});
							// really long line here that should wrap around and stuff Officia ipsum sint eu labore esse deserunt aliqua quis irure.
						`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

/**
 * Code block with no header or copy button.
 */
export function NoHeaderOrCopyButtonDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code
						value={mantleCode("javascript")`
							const http = require('http');
							const ngrok = require("@ngrok/ngrok");
							const server = http.createServer((req, res) => {
								res.writeHead(200);
								res.end("Hello!");
							});
							// Consumes authtoken from env automatically
							ngrok.listen(server).then(() => {
								console.log("url:", server.tunnel.url());
							});
						`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

/**
 * Single line code block with horizontal scrolling and a copy button.
 */
export function SingleLineHorizontalScrollingDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode(
							"bash",
						)`ffmpeg -i multichannel.mxf -map 0:v:0 -map 0:a:0 -map 0:a:0 -c:a:0 ac3 -b:a:0 640k -ac:a:1 2 -c:a:1 aac -b:2 128k out.mp4`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

const shikiHighlightResponseSchema = z.object({
	code: z.string(),
	highlightLines: z.array(z.union([z.number(), z.string()])),
	html: z.string(),
	language: z.string(),
	lineNumberStart: z.number(),
	showLineNumbers: z.boolean(),
});

const defaultServerCode = [
	"const service = await fetchServiceConfig();",
	"if (!service.enabled) {",
	'\tthrow new Error("service is disabled");',
	"}",
].join("\n");

// const serverHighlighterUrl = "http://localhost:4444"; // local docker sidecar
const serverHighlighterUrl = href("/api/shiki-highlight");

const highlightFormSchema = z.object({
	language: z.string(),
	code: z.string().min(1),
	showLineNumbers: z.boolean(),
	highlightLines: z.string(),
	lineNumberStart: z.number().int().min(1),
});

/**
 * Fetches syntax-highlighted HTML from the server API and renders
 * it via `createMantleCodeBlockValue`. Demonstrates server-rendered
 * syntax highlighting for dynamic or user-provided code.
 */
export function ServerRenderedHighlightingDemo() {
	const [highlightedValue, setHighlightedValue] = useState<MantleCodeBlockValue | null>(null);
	const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState("");

	const form = useForm({
		defaultValues: {
			language: "typescript" as string,
			code: defaultServerCode,
			showLineNumbers: true,
			highlightLines: "2-3",
			lineNumberStart: 1,
		},
		validators: {
			onSubmit: highlightFormSchema,
		},
		onSubmit: async ({ value }) => {
			setStatus("loading");
			setErrorMessage("");

			const parsedHighlightLines = value.highlightLines
				.split(",")
				.map((segment) => segment.trim())
				.filter(Boolean);

			try {
				const response = await fetch(serverHighlighterUrl, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						code: value.code,
						highlightLines: parsedHighlightLines,
						language: value.language,
						lineNumberStart: value.lineNumberStart,
						showLineNumbers: value.showLineNumbers,
					}),
				});

				if (!response.ok) {
					throw new Error(`Highlight request failed with status ${response.status}`);
				}

				const data = shikiHighlightResponseSchema.parse(await response.json());
				setHighlightedValue(
					createMantleCodeBlockValue({
						code: data.code,
						highlightLines: parseCodeBlockHighlightLines(data.highlightLines) ?? [],
						lineNumberStart: data.lineNumberStart,
						language: parseLanguage(value.language),
						preHtml: data.html,
						showLineNumbers: data.showLineNumbers,
					}),
				);
				setStatus("idle");
			} catch (error) {
				setStatus("error");
				setErrorMessage(error instanceof Error ? error.message : "Unknown error");
			}
		},
	});

	return (
		<Example className="flex-col items-stretch gap-4">
			<form
				className="space-y-3"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="language">
					{(field) => (
						<Field.Item name={field.name}>
							<Label htmlFor={field.name}>Language</Label>
							<select
								id={field.name}
								name={field.name}
								className="bg-form border-form rounded-md border px-2 py-1"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => {
									field.handleChange(event.currentTarget.value);
								}}
							>
								<option value="typescript">typescript</option>
								<option value="javascript">javascript</option>
								<option value="json">json</option>
								<option value="bash">bash</option>
							</select>
						</Field.Item>
					)}
				</form.Field>
				<form.Field name="code">
					{(field) => (
						<Field.Item name={field.name}>
							<Label htmlFor={field.name}>Code</Label>
							<TextArea
								appearance="monospaced"
								id={field.name}
								name={field.name}
								className="min-h-28 w-full"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => {
									field.handleChange(event.currentTarget.value);
								}}
							/>
						</Field.Item>
					)}
				</form.Field>
				<div className="flex flex-wrap items-end gap-4">
					<form.Field name="showLineNumbers">
						{(field) => (
							<Label htmlFor={field.name} className="mb-2 flex items-center gap-2">
								<Switch
									id={field.name}
									name={field.name}
									checked={field.state.value}
									onBlur={field.handleBlur}
									onCheckedChange={(value) => {
										field.handleChange(value);
									}}
								/>
								Show line numbers
							</Label>
						)}
					</form.Field>
					<form.Field name="highlightLines">
						{(field) => (
							<Field.Item name={field.name}>
								<Label htmlFor={field.name}>Highlight lines</Label>
								<Input
									id={field.name}
									name={field.name}
									type="text"
									placeholder="e.g. 1, 2-3"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(event.currentTarget.value);
									}}
								/>
							</Field.Item>
						)}
					</form.Field>
					<form.Field name="lineNumberStart">
						{(field) => (
							<Field.Item name={field.name}>
								<Label htmlFor={field.name}>Line number start</Label>
								<Input
									id={field.name}
									name={field.name}
									type="number"
									min={1}
									value={String(field.state.value)}
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(Number(event.currentTarget.value) || 1);
									}}
								/>
							</Field.Item>
						)}
					</form.Field>
				</div>
				<Button
					type="submit"
					appearance="filled"
					priority="neutral"
					disabled={status === "loading"}
				>
					{status === "loading" ? "Highlighting..." : "Highlight on Server"}
				</Button>
			</form>
			{status === "error" && <p className="text-danger-600 text-sm">{errorMessage}</p>}
			{highlightedValue != null && (
				<CodeBlock.Root>
					<CodeBlock.Body>
						<CodeBlock.CopyButton />
						<CodeBlock.Code value={highlightedValue} />
					</CodeBlock.Body>
				</CodeBlock.Root>
			)}
		</Example>
	);
}

const tabbedPolicyYml = mantleCode("yaml")`
	on_http_request:
		- expressions:
				# conditions are CEL expressions, see https://cel.dev
				- req.url.path.startsWith('/api')
			actions:
				- type: forward-internal
					config:
						url: https://api.internal

		# route dynamically based on a header using CEL interpolation
		- actions:
				- type: forward-internal
					config:
						url: "https://\${req.headers('X-Custom-Header')}.internal"
`;

const tabbedPolicyJson = mantleCode("json")`
	{
		"on_http_request": [
			{
				"name": "BasicInternalRequest",
				"actions": [
					{
						"type": "http-request",
						"config": {
							"url": "https://upstream-service.internal/ping"
						}
					}
				]
			}
		]
	}
`;

/**
 * Code block with tabs in the header that switch between different code values.
 * Demonstrates using CodeBlock.TabList, CodeBlock.TabTrigger, and CodeBlock.TabContent.
 */
export function TabbedCodeBlockDemo() {
	return (
		<Example>
			<CodeBlock.Root defaultTab="yml">
				<CodeBlock.Header>
					<CodeBlock.TabList>
						<CodeBlock.TabTrigger value="yml">policy.yml</CodeBlock.TabTrigger>
						<CodeBlock.TabTrigger value="json">policy.json</CodeBlock.TabTrigger>
					</CodeBlock.TabList>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.TabContent value="yml">
						<CodeBlock.Code value={tabbedPolicyYml} />
					</CodeBlock.TabContent>
					<CodeBlock.TabContent value="json">
						<CodeBlock.Code value={tabbedPolicyJson} />
					</CodeBlock.TabContent>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

const helloTs = mantleCode("typescript")`console.log("Hello, ngrok!");`;
const helloPy = mantleCode("python")`print("Hello, ngrok!")`;
const helloGo = mantleCode("go")`fmt.Println("Hello, ngrok!")`;
const helloRs = mantleCode("rust")`println!("Hello, ngrok!");`;
const helloJava = mantleCode("java")`System.out.println("Hello, ngrok!");`;
const helloRb = mantleCode("ruby")`puts "Hello, ngrok!"`;

/**
 * Tabbed code block whose tab strip overflows its (deliberately narrow) container:
 * the tabs scroll horizontally with an edge fade (`scroll-fade-x`) instead of
 * wrapping onto a second row.
 */
export function ScrollingTabListDemo() {
	return (
		<Example>
			<CodeBlock.Root defaultTab="ts" className="max-w-xs">
				<CodeBlock.Header>
					<CodeBlock.TabList>
						<CodeBlock.TabTrigger value="ts">index.ts</CodeBlock.TabTrigger>
						<CodeBlock.TabTrigger value="py">server.py</CodeBlock.TabTrigger>
						<CodeBlock.TabTrigger value="go">main.go</CodeBlock.TabTrigger>
						<CodeBlock.TabTrigger value="rs">lib.rs</CodeBlock.TabTrigger>
						<CodeBlock.TabTrigger value="java">App.java</CodeBlock.TabTrigger>
						<CodeBlock.TabTrigger value="rb">app.rb</CodeBlock.TabTrigger>
					</CodeBlock.TabList>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.TabContent value="ts">
						<CodeBlock.Code value={helloTs} />
					</CodeBlock.TabContent>
					<CodeBlock.TabContent value="py">
						<CodeBlock.Code value={helloPy} />
					</CodeBlock.TabContent>
					<CodeBlock.TabContent value="go">
						<CodeBlock.Code value={helloGo} />
					</CodeBlock.TabContent>
					<CodeBlock.TabContent value="rs">
						<CodeBlock.Code value={helloRs} />
					</CodeBlock.TabContent>
					<CodeBlock.TabContent value="java">
						<CodeBlock.Code value={helloJava} />
					</CodeBlock.TabContent>
					<CodeBlock.TabContent value="rb">
						<CodeBlock.Code value={helloRb} />
					</CodeBlock.TabContent>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

/**
 * Code block demonstrating all `mantleCode()` options: `showLineNumbers`, `highlightLines`,
 * `lineNumberStart`, and `indentation`.
 */
export function MantleCodeOptionsDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Header>
					<CodeBlock.Icon preset="file" />
					<CodeBlock.Title>all-options.ts</CodeBlock.Title>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode("typescript", {
							showLineNumbers: false,
							highlightLines: [11, "13-14"],
							lineNumberStart: 10,
							indentation: "spaces",
						})`
							import { serve } from "bun";

							const server = serve({
								port: 3000,
								fetch(req) {
									return new Response("Hello from Bun!");
								},
							});

							console.log(\`Listening on \${server.url}\`);
						`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

/**
 * Code block demonstrating overriding `mantleCode()` defaults: indentation, line numbers,
 * highlighted lines, and line number start. The first block uses language-inferred defaults,
 * the second overrides all options.
 */
export function OverridingIndentationDemo() {
	return (
		<Example className="flex-wrap gap-4">
			<CodeBlock.Root>
				<CodeBlock.Header>
					<CodeBlock.Icon preset="traffic-policy" />
					<CodeBlock.Title>traffic-policy.yaml</CodeBlock.Title>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode("yaml")`
							# yaml indentation MUST use spaces (we infer this for you)
							on_http_request:
								actions:
									type: custom-response
									config:
										status_code: 200
										content: Hello, World!
						`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
			<CodeBlock.Root>
				<CodeBlock.Header>
					<CodeBlock.Icon preset="file" />
					<CodeBlock.Title>ngrok-example.js (all options overridden)</CodeBlock.Title>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode("javascript", {
							indentation: "spaces",
							showLineNumbers: true,
							highlightLines: [42, "46-48"],
							lineNumberStart: 42,
						})`
							// by default, mantle decides that javascript uses tabs,
							// but this example uses spaces for indentation
							const http = require('http');
							const ngrok = require("@ngrok/ngrok");
							const server = http.createServer((req, res) => {
								res.writeHead(200);
								res.end("Hello!");
								setTimeout(() => {
									Promise.resolve().then(() => {
										console.log("url:", server.tunnel.url());
									});
								}, timeout);
							});
							// Consumes authtoken from env automatically
							ngrok.listen(server).then(() => {
								console.log("url:", server.tunnel.url());
							});
						`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

/**
 * Demonstrates foldable JSON: multi-line `{}` / `[]` ranges get a fold toggle
 * in the gutter. Click a caret (or focus and press Enter/Space) to collapse
 * the inner content while keeping the opener and closer lines visible.
 */
export function FoldableJsonDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Header>
					<CodeBlock.Icon preset="file" />
					<CodeBlock.Title>package.json</CodeBlock.Title>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code
						value={mantleCode("json")`
							{
								"name": "@ngrok/mantle",
								"version": "0.71.0",
								"scripts": {
									"build": "tsdown",
									"test": "vitest run",
									"typecheck": "tsc"
								},
								"dependencies": {
									"@radix-ui/react-tabs": "1.1.13",
									"clsx": "2.1.1",
									"tailwind-merge": "3.5.0"
								},
								"pnpm": {
									"onlyBuiltDependencies": [
										"esbuild",
										"@tailwindcss/oxide"
									]
								}
							}
						`}
					/>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

// ngrok Java SDK snippet that embeds the shared policy in a text block via nested interpolation.
const javaSdkSnippet = mantleCode("java")`var policy = """
${oauthPolicyFragment.code}
""";

var agent = Session.withAuthtoken(authtoken).connect();
var listener = agent.listen(policy);`;

// ngrok Python SDK snippet that embeds the same shared policy via nested interpolation.
const pythonSdkSnippet = mantleCode("python")`policy = """
${oauthPolicyFragment.code}
"""

listener = ngrok.forward(8080, traffic_policy=policy)`;

/**
 * Demonstrates nested `mantleCode` interpolation: a reusable policy fragment authored once
 * and embedded into multiple SDK snippets. Each `${oauthPolicyFragment.code}` is inlined at
 * build time, so the embedded policy is highlighted as real lines of its host language with
 * correct line numbers — and pays no runtime substitution cost.
 */
export function NestedFragmentInterpolationDemo() {
	return (
		<Example>
			<CodeBlock.Root defaultTab="java">
				<CodeBlock.Header>
					<CodeBlock.TabList>
						<CodeBlock.TabTrigger value="java">Listener.java</CodeBlock.TabTrigger>
						<CodeBlock.TabTrigger value="python">listener.py</CodeBlock.TabTrigger>
					</CodeBlock.TabList>
				</CodeBlock.Header>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.TabContent value="java">
						<CodeBlock.Code value={javaSdkSnippet} />
					</CodeBlock.TabContent>
					<CodeBlock.TabContent value="python">
						<CodeBlock.Code value={pythonSdkSnippet} />
					</CodeBlock.TabContent>
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}

// A realistic "runtime" record — the kind of value you only have in the browser
// (an API response, a table row's underlying object) and therefore can't run
// through the build-time `mantleCode` transform.
const exampleRuntimeRecord = {
	id: "evt_31kPq9aZ",
	type: "endpoint.created",
	created_at: "2025-06-18T17:42:10Z",
	endpoint: {
		id: "ep_2hYqLm4",
		region: "us-east-1",
		url: "https://example.ngrok.app",
		bindings: ["public", "internal"],
	},
	metadata: { source: "api", retries: 0, ok: true },
};

/**
 * Demonstrates `jsonCodeBlockValue` highlighting a runtime value entirely on the
 * client — no Shiki shipped to the browser — and folding multi-line objects/arrays
 * by default, just like a build-time JSON block.
 */
export function JsonCodeBlockValueDemo() {
	return (
		<Example>
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code value={jsonCodeBlockValue(exampleRuntimeRecord)} />
				</CodeBlock.Body>
			</CodeBlock.Root>
		</Example>
	);
}
