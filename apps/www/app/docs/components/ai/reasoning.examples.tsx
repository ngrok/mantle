import { Button } from "@ngrok/mantle/button";
import { Reasoning } from "@ngrok/mantle/reasoning";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

const reasoning =
	"The person asks which endpoints have no traffic policy. I should list the endpoints, read the policy on each, and name the ones with none.";

/** The first example on the Reasoning docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Reasoning.Root className="w-full max-w-2xl">
				<Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
				<Reasoning.Content>{reasoning}</Reasoning.Content>
			</Reasoning.Root>
		</PreviewCanvas>
	);
}

/** Reasoning that streams: the label reads "Thinking…" and pulses until the button finishes it. */
export function StreamingExample() {
	const [streaming, setStreaming] = useState(true);

	return (
		<PreviewCanvas className="flex-col gap-4">
			<Reasoning.Root streaming={streaming} className="w-full max-w-2xl">
				<Reasoning.Trigger>Thought for 4 seconds</Reasoning.Trigger>
				<Reasoning.Content>{reasoning}</Reasoning.Content>
			</Reasoning.Root>
			<Button
				type="button"
				appearance="outlined"
				intent="neutral"
				onClick={() => setStreaming(!streaming)}
			>
				{streaming ? "Finish thinking" : "Think again"}
			</Button>
		</PreviewCanvas>
	);
}
