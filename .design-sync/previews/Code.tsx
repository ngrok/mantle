import { Anchor, Code } from "@ngrok/mantle";

export const Inline = () => (
	<p className="max-w-md text-sm">
		Run <Code>ngrok http 8080</Code> to put your local app online at a public URL.
	</p>
);

export const InProse = () => (
	<p className="max-w-md text-sm">
		Set <Code>NGROK_AUTHTOKEN</Code> in your environment, then reference the endpoint by its{" "}
		<Code>ep_2abc9XyZ</Code> ID in the <Code>traffic-policy.yaml</Code> file.
	</p>
);

export const AsLink = () => (
	<p className="max-w-md text-sm">
		See the{" "}
		<Code asChild>
			<Anchor href="https://ngrok.com/docs/api">/api/endpoints</Anchor>
		</Code>{" "}
		reference for every field.
	</p>
);
