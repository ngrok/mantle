import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
import { ToolCall } from "@ngrok/mantle/tool-call";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Tool Call docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<ToolCall.Root status="done" className="w-full max-w-2xl">
				<ToolCall.Trigger>
					<ToolCall.Name>list_endpoints</ToolCall.Name>
					<span className="text-muted">840ms</span>
				</ToolCall.Trigger>
				<ToolCall.Content>
					<CodeBlock.Root>
						<CodeBlock.Header>
							<CodeBlock.Title>Arguments</CodeBlock.Title>
						</CodeBlock.Header>
						<CodeBlock.Body>
							<CodeBlock.CopyButton />
							<CodeBlock.Code value={jsonCodeBlockValue({ limit: 5 })} />
						</CodeBlock.Body>
					</CodeBlock.Root>
				</ToolCall.Content>
			</ToolCall.Root>
		</PreviewCanvas>
	);
}

/** One call in each state. */
export function StatusExample() {
	return (
		<PreviewCanvas className="flex-col">
			<ToolCall.Root status="running" className="w-full max-w-2xl">
				<ToolCall.Trigger>
					<ToolCall.Name>get_traffic_policy</ToolCall.Name>
				</ToolCall.Trigger>
				<ToolCall.Content>Reading Traffic Policy for the endpoint.</ToolCall.Content>
			</ToolCall.Root>
			<ToolCall.Root status="done" className="w-full max-w-2xl">
				<ToolCall.Trigger>
					<ToolCall.Name>list_endpoints</ToolCall.Name>
				</ToolCall.Trigger>
				<ToolCall.Content>Found 5 endpoints.</ToolCall.Content>
			</ToolCall.Root>
			<ToolCall.Root status="failed" className="w-full max-w-2xl">
				<ToolCall.Trigger>
					<ToolCall.Name>list_domains</ToolCall.Name>
				</ToolCall.Trigger>
				<ToolCall.Content>The request timed out. Try again.</ToolCall.Content>
			</ToolCall.Root>
			<ToolCall.Root status="interrupted" className="w-full max-w-2xl">
				<ToolCall.Trigger>
					<ToolCall.Name>list_agents</ToolCall.Name>
				</ToolCall.Trigger>
				<ToolCall.Content>The answer stopped before the result arrived.</ToolCall.Content>
			</ToolCall.Root>
			<ToolCall.Root status="requested" className="w-full max-w-2xl">
				<ToolCall.Trigger>
					<ToolCall.Name>get_endpoint</ToolCall.Name>
				</ToolCall.Trigger>
				<ToolCall.Content>This capture shows the call but not its result.</ToolCall.Content>
			</ToolCall.Root>
		</PreviewCanvas>
	);
}
