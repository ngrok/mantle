"use client";

import { useState } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import mantleCss from "../../mantle.css?raw";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { Dialog } from "../dialog/index.js";
import { ThemeProvider, useTheme } from "../theme/theme-provider.js";
import { ThemeDropdownMenuItem, ThemeSwitcher } from "./theme-switcher.js";

/**
 * The theme-swap rules from `mantle.css`, a probe whose color follows the
 * theme through a slow transition, and a slow dialog overlay exit animation. Browser tests load no Tailwind, so only
 * these rules apply.
 */
const STYLE = `
${mantleCss.match(/:root\[data-theme-transition\][^{]*\{[^}]*\}/g)?.join("\n") ?? ""}
[data-testid="probe"] { color: rgb(0, 0, 0); transition: color 1s linear; }
.dark [data-testid="probe"] { color: rgb(255, 255, 255); }
@keyframes slow-exit { to { opacity: 0; } }
[data-slot~="dialog-overlay"][data-state="closed"] { animation: slow-exit 1s; }
[data-slot~="dialog-content"][data-state="closed"] { animation: slow-exit 1s; }
[data-slot~="dialog-positioner"]:not(:has(> [data-mantle-modal-content][data-state="open"])) { animation: slow-exit 1s; }
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	// Why wait: a running view transition holds the next test's clicks.
	await waitFor(() => {
		if (document.documentElement.hasAttribute("data-theme-transition")) {
			throw new Error("the theme swap still runs");
		}
	});
	document.cookie = "mantle-ui-theme=; max-age=0; path=/";
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

function renderSwitcher() {
	render(
		<ThemeProvider>
			<ThemeSwitcher />
			<p data-testid="probe">Probe</p>
		</ThemeProvider>,
	);
	return screen.getByRole("button", { name: "Switch to dark theme" });
}

/** Waits for a reveal animation on the new snapshot of the root, other than `except`. */
async function revealAnimation({ except }: { except?: Animation } = {}) {
	let reveal: Animation | undefined;
	await waitFor(() => {
		reveal = document
			.getAnimations()
			.find(
				(animation) =>
					animation !== except &&
					animation.effect instanceof KeyframeEffect &&
					animation.effect.pseudoElement === "::view-transition-new(root)",
			);
		expect(reveal).toBeDefined();
	});
	if (reveal == null) {
		throw new Error("no reveal animation");
	}
	return reveal;
}

/** Reads the radius and the center of a `circle(<r>px at <x>px <y>px)` value. */
function parseCircle(value: unknown) {
	const match = /^circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)$/.exec(String(value));
	if (match == null) {
		throw new Error(`not a circle: ${String(value)}`);
	}
	const [, radius, x, y] = match.map(Number);
	return { radius, x, y };
}

describe("ThemeSwitcher theme swap in Chromium", () => {
	test("the new theme grows in a circle from the button, and the swap ends", async () => {
		const button = renderSwitcher();
		await userEvent.click(button);

		const reveal = await revealAnimation();
		const keyframes = (reveal.effect as KeyframeEffect).getKeyframes();
		const from = parseCircle(keyframes[0]?.clipPath);
		const to = parseCircle(keyframes.at(-1)?.clipPath);
		const { left, top, width, height } = button.getBoundingClientRect();
		expect(from.radius).toBe(0);
		expect(from.x).toBeCloseTo(left + width / 2);
		expect(from.y).toBeCloseTo(top + height / 2);
		expect(to.radius).toBeGreaterThan(Math.hypot(window.innerWidth, window.innerHeight) / 2);
		expect(document.documentElement).toHaveClass("dark");

		await reveal.finished;
		await waitFor(() =>
			expect(document.documentElement).not.toHaveAttribute("data-theme-transition"),
		);
	});

	test("colors change at once during the swap, and transitions return after it", async () => {
		const button = renderSwitcher();
		const probe = screen.getByTestId("probe");
		await userEvent.click(button);

		await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
		expect(getComputedStyle(probe).color).toBe("rgb(255, 255, 255)");

		await waitFor(() =>
			expect(document.documentElement).not.toHaveAttribute("data-theme-transition"),
		);
		expect(getComputedStyle(probe).transitionDuration).toBe("1s");
	});

	test("a click on the switcher during the reveal starts a new reveal back", async () => {
		const button = renderSwitcher();
		await userEvent.click(button);
		const reveal = await revealAnimation();

		// While a view transition runs, Chromium targets <html> with each click.
		const { left, top, width, height } = button.getBoundingClientRect();
		fireEvent.click(document.documentElement, {
			clientX: left + width / 2,
			clientY: top + height / 2,
		});

		await waitFor(() => expect(document.documentElement).toHaveClass("light"));
		await revealAnimation({ except: reveal });
	});

	test("with reduced motion, the theme swaps at once with no reveal", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		const button = renderSwitcher();
		await userEvent.click(button);

		expect(document.documentElement).toHaveClass("dark");
		expect(document.documentElement).not.toHaveAttribute("data-theme-transition");
		expect(
			document
				.getAnimations()
				.some(
					(animation) =>
						animation.effect instanceof KeyframeEffect &&
						animation.effect.pseudoElement === "::view-transition-new(root)",
				),
		).toBe(false);
	});
});

describe("ThemeDropdownMenuItem theme swap in Chromium", () => {
	test("the new theme grows in a circle from the icon, and the menu stays open", async () => {
		render(
			<ThemeProvider>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>Account</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<ThemeDropdownMenuItem />
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</ThemeProvider>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Account" }));
		const item = await screen.findByRole("menuitem", { name: "Theme: Switch to dark theme" });
		const icon = item.lastElementChild;
		if (icon == null) {
			throw new Error("the item renders no icon");
		}
		await userEvent.click(item);

		const reveal = await revealAnimation();
		const from = parseCircle((reveal.effect as KeyframeEffect).getKeyframes()[0]?.clipPath);
		const { left, top, width, height } = icon.getBoundingClientRect();
		expect(from.x).toBeCloseTo(left + width / 2);
		expect(from.y).toBeCloseTo(top + height / 2);
		expect(document.documentElement).toHaveClass("dark");
		expect(item).toHaveAccessibleName("Theme: Switch to light theme (system default)");
		expect(screen.getByRole("menu")).toBeInTheDocument();

		await reveal.finished;
	});
});

/**
 * A palette-like dialog with one button that sets the dark theme and closes
 * the dialog in the same press, with no `origin`.
 */
function DarkThemeDialog() {
	const [, setTheme] = useTheme();
	const [open, setOpen] = useState(true);
	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Content>
				<Dialog.Title>Palette</Dialog.Title>
				<button
					type="button"
					onClick={() => {
						setTheme("dark");
						setOpen(false);
					}}
				>
					Use Dark theme
				</button>
			</Dialog.Content>
		</Dialog.Root>
	);
}

describe("setTheme theme swap in Chromium", () => {
	test("with no origin, the new theme grows from the focused element, and a closing dialog overlay leaves at once", async () => {
		render(
			<ThemeProvider>
				<DarkThemeDialog />
			</ThemeProvider>,
		);
		const button = await screen.findByRole("button", { name: "Use Dark theme" });
		button.focus();
		const { left, top, width, height } = button.getBoundingClientRect();
		await userEvent.click(button);

		const reveal = await revealAnimation();
		const from = parseCircle((reveal.effect as KeyframeEffect).getKeyframes()[0]?.clipPath);
		expect(from.x).toBeCloseTo(left + width / 2);
		expect(from.y).toBeCloseTo(top + height / 2);
		expect(document.documentElement).toHaveClass("dark");
		// An exit animation or the exit hold would leave the dialog in the old snapshot.
		expect(document.querySelector('[data-slot~="dialog-overlay"]')).toBeNull();
		expect(document.querySelector('[data-slot~="dialog-positioner"]')).toBeNull();

		await reveal.finished;
	});
});
