import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { MetaKey } from "./meta-key.js";

/**
 * Replaces `navigator` with a minimal stand-in. `userAgent` is always present
 * because React reads it during render; the fields under test are the ones
 * `detectMetaKey()` consults, in order.
 */
const stubNavigator = (overrides: {
	platform?: string;
	userAgent?: string;
	userAgentData?: { platform?: string };
}) => {
	vi.stubGlobal("navigator", {
		platform: "",
		userAgent: "",
		...overrides,
	});
};

/** Renders `MetaKey` and returns its `<kbd>` element. */
const renderMetaKey = () => {
	render(<MetaKey data-testid="meta-key" />);
	return screen.getByTestId("meta-key");
};

describe("MetaKey", () => {
	const platformCases = [
		{
			name: "userAgentData.platform reporting macOS",
			navigator: { userAgentData: { platform: "macOS" } },
			glyph: "⌘",
			label: "Command",
		},
		{
			name: "userAgentData.platform reporting Windows",
			navigator: { userAgentData: { platform: "Windows" } },
			glyph: "⌃",
			label: "Control",
		},
		{
			name: "navigator.platform when userAgentData carries no platform",
			navigator: { userAgentData: {}, platform: "MacIntel" },
			glyph: "⌘",
			label: "Command",
		},
		{
			name: "navigator.platform reporting iPhone",
			navigator: { platform: "iPhone" },
			glyph: "⌘",
			label: "Command",
		},
		{
			name: "navigator.platform reporting iPad",
			navigator: { platform: "iPad" },
			glyph: "⌘",
			label: "Command",
		},
		{
			name: "navigator.platform reporting Linux",
			navigator: { platform: "Linux x86_64" },
			glyph: "⌃",
			label: "Control",
		},
		{
			name: "the userAgent when platform is empty (Mac)",
			navigator: {
				platform: "",
				userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
			},
			glyph: "⌘",
			label: "Command",
		},
		{
			name: "the userAgent when platform is empty (Windows)",
			navigator: { platform: "", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
			glyph: "⌃",
			label: "Control",
		},
		{
			name: "neither platform nor userAgent, falling back to Control",
			navigator: { platform: "", userAgent: "" },
			glyph: "⌃",
			label: "Control",
		},
	] as const;

	for (const platformCase of platformCases) {
		test(`renders ${platformCase.glyph} with the "${platformCase.label}" label for ${platformCase.name}`, () => {
			stubNavigator(platformCase.navigator);

			const kbd = renderMetaKey();

			expect(kbd).toHaveTextContent(platformCase.glyph);
			// The glyph alone is meaningless to a screen reader, so the modifier is
			// also spelled out in a visually hidden label.
			expect(within(kbd).getByText(platformCase.label)).toBeInTheDocument();
		});
	}

	test("renders the Control default on the server so hydration has nothing to correct", () => {
		// `detectMetaKey()` only runs in an effect; the first paint must therefore be
		// the platform-agnostic default on every platform.
		stubNavigator({ platform: "MacIntel" });

		const html = renderToString(<MetaKey />);

		expect(html).toContain("⌃");
		expect(html).toContain("Control");
		expect(html).not.toContain("⌘");
	});

	test("forwards kbd props and keeps the meta-key slot", () => {
		stubNavigator({ platform: "MacIntel" });

		render(<MetaKey data-testid="meta-key" id="shortcut-modifier" className="custom-class" />);

		const kbd = screen.getByTestId("meta-key");
		expect(kbd).toHaveAttribute("id", "shortcut-modifier");
		expect(kbd).toHaveAttribute("data-slot", "meta-key");
		expect(kbd).toHaveClass("custom-class");
	});
});
