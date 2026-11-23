import { Accordion } from "@ngrok/mantle/accordion";
import { Dialog } from "@ngrok/mantle/dialog";
import { Icon } from "@ngrok/mantle/icon";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Popover } from "@ngrok/mantle/popover";
import { Select } from "@ngrok/mantle/select";
import { Switch } from "@ngrok/mantle/switch";
import { Tabs } from "@ngrok/mantle/tabs";
import { cx } from "@ngrok/mantle/cx";
import { expect, test } from "vitest";

// A trigger carries aria-expanded, and a group- variant inside it reads the trigger.
export function Faq() {
	return (
		<Accordion.Root type="single">
			<Accordion.Item value="a">
				<Accordion.Trigger className="py-3 data-state-open:pb-0 data-state-closed:text-muted">
					<Icon className="size-3 group-data-state-open:rotate-90 motion-reduce:transition-none" />
					Question
				</Accordion.Trigger>
				<Accordion.Content className="data-state-open:animate-in data-state-closed:animate-out">
					Answer
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	);
}

// An asChild trigger element reads aria-expanded; a group- variant on a trigger reads its item.
export function AsChild() {
	return (
		<Accordion.Item value="b" className="group">
			<Accordion.Trigger className="group-data-state-open:font-medium">B</Accordion.Trigger>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button type="button" className="group data-state-open:bg-neutral-500/15">
						Account
					</button>
				</DropdownMenu.Trigger>
			</DropdownMenu.Root>
		</Accordion.Item>
	);
}

// Content keys on data-open, exits on not-data-open, and the enums use brackets.
export function Menu() {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger className="hover:text-strong data-state-open:text-strong">Open</DropdownMenu.Trigger>
			<DropdownMenu.Content className="data-side-top:mb-2 data-side-bottom:mt-2 motion-safe:data-state-closed:fade-out">
				<DropdownMenu.Item className="data-active-item:bg-active-menu-item">Copy</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

// Checked, selected, and named groups.
export function Settings({ invalid }: { invalid: boolean }) {
	return (
		<>
			<Switch className="data-state-checked:bg-pink-500! data-state-unchecked:bg-gray-200" />
			<Tabs.Root defaultValue="a" orientation="vertical">
				<Tabs.List className="data-orientation-vertical:flex-col">
					<Tabs.Trigger value="a" className="data-state-active:text-strong group/tab">
						<span className="group-data-state-active/tab:font-medium">A</span>
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="a" className="data-state-inactive:hidden">
					Panel
				</Tabs.Content>
			</Tabs.Root>
			<Select.Item value="a" className="data-state-checked:font-bold data-state-unchecked:opacity-50">
				Apple
			</Select.Item>
			<input className={cx("border", invalid && "data-validation-error:border-danger-600")} />
		</>
	);
}

// A class string outside JSX follows the same map.
export const sheetClassName = `bg-base data-state-closed:animate-none data-state-open:animate-none ${extra}`;

// Negative cases: built-in and bracket forms, other words, and other attributes stay as written.
export function Untouched() {
	return (
		<Popover.Root>
			<Popover.Content className="data-open:block data-[state=open]:flex mydata-state-open:p-2 data-state-custom:p-3" />
			<Dialog.Content data-state="open" />
		</Popover.Root>
	);
}

test("presence-only state", () => {
	expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
	expect(screen.getByRole("listbox")).toHaveAttribute('data-state', 'closed');
	expect(nav).toHaveAttribute("data-state", "expanded");
	expect(nav).toHaveAttribute("data-state", "collapsed");
	// Negative cases: another value, another attribute, and a negated assertion stay.
	expect(panel).toHaveAttribute("data-state", "streaming");
	expect(panel).toHaveAttribute("data-mode", "open");
	expect(panel).not.toHaveAttribute("data-state", "open");
});
