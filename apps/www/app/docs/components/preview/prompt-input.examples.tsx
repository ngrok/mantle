import { PromptInput } from "@ngrok/mantle/prompt-input";
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
