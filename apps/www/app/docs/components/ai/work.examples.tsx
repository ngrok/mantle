import { Button } from "@ngrok/mantle/button";
import { CodeBlock, jsonCodeBlockValue } from "@ngrok/mantle/code-block";
import { Reasoning } from "@ngrok/mantle/reasoning";
import { ToolCall } from "@ngrok/mantle/tool-call";
import { Work } from "@ngrok/mantle/work";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

const reasoning =
	"The person asks which endpoints have no traffic policy. I should list the endpoints, read the policy on each, and name the ones with none.";

/** The first example on the Work docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Work.Root className="w-full max-w-2xl">
				<Work.Trigger />
				<Work.Content>
					<Reasoning.Root>
						<Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
						<Reasoning.Content>{reasoning}</Reasoning.Content>
					</Reasoning.Root>
					<ToolCall.Root status="done">
						<ToolCall.Trigger>
							<ToolCall.Name>list_endpoints</ToolCall.Name>
						</ToolCall.Trigger>
						<ToolCall.Content>
							<CodeBlock.Root>
								<CodeBlock.Body>
									<CodeBlock.Code value={jsonCodeBlockValue({ limit: 5 })} />
								</CodeBlock.Body>
							</CodeBlock.Root>
						</ToolCall.Content>
					</ToolCall.Root>
				</Work.Content>
			</Work.Root>
		</PreviewCanvas>
	);
}

/** Work that streams: it shows while the answer streams and folds away when the button ends it. */
export function StreamingExample() {
	const [streaming, setStreaming] = useState(true);
	// Why a key: each answer gets a fresh Work, so the reader's choice on one answer stays with it.
	const [answer, setAnswer] = useState(0);

	return (
		<PreviewCanvas className="flex-col gap-4">
			<Work.Root key={answer} streaming={streaming} className="w-full max-w-2xl">
				<Work.Trigger />
				<Work.Content>
					<Reasoning.Root streaming={streaming}>
						<Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
						<Reasoning.Content>{reasoning}</Reasoning.Content>
					</Reasoning.Root>
					<ToolCall.Root status={streaming ? "running" : "done"}>
						<ToolCall.Trigger>
							<ToolCall.Name>list_endpoints</ToolCall.Name>
						</ToolCall.Trigger>
						<ToolCall.Content>Found 5 endpoints.</ToolCall.Content>
					</ToolCall.Root>
				</Work.Content>
			</Work.Root>
			<Button
				type="button"
				appearance="outlined"
				intent="neutral"
				onClick={() => {
					if (!streaming) {
						setAnswer(answer + 1);
					}
					setStreaming(!streaming);
				}}
			>
				{streaming ? "End the answer" : "Answer again"}
			</Button>
		</PreviewCanvas>
	);
}
