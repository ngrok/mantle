import { PromptInput } from "@ngrok/mantle/prompt-input";
import { Select } from "@ngrok/mantle/select";
import { useEffect, useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Prompt Input docs page. */
export function OverviewExample() {
	const [draft, setDraft] = useState("");

	return (
		<PreviewCanvas>
			<PromptInput.Root
				className="w-full max-w-2xl"
				onSubmit={(event) => {
					event.preventDefault();
					if (draft.trim() === "") {
						return;
					}
					setDraft("");
				}}
			>
				<PromptInput.TextArea
					aria-label="Message the assistant"
					name="message"
					placeholder="Ask about endpoints, domains, or Traffic Policy…"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
				/>
				<PromptInput.Footer>
					<PromptInput.Submit />
				</PromptInput.Footer>
			</PromptInput.Root>
		</PreviewCanvas>
	);
}

/** A composer whose send starts a pretend answer that stops on its own after five seconds. */
export function StopExample() {
	const [draft, setDraft] = useState("");
	const [streaming, setStreaming] = useState(false);

	useEffect(() => {
		if (!streaming) {
			return;
		}
		const timeout = setTimeout(() => setStreaming(false), 5000);
		return () => clearTimeout(timeout);
	}, [streaming]);

	return (
		<PreviewCanvas>
			<PromptInput.Root
				className="w-full max-w-2xl"
				streaming={streaming}
				onStop={() => setStreaming(false)}
				onSubmit={(event) => {
					event.preventDefault();
					if (draft.trim() === "") {
						return;
					}
					setDraft("");
					setStreaming(true);
				}}
			>
				<PromptInput.TextArea
					aria-label="Message the assistant"
					name="message"
					placeholder="Send a message, then stop the answer…"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
				/>
				<PromptInput.Footer>
					<PromptInput.Submit />
				</PromptInput.Footer>
			</PromptInput.Root>
		</PreviewCanvas>
	);
}

/** A composer with a model picker and a dictation toggle in its footer. */
export function FooterControlsExample() {
	const [draft, setDraft] = useState("");
	const [model, setModel] = useState("claude-sonnet-5-5");

	return (
		<PreviewCanvas>
			<PromptInput.Root
				className="w-full max-w-2xl"
				onSubmit={(event) => {
					event.preventDefault();
					if (draft.trim() === "") {
						return;
					}
					setDraft("");
				}}
			>
				<PromptInput.TextArea
					aria-label="Message the model"
					name="message"
					placeholder="Ask the model, or press the microphone and talk…"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
				/>
				<PromptInput.Footer>
					<Select.Root name="model" value={model} onValueChange={setModel}>
						<Select.Trigger
							aria-label="Model"
							className="h-8 w-auto rounded-full border-transparent bg-transparent shadow-none hover:border-transparent"
						>
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="claude-sonnet-5-5">Claude Sonnet 5.5</Select.Item>
							<Select.Item value="gpt-6-sol">GPT-6 Sol</Select.Item>
							<Select.Item value="gemini-4-hydrogen">Gemini 4 Hydrogen</Select.Item>
						</Select.Content>
					</Select.Root>
					<PromptInput.Dictate />
					<PromptInput.Submit />
				</PromptInput.Footer>
			</PromptInput.Root>
		</PreviewCanvas>
	);
}
