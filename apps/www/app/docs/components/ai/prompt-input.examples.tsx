import { Attachment } from "@ngrok/mantle/attachment";
import { Button } from "@ngrok/mantle/button";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
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

const models = [
	{ value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
	{ value: "gpt-6-sol", label: "GPT-6 Sol" },
	{ value: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen" },
];

/** A composer with a model picker and a dictation toggle in its footer. */
export function FooterControlsExample() {
	const [draft, setDraft] = useState("");
	const [model, setModel] = useState("claude-sonnet-5-5");

	return (
		<PreviewCanvas className="min-h-160">
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
					<input type="hidden" name="model" value={model} />
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild>
							<Button
								type="button"
								appearance="ghost"
								intent="neutral"
								size="sm"
								className="min-w-0"
							>
								<span className="sr-only">Model: </span>
								<span className="truncate">
									{models.find((option) => option.value === model)?.label}
								</span>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content side="top" align="start">
							<DropdownMenu.RadioGroup value={model} onValueChange={setModel}>
								{models.map((option) => (
									<DropdownMenu.RadioItem key={option.value} value={option.value}>
										<span className="whitespace-nowrap">{option.label}</span>
									</DropdownMenu.RadioItem>
								))}
							</DropdownMenu.RadioGroup>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<PromptInput.Dictate />
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
