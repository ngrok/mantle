import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { Command } from "./command.js";

/**
 * A palette without the dialog wrapper — the filtering, empty-state and
 * selection wiring lives on `Command.Root`/`List`/`Item`, so exercising it
 * directly keeps these tests free of portal/overlay noise.
 */
const PaletteSubject = ({ onSelect }: { onSelect?: (value: string) => void }) => (
	<Command.Root label="Commands">
		<Command.Input placeholder="Type a command or search..." />
		<Command.List>
			<Command.Empty>No results found.</Command.Empty>
			<Command.Group heading="Suggestions">
				<Command.Item value="calendar" onSelect={onSelect}>
					Calendar
				</Command.Item>
				<Command.Item value="search-emoji" onSelect={onSelect}>
					Search Emoji
				</Command.Item>
			</Command.Group>
			<Command.Separator />
			<Command.Group heading="Settings">
				<Command.Item value="profile" onSelect={onSelect}>
					Profile
				</Command.Item>
				<Command.Item value="billing" onSelect={onSelect}>
					Billing
				</Command.Item>
			</Command.Group>
		</Command.List>
	</Command.Root>
);

describe("Command", () => {
	describe("filtering", () => {
		test("a query keeps only the matching items mounted", async () => {
			const user = userEvent.setup();
			render(<PaletteSubject />);

			expect(screen.getAllByRole("option")).toHaveLength(4);

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "cal");

			expect(screen.getByRole("option", { name: "Calendar" })).toBeInTheDocument();
			expect(screen.queryByRole("option", { name: "Profile" })).not.toBeInTheDocument();
			expect(screen.queryByRole("option", { name: "Billing" })).not.toBeInTheDocument();
			expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
		});

		test("Command.Empty replaces the items when nothing matches", async () => {
			const user = userEvent.setup();
			render(<PaletteSubject />);

			expect(screen.queryByText("No results found.")).not.toBeInTheDocument();

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "zzz");

			expect(screen.getByText("No results found.")).toBeInTheDocument();
			expect(screen.queryAllByRole("option")).toHaveLength(0);
		});
	});

	describe("selection", () => {
		test("clicking an item fires onSelect with that item's value", async () => {
			const user = userEvent.setup();
			const onSelect = vi.fn<(value: string) => void>();
			render(<PaletteSubject onSelect={onSelect} />);

			await user.click(screen.getByRole("option", { name: "Profile" }));

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenLastCalledWith("profile");
		});

		test("a disabled item ignores clicks", async () => {
			const user = userEvent.setup();
			const onSelect = vi.fn<(value: string) => void>();
			render(
				<Command.Root label="Commands">
					<Command.List>
						<Command.Item disabled value="calendar" onSelect={onSelect}>
							Calendar
						</Command.Item>
					</Command.List>
				</Command.Root>,
			);

			const item = screen.getByRole("option", { name: "Calendar" });
			expect(item).toHaveAttribute("aria-disabled", "true");

			await user.click(item);

			expect(onSelect).not.toHaveBeenCalled();
		});

		test("ArrowDown then Enter selects the highlighted item", async () => {
			const user = userEvent.setup();
			const onSelect = vi.fn<(value: string) => void>();
			render(<PaletteSubject onSelect={onSelect} />);

			const input = screen.getByPlaceholderText("Type a command or search...");
			await user.click(input);
			// The first item is selected by default, so one ArrowDown lands on the second.
			await user.keyboard("{ArrowDown}");
			expect(screen.getByRole("option", { name: "Search Emoji" })).toHaveAttribute(
				"data-selected",
				"true",
			);

			await user.keyboard("{Enter}");

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenLastCalledWith("search-emoji");
		});

		test("an asChild item renders the consumer's element and still selects", async () => {
			const user = userEvent.setup();
			const onSelect = vi.fn<(value: string) => void>();
			render(
				<Command.Root label="Commands">
					<Command.List>
						<Command.Item asChild value="calendar" onSelect={onSelect}>
							<a href="/calendar">Calendar</a>
						</Command.Item>
					</Command.List>
				</Command.Root>,
			);

			// cmdk gives the item `role="option"`, so the anchor is queried by that role.
			const item = screen.getByRole("option", { name: "Calendar" });
			if (!(item instanceof HTMLAnchorElement)) {
				throw new Error("expected the asChild item to render the consumer's anchor");
			}
			expect(item).toHaveAttribute("href", "/calendar");
			expect(item).toHaveAttribute("data-slot", "command-item");

			await user.click(item);

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenLastCalledWith("calendar");
		});
	});

	describe("Command.DialogContent", () => {
		/** An always-open dialog palette, so only the content props under test vary. */
		const DialogSubject = ({
			description,
			filter,
			shouldFilter,
			showCloseButton,
			title,
		}: Partial<ComponentProps<typeof Command.DialogContent>>) => (
			<Command.DialogRoot open>
				<Command.DialogContent
					description={description}
					filter={filter}
					shouldFilter={shouldFilter}
					showCloseButton={showCloseButton}
					title={title}
				>
					<Command.Input placeholder="Type a command or search..." />
					<Command.List>
						<Command.Empty>No results found.</Command.Empty>
						<Command.Item value="calendar">Calendar</Command.Item>
						<Command.Item value="profile">Profile</Command.Item>
					</Command.List>
				</Command.DialogContent>
			</Command.DialogRoot>
		);

		test("names and describes the dialog with the defaults", () => {
			render(<DialogSubject />);

			const dialog = screen.getByRole("dialog", { name: "Command Palette" });
			expect(dialog).toHaveAccessibleDescription("Search for a command to run...");
		});

		test("a custom title and description become the dialog's accessible name and description", () => {
			render(<DialogSubject title="Jump to" description="Search the docs" />);

			const dialog = screen.getByRole("dialog", { name: "Jump to" });
			expect(dialog).toHaveAccessibleDescription("Search the docs");
		});

		test("renders a close button by default and omits it when showCloseButton is false", () => {
			const { unmount } = render(<DialogSubject />);
			expect(screen.getByRole("button", { name: "Close Dialog" })).toBeInTheDocument();
			unmount();

			render(<DialogSubject showCloseButton={false} />);
			expect(screen.queryByRole("button", { name: "Close Dialog" })).not.toBeInTheDocument();
		});

		test("shouldFilter={false} keeps every item mounted for a non-matching query", async () => {
			const user = userEvent.setup();
			render(<DialogSubject shouldFilter={false} />);

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "zzz");

			expect(screen.getByRole("option", { name: "Calendar" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Profile" })).toBeInTheDocument();
			expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
		});

		test("a custom filter decides which items survive a query", async () => {
			const user = userEvent.setup();
			// Scores only "profile", for a query the default scorer would drop entirely.
			render(<DialogSubject filter={(value) => (value === "profile" ? 1 : 0)} />);

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "zzz");

			expect(screen.getByRole("option", { name: "Profile" })).toBeInTheDocument();
			expect(screen.queryByRole("option", { name: "Calendar" })).not.toBeInTheDocument();
		});
	});
});
