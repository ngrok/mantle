import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands, page, server, userEvent } from "vitest/browser";
import { Input, InputCapture } from "../input/input.js";
import * as FocusShortcut from "./focus-shortcut-parts.js";

/** A search field with the shortcut and its hint inside the chrome, named by `label`. */
function SearchField({ label }: { label: string }) {
	return (
		<FocusShortcut.Root>
			<Input>
				<FocusShortcut.Field>
					<InputCapture aria-label={label} />
				</FocusShortcut.Field>
				<FocusShortcut.Hint data-testid={`${label} hint`} />
			</Input>
		</FocusShortcut.Root>
	);
}

describe("FocusShortcut in a browser", () => {
	let styleElement: HTMLStyleElement;

	// Why all of `mantle.css`: its preflight makes `hidden` beat the `display` that `Kbd` sets.
	beforeAll(async () => {
		styleElement = document.createElement("style");
		styleElement.textContent = await commands.tailwindCss(
			["./focus-shortcut.tsx", "../kbd/kbd.tsx", "../input/input.tsx"],
			{ mantleCss: true },
		);
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	// happy-dom focuses both of these fields, so only a browser shows that they cannot take focus.
	test("gives `/` to a later field when earlier ones cannot take focus", async () => {
		render(
			<>
				<div hidden>
					<SearchField label="Hidden" />
				</div>
				<fieldset disabled>
					<SearchField label="Disabled" />
				</fieldset>
				<SearchField label="Shown" />
			</>,
		);

		await userEvent.keyboard("/");

		const shown = page.getByRole("textbox", { name: "Shown" });
		await expect.element(shown).toHaveFocus();
		await expect.element(shown).toHaveValue("");
	});

	test("lets `/` type in a text field inside a shadow root", async () => {
		const host = document.createElement("div");
		document.body.append(host);
		const notes = document.createElement("input");
		notes.setAttribute("aria-label", "Notes");
		host.attachShadow({ mode: "open" }).append(notes);
		render(<SearchField label="Search" />);

		try {
			notes.focus();
			await userEvent.keyboard("/");

			expect(notes).toHaveValue("/");
			await expect.element(page.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
		} finally {
			host.remove();
		}
	});

	test("shows the hint only while the field can take the key", async () => {
		render(
			<>
				<fieldset disabled>
					<SearchField label="Disabled" />
				</fieldset>
				<SearchField label="Enabled" />
			</>,
		);

		await expect.element(page.getByTestId("Disabled hint")).not.toBeVisible();
		await expect.element(page.getByTestId("Enabled hint")).toBeVisible();

		await userEvent.keyboard("/");

		await expect.element(page.getByRole("textbox", { name: "Enabled" })).toHaveFocus();
		await expect.element(page.getByTestId("Enabled hint")).not.toBeVisible();
	});

	test("passes over a light-DOM field that an aria-hidden slot hides", async () => {
		const host = document.createElement("div");
		host.attachShadow({ mode: "open" }).innerHTML = '<div aria-hidden="true"><slot></slot></div>';
		document.body.append(host);
		const { unmount } = render(<SearchField label="Slotted" />, {
			container: host.appendChild(document.createElement("div")),
		});
		render(<SearchField label="Shown" />);

		try {
			await userEvent.keyboard("/");

			await expect.element(page.getByRole("textbox", { name: "Shown" })).toHaveFocus();
		} finally {
			unmount();
			host.remove();
		}
	});

	test("hides the hint when a fieldset around the field turns disabled", async () => {
		render(
			<fieldset>
				<SearchField label="Search" />
			</fieldset>,
		);
		await expect.element(page.getByTestId("Search hint")).toBeVisible();

		(page.getByRole("group").element() as HTMLFieldSetElement).disabled = true;

		await expect.element(page.getByTestId("Search hint")).not.toBeVisible();
	});

	test.runIf(server.browser === "chromium")(
		"hides the hint on a device that cannot hover, and keeps the shortcut",
		async () => {
			await commands.emulateMedia({ hover: "none" });
			try {
				render(<SearchField label="Touch" />);

				await expect.element(page.getByTestId("Touch hint")).not.toBeVisible();
				await expect
					.element(page.getByRole("textbox", { name: "Touch" }))
					.toHaveAttribute("aria-keyshortcuts", "/");
			} finally {
				await commands.emulateMedia({ hover: "hover" });
			}
		},
	);
});
