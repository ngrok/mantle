import { act, fireEvent, render, screen, within } from "@testing-library/react";
// oxlint-disable-next-line no-restricted-imports -- Why: the test covers a React 19.2 consumer that hides the composer in Activity.
import { Activity, type ComponentProps, useState } from "react";
import { createPortal } from "react-dom";
import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Tooltip } from "../tooltip/index.js";
import * as PromptInput from "./prompt-input-parts.js";

// Why browser mode: an iframe has its own DOM constructors.
test("a file drag stays active over children in an iframe and ends outside it", async () => {
	const frame = document.createElement("iframe");
	frame.srcdoc = "<!doctype html><title>Composer</title>";
	await new Promise((resolve) => {
		frame.addEventListener("load", resolve, { once: true });
		document.body.append(frame);
	});
	const frameDocument = frame.contentDocument;
	const frameWindow = frameDocument?.defaultView;
	if (frameDocument == null || frameWindow == null) {
		throw new Error("The frame has no document.");
	}
	const onFilesAdd = vi.fn<(files: File[]) => void>();
	const { unmount } = render(
		createPortal(
			<PromptInput.Root aria-label="Composer" onFilesAdd={onFilesAdd}>
				<PromptInput.TextArea aria-label="Message" />
			</PromptInput.Root>,
			frameDocument.body,
		),
	);
	try {
		const fields = within(frameDocument.body);
		const form = fields.getByRole("form", { name: "Composer" });
		const field = fields.getByRole("textbox", { name: "Message" });
		const dataTransfer = new frameWindow.DataTransfer();
		dataTransfer.items.add(new File(["report"], "report.txt"));
		await act(async () =>
			form.dispatchEvent(
				new frameWindow.DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }),
			),
		);
		expect(form).toHaveAttribute("data-drag-over", "");
		await act(async () => fireEvent.dragLeave(form, { relatedTarget: field, dataTransfer }));
		expect(form).toHaveAttribute("data-drag-over", "");
		await act(async () =>
			fireEvent.dragLeave(field, { relatedTarget: frameDocument.body, dataTransfer }),
		);
		expect(form).not.toHaveAttribute("data-drag-over");
		fireEvent.drop(frameDocument.body, { dataTransfer });
		expect(onFilesAdd).toHaveBeenCalledTimes(0);
	} finally {
		unmount();
		frame.remove();
	}
});

// Why browser mode: these tests depend on native form activation and constraint validation.
test("Enter activates the default button and preserves its submitter overrides", async () => {
	const onSubmit = vi.fn<(submitter: HTMLElement | null) => void>();
	render(
		<PromptInput.Root
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(event.nativeEvent.submitter);
			}}
		>
			<PromptInput.TextArea aria-label="Message" required />
			<PromptInput.Submit formNoValidate />
		</PromptInput.Root>,
	);

	await userEvent.click(screen.getByRole("textbox", { name: "Message" }));
	await userEvent.keyboard("{Enter}");

	expect(onSubmit).toHaveBeenCalledTimes(1);
	expect(onSubmit).toHaveBeenLastCalledWith(screen.getByRole("button", { name: "Send message" }));
});

test("Send submits when composed with a tooltip trigger", async () => {
	const onSubmit = vi.fn<() => void>();
	render(
		<PromptInput.Root
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit();
			}}
		>
			<PromptInput.TextArea aria-label="Message" />
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<PromptInput.Submit />
				</Tooltip.Trigger>
			</Tooltip.Root>
		</PromptInput.Root>,
	);

	await userEvent.click(screen.getByRole("button", { name: "Send message" }));

	expect(onSubmit).toHaveBeenCalledTimes(1);
	expect(onSubmit).toHaveBeenLastCalledWith();
});

test.each([false, true])(
	"Enter respects an iframe's default button (disabled=%s)",
	async (disabled) => {
		const frame = document.createElement("iframe");
		frame.srcdoc = "<!doctype html><title>Composer</title>";
		await new Promise((resolve) => {
			frame.addEventListener("load", resolve, { once: true });
			document.body.append(frame);
		});
		const frameDocument = frame.contentDocument;
		if (frameDocument == null) {
			throw new Error("The frame has no document.");
		}
		const onSubmit = vi.fn<(submitter: HTMLElement | null) => void>();
		const { unmount } = render(
			createPortal(
				<PromptInput.Root
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit(event.nativeEvent.submitter);
					}}
				>
					<PromptInput.TextArea aria-label="Message" required={!disabled} />
					<PromptInput.Submit disabled={disabled} formNoValidate />
				</PromptInput.Root>,
				frameDocument.body,
			),
		);
		try {
			const fields = within(frameDocument.body);
			fields.getByRole("textbox", { name: "Message" }).focus();
			await userEvent.keyboard("{Enter}");

			expect(onSubmit.mock.calls).toEqual(
				disabled ? [] : [[fields.getByRole("button", { name: "Send message" })]],
			);
		} finally {
			unmount();
			frame.remove();
		}
	},
);

test.each(["fieldset", "external image"])(
	"Enter respects a disabled default button (%s)",
	async (kind) => {
		const onSubmit = vi.fn<() => void>();
		render(
			<>
				{kind === "external image" && (
					<input type="image" alt="Send image" form="composer" disabled />
				)}
				<PromptInput.Root
					id="composer"
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit();
					}}
				>
					<PromptInput.TextArea aria-label="Message" />
					<fieldset disabled={kind === "fieldset"}>
						<PromptInput.Submit />
					</fieldset>
				</PromptInput.Root>
			</>,
		);

		await userEvent.fill(screen.getByRole("textbox", { name: "Message" }), "next question");
		await userEvent.keyboard("{Enter}");

		expect(onSubmit).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("next question");
	},
);

test.each(["next draft", "double-click"])(
	"stopping an answer does not submit again (%s)",
	async (action) => {
		const onSubmit = vi.fn<() => void>();
		const onStop = vi.fn<() => void>();
		function Composer() {
			const [streaming, setStreaming] = useState(false);
			return (
				<PromptInput.Root
					streaming={streaming}
					onStop={() => {
						onStop();
						setStreaming(false);
					}}
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit();
						setStreaming(true);
					}}
				>
					<PromptInput.TextArea aria-label="Message" />
					<PromptInput.Submit />
				</PromptInput.Root>
			);
		}
		render(<Composer />);
		await userEvent.fill(screen.getByRole("textbox", { name: "Message" }), "first question");
		const button = screen.getByRole("button", { name: "Send message" });
		if (action === "double-click") {
			await userEvent.dblClick(button);
		} else {
			await userEvent.click(button);
			await userEvent.fill(screen.getByRole("textbox", { name: "Message" }), "next question");
			await userEvent.click(screen.getByRole("button", { name: "Stop answer" }));
		}

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onStop).toHaveBeenLastCalledWith();
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenLastCalledWith();
		expect(screen.getByRole("button", { name: "Send message" })).toBe(button);
		expect(button).toHaveFocus();
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
			action === "double-click" ? "first question" : "next question",
		);
	},
);

/** A stand-in for the browser's speech recognition that the test drives. */
class FakeRecognition {
	static last: FakeRecognition | undefined;
	continuous = false;
	interimResults = true;
	lang = "";
	onresult: ((event: unknown) => void) | null = null;
	onend: (() => void) | null = null;
	start() {}
	stop() {
		this.onend?.();
	}
	aborted = false;
	abort() {
		this.aborted = true;
		this.onend?.();
	}

	constructor() {
		FakeRecognition.last = this;
	}

	hear(transcript: string, isFinal: boolean) {
		this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
	}
}

function DictatingComposer({
	onSubmit,
	onChange,
	textAreaProps,
	disabled,
}: {
	onSubmit: (message: string) => void;
	onChange?: (message: string) => void;
	textAreaProps?: ComponentProps<typeof PromptInput.TextArea>;
	disabled?: boolean;
}) {
	const [draft, setDraft] = useState("");
	return (
		<PromptInput.Root
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(draft);
			}}
		>
			<PromptInput.TextArea
				aria-label="Message"
				{...textAreaProps}
				value={draft}
				onChange={(event) => {
					setDraft(event.target.value);
					onChange?.(event.target.value);
				}}
			/>
			<PromptInput.Dictate disabled={disabled} />
			<PromptInput.Submit />
		</PromptInput.Root>
	);
}

// Why browser mode: setRangeText must reach React's onChange with the field unfocused.
test.each([
	{
		name: "middle",
		draft: "Hi there",
		start: 2,
		end: 2,
		phrases: [" list my endpoints"],
		expected: "Hi list my endpoints there",
	},
	{
		name: "recognizer whitespace",
		draft: "Hi there",
		start: 3,
		end: 3,
		phrases: ["list my endpoints "],
		expected: "Hi list my endpoints there",
	},
	{
		name: "Japanese",
		draft: "",
		start: 0,
		end: 0,
		phrases: ["おはよう", "ございます"],
		expected: "おはようございます",
	},
	{
		name: "length limit",
		draft: "Hi there",
		start: 3,
		end: 8,
		phrases: ["everyone"],
		expected: "Hi every",
		maxLength: 8,
	},
	{
		name: "length limit within a surrogate pair",
		draft: "",
		start: 0,
		end: 0,
		phrases: ["a😀😀"],
		expected: "a😀",
		maxLength: 4,
	},
])(
	"Dictate inserts final phrases into a controlled draft ($name)",
	async ({ draft, start, end, phrases, expected, maxLength }) => {
		vi.stubGlobal("SpeechRecognition", FakeRecognition);
		vi.stubGlobal("webkitSpeechRecognition", undefined);
		const onSubmit = vi.fn<(message: string) => void>();
		const onChange = vi.fn<(message: string) => void>();
		render(
			<DictatingComposer onSubmit={onSubmit} onChange={onChange} textAreaProps={{ maxLength }} />,
		);
		const field = screen.getByRole("textbox", { name: "Message" });
		await userEvent.fill(field, draft);
		if (!(field instanceof HTMLTextAreaElement)) {
			throw new Error("The message field must be a textarea.");
		}
		field.setSelectionRange(start, end);
		onChange.mockClear();
		await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
		FakeRecognition.last?.hear("interim guess", false);
		expect(field).toHaveValue(draft);
		for (const phrase of phrases) {
			FakeRecognition.last?.hear(phrase, true);
		}
		await expect.poll(() => field).toHaveValue(expected);
		expect(onChange).toHaveBeenCalledTimes(phrases.length);
		expect(onChange).toHaveBeenLastCalledWith(expected);
		expect(field.selectionStart).toBe(expected.length - (draft.length - end));
		expect(field.selectionEnd).toBe(field.selectionStart);
		await userEvent.click(screen.getByRole("button", { name: "Send message" }));
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenLastCalledWith(expected);
	},
);

test.each(["readOnly", "disabled", "button disabled"])(
	"Dictate does not edit a locked draft (%s)",
	async (lock) => {
		vi.stubGlobal("SpeechRecognition", FakeRecognition);
		const onSubmit = vi.fn<(message: string) => void>();
		const onChange = vi.fn<(message: string) => void>();
		const { rerender } = render(<DictatingComposer onSubmit={onSubmit} onChange={onChange} />);
		const field = screen.getByRole("textbox", { name: "Message" });
		await userEvent.fill(field, "approved draft");
		await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
		onChange.mockClear();
		rerender(
			<DictatingComposer
				onSubmit={onSubmit}
				onChange={onChange}
				disabled={lock === "button disabled"}
				textAreaProps={{ readOnly: lock === "readOnly", disabled: lock === "disabled" }}
			/>,
		);
		FakeRecognition.last?.hear(" unexpected addition", true);
		expect(field).toHaveValue("approved draft");
		expect(onChange).toHaveBeenCalledTimes(0);
	},
);

test("Dictate releases the microphone when the toggle becomes disabled", async () => {
	vi.stubGlobal("SpeechRecognition", FakeRecognition);
	const onSubmit = vi.fn<(message: string) => void>();
	const { rerender } = render(<DictatingComposer onSubmit={onSubmit} />);
	await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
	const recognition = FakeRecognition.last;
	rerender(<DictatingComposer onSubmit={onSubmit} disabled />);
	expect(recognition?.aborted).toBe(true);
	expect(screen.getByRole("button", { name: "Dictate" })).toHaveAttribute("aria-pressed", "false");
});

test("Dictate is not pressed when a hidden Activity shows it again", async () => {
	vi.stubGlobal("SpeechRecognition", FakeRecognition);
	function Composer({ mode }: { mode: "visible" | "hidden" }) {
		return (
			<Activity mode={mode}>
				<DictatingComposer onSubmit={() => {}} />
			</Activity>
		);
	}
	const { rerender } = render(<Composer mode="visible" />);
	await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
	const recognition = FakeRecognition.last;
	rerender(<Composer mode="hidden" />);
	expect(recognition?.aborted).toBe(true);
	rerender(<Composer mode="visible" />);
	expect(screen.getByRole("button", { name: "Dictate" })).toHaveAttribute("aria-pressed", "false");
});

test("Dictate does not start for a field disabled by a fieldset", async () => {
	vi.stubGlobal("SpeechRecognition", FakeRecognition);
	render(
		<PromptInput.Root>
			<fieldset disabled>
				<PromptInput.TextArea aria-label="Message" />
			</fieldset>
			<PromptInput.Dictate />
		</PromptInput.Root>,
	);
	await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
	expect(screen.getByRole("button", { name: "Dictate" })).toHaveAttribute("aria-pressed", "false");
});

test.each(["disable", "unmount"])(
	"Dictate stops a batch when onChange cancels it (%s)",
	async (cancel) => {
		vi.stubGlobal("SpeechRecognition", FakeRecognition);
		const onChange = vi.fn<(message: string) => void>();
		function Composer() {
			const [draft, setDraft] = useState("draft");
			const [cancelled, setCancelled] = useState(false);
			return (
				<PromptInput.Root>
					<PromptInput.TextArea
						aria-label="Message"
						value={draft}
						onChange={(event) => {
							setDraft(event.target.value);
							setCancelled(true);
							onChange(event.target.value);
						}}
					/>
					{!(cancelled && cancel === "unmount") && <PromptInput.Dictate disabled={cancelled} />}
				</PromptInput.Root>
			);
		}
		render(<Composer />);
		const field = screen.getByRole("textbox", { name: "Message" });
		await userEvent.click(field);
		await userEvent.keyboard("{End}");
		await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
		FakeRecognition.last?.onresult?.({
			resultIndex: 0,
			results: [" first", " second"].map((transcript) => ({ isFinal: true, 0: { transcript } })),
		});
		await expect.poll(() => field).toHaveValue("draft first");
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith("draft first");
		expect(FakeRecognition.last?.aborted).toBe(true);
		// Disabled or unmounted, the toggle no longer reports that it listens.
		await expect
			.poll(() => screen.queryByRole("button", { name: "Dictate", pressed: true }))
			.toBeNull();
	},
);

test("Dictate ends the session when its field is replaced", async () => {
	vi.stubGlobal("SpeechRecognition", FakeRecognition);
	function Composer({ thread }: { thread: string }) {
		return (
			<PromptInput.Root>
				<PromptInput.TextArea key={thread} aria-label="Message" />
				<PromptInput.Dictate />
			</PromptInput.Root>
		);
	}
	const { rerender } = render(<Composer thread="a" />);
	const dictate = screen.getByRole("button", { name: "Dictate" });
	await userEvent.click(dictate);
	const recognition = FakeRecognition.last;
	rerender(<Composer thread="b" />);
	recognition?.hear(" hello", true);

	await expect.poll(() => dictate).toHaveAttribute("aria-pressed", "false");
	expect(recognition?.aborted).toBe(true);
	expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("");
});

test("Dictate edits its form's portaled field, not another form's descendant", async () => {
	vi.stubGlobal("SpeechRecognition", FakeRecognition);
	render(
		<>
			<form id="other-composer" />
			<PromptInput.Root id="composer">
				<PromptInput.TextArea
					form="other-composer"
					aria-label="Other message"
					defaultValue="leave alone"
				/>
				{createPortal(
					<PromptInput.TextArea form="composer" aria-label="Message" defaultValue="draft" />,
					document.body,
				)}
				<PromptInput.Dictate />
			</PromptInput.Root>
		</>,
	);
	const field = screen.getByRole("textbox", { name: "Message" });
	await userEvent.click(field);
	await userEvent.keyboard("{End}");
	await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
	FakeRecognition.last?.hear(" addition", true);
	expect(field).toHaveValue("draft addition");
	expect(screen.getByRole("textbox", { name: "Other message" })).toHaveValue("leave alone");
});
