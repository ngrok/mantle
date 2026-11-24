import { Attachment } from "@ngrok/mantle/attachment";
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

/** A composer that takes files from the attach button, a drop on the frame, or a paste. */
export function AttachExample() {
	const [draft, setDraft] = useState("");
	const [files, setFiles] = useState<{ id: string; file: File }[]>([]);

	return (
		<PreviewCanvas>
			<PromptInput.Root
				className="w-full max-w-2xl"
				onFilesAdd={(added) => {
					const entries = added.map((file) => ({ id: crypto.randomUUID(), file }));
					setFiles((current) => [...current, ...entries]);
				}}
				onSubmit={(event) => {
					event.preventDefault();
					if (draft.trim() === "" && files.length === 0) {
						return;
					}
					setDraft("");
					setFiles([]);
				}}
			>
				{files.length > 0 && (
					<Attachment.List aria-label="Attachments" className="px-3 pt-3">
						{files.map(({ id, file }) => (
							<Attachment.Root key={id}>
								<Attachment.Preview />
								<Attachment.Name title={file.name}>{file.name}</Attachment.Name>
								<Attachment.Size bytes={file.size} />
								<Attachment.Remove
									label={`Remove ${file.name}`}
									onClick={() => setFiles((current) => current.filter((entry) => entry.id !== id))}
								/>
							</Attachment.Root>
						))}
					</Attachment.List>
				)}
				<PromptInput.TextArea
					aria-label="Message the assistant"
					name="message"
					placeholder="Drop or paste a file, or attach one…"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
				/>
				<PromptInput.Footer>
					<PromptInput.AttachButton accept="image/*,.txt,.json" />
					<PromptInput.Submit />
				</PromptInput.Footer>
			</PromptInput.Root>
		</PreviewCanvas>
	);
}
