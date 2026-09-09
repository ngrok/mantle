import { describe, expect, test } from "vitest";
import { alternateAnnouncement } from "./alternate-announcement.js";

describe("alternateAnnouncement", () => {
	test("returns the text as is the first time, then with a trailing no-break space", () => {
		const toggle = { current: false };
		expect(alternateAnnouncement("Copied", toggle)).toBe("Copied");
		expect(alternateAnnouncement("Copied", toggle)).toBe("Copied\u00A0");
		expect(alternateAnnouncement("Copied", toggle)).toBe("Copied");
	});

	test("advances the toggle in place, so two regions with their own toggles stay independent", () => {
		const polite = { current: false };
		const assertive = { current: false };
		alternateAnnouncement("Saving", polite);
		expect(polite.current).toBe(true);
		expect(assertive.current).toBe(false);
		expect(alternateAnnouncement("Saving", assertive)).toBe("Saving");
	});
});
