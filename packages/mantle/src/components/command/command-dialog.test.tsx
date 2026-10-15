"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { Command } from "./command.js";

/**
 * A minimal controlled `Command.DialogRoot` subject for open/close behavior.
 *
 * Why its own file: the scaffolds here mount a real `Command.List`, unlike the
 * list-free palette in `command.test.tsx`.
 */
const CommandDialogSubject = ({ initialOpen = false }: { initialOpen?: boolean }) => {
	const [open, setOpen] = useState(initialOpen);

	return (
		<Command.DialogRoot open={open} onOpenChange={setOpen}>
			<button type="button" onClick={() => setOpen(true)}>
				Open
			</button>
			<Command.DialogContent title="Test Command Palette">
				<Command.Input placeholder="Type a command or search..." />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Suggestions">
						<Command.Item>Calendar</Command.Item>
						<Command.Item>Search Emoji</Command.Item>
					</Command.Group>
					<Command.Separator />
					<Command.Group heading="Settings">
						<Command.Item>Profile</Command.Item>
						<Command.Item>Billing</Command.Item>
					</Command.Group>
				</Command.List>
			</Command.DialogContent>
		</Command.DialogRoot>
	);
};

describe("Command.Dialog", () => {
	describe("open/close lifecycle", () => {
		test("pressing Escape closes the dialog", async () => {
			const user = userEvent.setup();
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByRole("dialog", { name: "Test Command Palette" })).toBeInTheDocument();
			});

			await user.keyboard("{Escape}");

			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: "Test Command Palette" }),
				).not.toBeInTheDocument();
			});
		});

		test("Command.DialogTrigger opens the dialog without managed state", async () => {
			const user = userEvent.setup();
			render(
				<Command.DialogRoot>
					<Command.DialogTrigger>Open</Command.DialogTrigger>
					<Command.DialogContent title="Test Command Palette">
						<Command.Input placeholder="Type a command or search..." />
						<Command.List>
							<Command.Empty>No results found.</Command.Empty>
						</Command.List>
					</Command.DialogContent>
				</Command.DialogRoot>,
			);

			expect(
				screen.queryByRole("dialog", { name: "Test Command Palette" }),
			).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Open" }));

			await waitFor(() => {
				expect(screen.getByRole("dialog", { name: "Test Command Palette" })).toBeInTheDocument();
			});
		});

		test("clicking the close button closes the dialog", async () => {
			const user = userEvent.setup();
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByRole("dialog", { name: "Test Command Palette" })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Close Dialog" }));

			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: "Test Command Palette" }),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Command.SearchTrigger", () => {
		/** An uncontrolled palette that `Command.SearchTrigger` opens. */
		const SearchTriggerSubject = () => (
			<Command.DialogRoot>
				<Command.SearchTrigger>
					<button type="button">Search…</button>
				</Command.SearchTrigger>
				<Command.DialogContent title="Test Command Palette">
					<Command.Input placeholder="Type a command or search..." />
					<Command.List>
						<Command.Empty>No results found.</Command.Empty>
						<Command.Group heading="Suggestions">
							<Command.Item>Calendar</Command.Item>
							<Command.Item>Endpoints</Command.Item>
						</Command.Group>
					</Command.List>
				</Command.DialogContent>
			</Command.DialogRoot>
		);

		test("a keystroke on the trigger seeds the query and filters the list", async () => {
			const user = userEvent.setup();
			render(<SearchTriggerSubject />);

			const trigger = screen.getByRole("button", { name: "Search…" });
			trigger.focus();
			// "p" appears in "Endpoints" and not in "Calendar", so the filtering is
			// what the assertion below observes rather than cmdk's fuzzy tolerance.
			await user.keyboard("p");

			const input = await screen.findByPlaceholderText("Type a command or search...");
			expect(input).toHaveValue("p");
			// The seed has to reach cmdk's own search state, not just the field's
			// value — otherwise the palette opens showing text that filters nothing.
			await waitFor(() => {
				expect(screen.getByText("Endpoints")).toBeInTheDocument();
			});
			expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
		});

		test("keystrokes after the first continue into the palette input", async () => {
			// The race the seeding exists to close: the palette's input has to be
			// mounted and focused before the next keypress lands, or characters are
			// dropped between the trigger and the field.
			const user = userEvent.setup();
			render(<SearchTriggerSubject />);

			screen.getByRole("button", { name: "Search…" }).focus();
			await user.keyboard("e");
			const input = await screen.findByPlaceholderText("Type a command or search...");
			await waitFor(() => {
				expect(input).toHaveFocus();
			});

			await user.keyboard("nd");

			expect(input).toHaveValue("end");
		});

		test("focus returns to the search trigger after dismissal", async () => {
			// Free from rendering as a Dialog.Trigger. A hand-rolled trigger has to
			// capture and restore the focused element itself, and gets it wrong.
			const user = userEvent.setup();
			render(<SearchTriggerSubject />);

			const trigger = screen.getByRole("button", { name: "Search…" });
			await user.click(trigger);
			await screen.findByPlaceholderText("Type a command or search...");

			await user.keyboard("{Escape}");

			await waitFor(() => {
				expect(trigger).toHaveFocus();
			});
		});
	});

	describe("Command.DialogContent", () => {
		/** An always-open palette, so only the content props under test vary. */
		const DialogContentSubject = (
			props: Omit<ComponentProps<typeof Command.DialogContent>, "children">,
		) => (
			<Command.DialogRoot open>
				<Command.DialogContent {...props}>
					<Command.Input placeholder="Type a command or search..." />
					<Command.List>
						<Command.Empty>No results found.</Command.Empty>
						<Command.Item value="calendar">Calendar</Command.Item>
						<Command.Item value="profile">Profile</Command.Item>
					</Command.List>
				</Command.DialogContent>
			</Command.DialogRoot>
		);

		test("names and describes the dialog with the default title and description", () => {
			render(<DialogContentSubject />);

			const dialog = screen.getByRole("dialog", { name: "Command Palette" });
			expect(dialog).toHaveAccessibleDescription("Search for a command to run...");
		});

		test("title and description become the dialog's accessible name and description", () => {
			render(<DialogContentSubject title="Jump to" description="Search the docs" />);

			const dialog = screen.getByRole("dialog", { name: "Jump to" });
			expect(dialog).toHaveAccessibleDescription("Search the docs");
		});

		test("showCloseButton={false} omits the close button", () => {
			render(<DialogContentSubject showCloseButton={false} />);

			expect(screen.queryByRole("button", { name: "Close Dialog" })).not.toBeInTheDocument();
		});

		test("shouldFilter={false} keeps every item for a query that matches nothing", async () => {
			const user = userEvent.setup();
			render(<DialogContentSubject shouldFilter={false} />);

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "zzz");

			expect(screen.getByRole("option", { name: "Calendar" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Profile" })).toBeInTheDocument();
		});

		test("filter decides which items survive a query", async () => {
			const user = userEvent.setup();
			// Scores only "profile", for a query the default scorer drops entirely.
			render(<DialogContentSubject filter={(value) => (value === "profile" ? 1 : 0)} />);

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "zzz");

			expect(screen.getByRole("option", { name: "Profile" })).toBeInTheDocument();
			expect(screen.queryByRole("option", { name: "Calendar" })).not.toBeInTheDocument();
		});
	});

	describe("Command.Separator auto-hide", () => {
		test("separator renders when there is no active search query", async () => {
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByRole("dialog", { name: "Test Command Palette" })).toBeInTheDocument();
			});

			expect(document.querySelector("[data-slot~='command-separator']")).toBeInTheDocument();
		});

		// Why: cmdk hides its own `Separator` on a query. This test pins the `asChild`
		// wrapper that reaches it; a bare `Separator` carrying the slot passes the
		// test above and never hides.
		test("separator unmounts when a search query is active", async () => {
			const user = userEvent.setup();
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByRole("dialog", { name: "Test Command Palette" })).toBeInTheDocument();
			});

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "cal");

			await waitFor(() => {
				expect(document.querySelector("[data-slot='command-separator']")).not.toBeInTheDocument();
			});
		});
	});
});
