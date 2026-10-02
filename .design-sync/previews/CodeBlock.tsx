import { CodeBlock, jsonCodeBlockValue, mantleCode } from "@ngrok/mantle";

// Why flush-left templates: the design runtime has no Vite plugin, so
// `mantleCode` keeps every leading tab and renders without Shiki colors.

export const CommandLine = () => (
	<CodeBlock.Root>
		<CodeBlock.Header>
			<CodeBlock.Icon preset="cli" />
			<CodeBlock.Title>Command Line</CodeBlock.Title>
		</CodeBlock.Header>
		<CodeBlock.Body>
			<CodeBlock.CopyButton />
			<CodeBlock.Code
				value={mantleCode("bash")`ngrok http 8080 --url https://api.acme.ngrok.app`}
			/>
		</CodeBlock.Body>
	</CodeBlock.Root>
);

export const File = () => (
	<CodeBlock.Root>
		<CodeBlock.Header>
			<CodeBlock.Icon preset="file" />
			<CodeBlock.Title>server.js</CodeBlock.Title>
		</CodeBlock.Header>
		<CodeBlock.Body>
			<CodeBlock.CopyButton />
			<CodeBlock.Code
				value={mantleCode("javascript")`const http = require("http");
const ngrok = require("@ngrok/ngrok");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Hello from ngrok!");
});

// Reads NGROK_AUTHTOKEN from the environment
ngrok.listen(server).then(() => {
  console.log("url:", server.tunnel.url());
});`}
			/>
		</CodeBlock.Body>
	</CodeBlock.Root>
);

const policyYml = mantleCode("yaml")`on_http_request:
  - actions:
      - type: rate-limit
        config:
          name: per-ip
          algorithm: sliding_window
          capacity: 100
          rate: 60s
          bucket_key:
            - conn.client_ip`;

const policy = {
	on_http_request: [
		{
			actions: [
				{
					type: "rate-limit",
					config: { name: "per-ip", algorithm: "sliding_window", capacity: 100, rate: "60s" },
				},
			],
		},
	],
};

export const Tabs = () => (
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
				<CodeBlock.Code value={policyYml} />
			</CodeBlock.TabContent>
			<CodeBlock.TabContent value="json">
				<CodeBlock.Code value={jsonCodeBlockValue(policy)} />
			</CodeBlock.TabContent>
		</CodeBlock.Body>
	</CodeBlock.Root>
);

export const JsonResponse = () => (
	<CodeBlock.Root>
		<CodeBlock.Header>
			<CodeBlock.Icon preset="file" />
			<CodeBlock.Title>GET /endpoints/ep_2abc9XyZ</CodeBlock.Title>
		</CodeBlock.Header>
		<CodeBlock.Body>
			<CodeBlock.CopyButton />
			<CodeBlock.Code
				value={jsonCodeBlockValue({
					id: "ep_2abc9XyZ",
					url: "https://api.acme.ngrok.app",
					type: "cloud",
					region: "us-east",
					traffic_policy: "rate-limit, oauth",
					created_at: "2026-09-14T17:02:11Z",
				})}
			/>
		</CodeBlock.Body>
	</CodeBlock.Root>
);

export const BodyOnly = () => (
	<CodeBlock.Root>
		<CodeBlock.Body>
			<CodeBlock.CopyButton />
			<CodeBlock.Code
				value={mantleCode("bash")`curl https://api.ngrok.com/endpoints \\
  -H "Authorization: Bearer $NGROK_API_KEY" \\
  -H "Ngrok-Version: 2"`}
			/>
		</CodeBlock.Body>
	</CodeBlock.Root>
);
