import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { countryCodes, isCountryCode } from "./country-code.js";
import { Flag } from "./flag.js";

/**
 * Resolves the wrapper `<div>` from the rendered image rather than by class name, so the
 * assertions survive a styling change but still fail if the wrapper stops emitting its slot.
 */
const getFlag = (code: string) => {
	const image = screen.getByAltText(`flag for ${code}`);
	const wrapper = image.closest("[data-slot='flag']");
	if (!(wrapper instanceof HTMLDivElement)) {
		throw new Error(`expected a wrapper div with data-slot="flag" around the ${code} flag`);
	}
	return { image, wrapper };
};

/**
 * Values that are not strings at all — the guard must reject them before
 * `Array.prototype.includes` sees them. `840` is a number whose string form *is* a valid
 * code, so it catches a guard that coerces instead of comparing.
 */
const nonStringValues: { label: string; value: unknown }[] = [
	{ label: "null", value: null },
	{ label: "undefined", value: undefined },
	{ label: "0", value: 0 },
	{ label: "840", value: 840 },
	{ label: "true", value: true },
	{ label: "an empty object", value: {} },
	{ label: "an empty array", value: [] },
	{ label: "an array holding a code", value: ["US"] },
];

describe("Flag", () => {
	test("renders the image inside a wrapper carrying the flag data-slot", () => {
		render(<Flag code="US" />);
		const { wrapper, image } = getFlag("US");
		expect(wrapper).toContainElement(image);
	});

	test.each([
		["s", "https://assets.ngrok.com/flags/s/US.svg"],
		["m", "https://assets.ngrok.com/flags/m/US.svg"],
		["l", "https://assets.ngrok.com/flags/l/US.svg"],
	] as const)("builds the CDN src from size %s and the code", (size, src) => {
		render(<Flag code="US" size={size} />);
		expect(getFlag("US").image).toHaveAttribute("src", src);
	});

	test("defaults to the large size in the src", () => {
		render(<Flag code="JP" />);
		expect(getFlag("JP").image).toHaveAttribute("src", "https://assets.ngrok.com/flags/l/JP.svg");
	});

	test("labels the image with the country code", () => {
		render(<Flag code="ZA" />);
		// `alt="flag for {code}"` is the only accessible name the component produces.
		expect(screen.getByRole("img", { name: "flag for ZA" })).toBeInTheDocument();
	});

	test("defaults the image to lazy loading", () => {
		render(<Flag code="US" />);
		const { image, wrapper } = getFlag("US");
		expect(image).toHaveAttribute("loading", "lazy");
		expect(wrapper).not.toHaveAttribute("loading");
	});

	test("routes an explicit loading hint to the image, not the wrapper", () => {
		render(<Flag code="US" loading="eager" />);
		const { image, wrapper } = getFlag("US");
		expect(image).toHaveAttribute("loading", "eager");
		expect(wrapper).not.toHaveAttribute("loading");
	});

	test("keeps the decorative border overlay out of the accessibility tree", () => {
		render(<Flag code="US" />);
		const { wrapper, image } = getFlag("US");
		const overlay = wrapper.firstElementChild;
		expect(overlay).not.toBe(image);
		expect(overlay).toHaveAttribute("aria-hidden", "true");
		// The overlay must not add a second node to the a11y tree beside the image.
		expect(screen.getAllByRole("img")).toHaveLength(1);
	});

	test("hides the whole flag from the a11y tree when the wrapper is aria-hidden", () => {
		render(<Flag code="US" aria-hidden />);
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByAltText("flag for US")).toBeInTheDocument();
	});

	test("spreads arbitrary wrapper props onto the wrapper div", async () => {
		const onClick = vi.fn<() => void>();
		const user = userEvent.setup();
		render(
			<Flag
				code="US"
				id="billing-country"
				data-testid="flag"
				title="United States"
				onClick={onClick}
			/>,
		);
		const { wrapper, image } = getFlag("US");
		expect(wrapper).toHaveAttribute("id", "billing-country");
		expect(wrapper).toHaveAttribute("data-testid", "flag");
		expect(wrapper).toHaveAttribute("title", "United States");
		// The rest props belong to the wrapper API, not the image.
		expect(image).not.toHaveAttribute("id");
		expect(image).not.toHaveAttribute("title");
		await user.click(wrapper);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("attaches a ref to the wrapper div", () => {
		const ref = createRef<HTMLDivElement>();
		render(<Flag code="US" ref={ref} />);
		expect(ref.current).toBe(getFlag("US").wrapper);
	});

	test("a consumer className overrides the default sizing", () => {
		render(<Flag code="US" className="w-12" />);
		const { wrapper } = getFlag("US");
		expect(wrapper).toHaveClass("w-12");
		expect(wrapper).not.toHaveClass("w-8");
	});
});

describe("isCountryCode", () => {
	test.each(["US", "USA", "840", "JP", "JPN", "392", "ZA", "ZAF", "004"])("accepts %s", (value) => {
		expect(isCountryCode(value)).toBe(true);
	});

	test.each(["us", "usa", "Us", "ZZ", "ZZZ", "999", "84", "0840", " US", "US ", ""])(
		"rejects %o",
		(value) => {
			expect(isCountryCode(value)).toBe(false);
		},
	);

	test.each(nonStringValues)("rejects the non-string $label", ({ value }) => {
		expect(isCountryCode(value)).toBe(false);
	});

	test("narrows an unknown value to a code accepted by Flag", () => {
		const value: unknown = "US";
		if (!isCountryCode(value)) {
			throw new Error("expected US to be a country code");
		}
		// `value` is a `CountryCode` here, so it type-checks as Flag's `code` prop.
		render(<Flag code={value} />);
		expect(getFlag("US").image).toHaveAttribute("src", "https://assets.ngrok.com/flags/l/US.svg");
	});
});

describe("countryCodes", () => {
	test("has no duplicate entries", () => {
		// Regression: the hand-maintained list carried "016" twice.
		const duplicates = countryCodes.filter((code, index) => countryCodes.indexOf(code) !== index);
		expect(duplicates).toEqual([]);
		expect(new Set(countryCodes).size).toBe(countryCodes.length);
	});

	test("only contains uppercase, whitespace-free codes", () => {
		// The list mixes alpha-2, alpha-3, numeric, and subdivision/union forms ("GB-ENG",
		// "UNASUR"), but every entry is uppercase and URL-safe because it is interpolated
		// straight into the CDN path and matched case-sensitively by `isCountryCode`.
		const malformed = countryCodes.filter((code) => !/^[A-Z0-9]+(-[A-Z0-9]+)?$/.test(code));
		expect(malformed).toEqual([]);
	});
});
