import { describe, expect, test } from "vitest";
import { cx } from "./cx.js";

describe("cx", () => {
	test("given '', returns ''", () => {
		expect(cx("")).toBe("");
	});

	test("given {},[],false,null,undefined, returns ''", () => {
		expect(cx({}, [], false, null, undefined)).toBe("");
	});

	test("given 'a', returns 'a'", () => {
		expect(cx("a")).toBe("a");
	});

	test("given 'pb-6 pb-8, returns 'pb-8'", () => {
		expect(cx("pb-6 pb-8")).toBe("pb-8");
	});

	test("given 'pb-8 pb-6, returns 'pb-6'", () => {
		expect(cx("pb-8 pb-6")).toBe("pb-6");
	});

	test("given 'p-4 pt-5 pb-6 pr-3 pb-3', returns 'p-4 pt-5 pr-3 pb-3'", () => {
		expect(cx("p-4 pt-5 pb-6 pr-3 pb-3")).toBe("p-4 pt-5 pr-3 pb-3");
	});

	test("given 'p-4 pb-6 not-a-tailwind-class pb-3', returns 'p-4 not-a-tailwind-class pb-3'", () => {
		expect(cx("p-4 pb-6 not-a-tailwind-class pb-3")).toBe("p-4 not-a-tailwind-class pb-3");
	});

	test('given "text-red mb-2 text-base leading-4", returns "text-red mb-2 text-base leading-4"', () => {
		expect(cx("text-red mb-2 text-base leading-4")).toBe("text-red mb-2 text-base leading-4");
	});

	test('given "text-red mb-2 text-base leading-4 text-blue text-xl leading-5", returns "mb-2 text-blue text-xl leading-5"', () => {
		expect(cx("text-red mb-2 text-base leading-4 text-blue text-xl leading-5")).toBe(
			"mb-2 text-blue text-xl leading-5",
		);
	});

	test('given "text-red mb-2 text-base leading-4 text-xl", returns "text-red mb-2 text-xl"', () => {
		expect(cx("text-red mb-2 text-base leading-4 text-xl")).toBe("text-red mb-2 text-xl");
	});

	test("conditional font color applies correctly", () => {
		// oxlint-disable-next-line no-constant-binary-expression
		expect(cx("text-red", false && "text-blue", true && "text-gold")).toBe("text-gold");
	});

	test("text-mono can be overridden by text-base", () => {
		expect(cx("text-mono text-base")).toBe("text-base");
	});

	test("text-base can be overridden by text-mono", () => {
		expect(cx("text-base text-mono")).toBe("text-mono");
	});

	test("text-mono with other classes and text-xl override", () => {
		expect(cx("font-mono text-mono p-4 text-xl")).toBe("font-mono p-4 text-xl");
	});

	test("text-size-inherit can be overridden by text-base", () => {
		expect(cx("text-size-inherit text-base")).toBe("text-base");
	});

	test("text-base can be overridden by text-size-inherit", () => {
		expect(cx("text-base text-size-inherit")).toBe("text-size-inherit");
	});

	test("w-4 can be overridden by w-em", () => {
		expect(cx("w-4 w-em")).toBe("w-em");
	});

	test("h-em can be overridden by h-6", () => {
		expect(cx("h-em h-6")).toBe("h-6");
	});

	test("p-em can be overridden by p-2", () => {
		expect(cx("p-em p-2")).toBe("p-2");
	});

	test("gap-4 can be overridden by gap-em", () => {
		expect(cx("gap-4 gap-em")).toBe("gap-em");
	});
});

describe("cx — mantle overrides (no extendTailwindMerge call)", () => {
	test("text-mono and text-size-inherit conflict (font-size group)", () => {
		expect(cx("text-mono text-size-inherit")).toBe("text-size-inherit");
		expect(cx("text-size-inherit text-mono")).toBe("text-mono");
	});

	test("text-mono / text-size-inherit conflict with tshirt sizes", () => {
		expect(cx("text-xl text-mono")).toBe("text-mono");
		expect(cx("text-mono text-2xl")).toBe("text-2xl");
		expect(cx("text-size-inherit text-sm")).toBe("text-sm");
	});

	test("em is a recognized spacing value across spacing utilities", () => {
		expect(cx("m-em m-4")).toBe("m-4");
		expect(cx("px-2 px-em")).toBe("px-em");
		expect(cx("mt-em mt-4")).toBe("mt-4");
		expect(cx("size-4 size-em")).toBe("size-em");
	});

	test("em utilities still merge per-axis like other spacing", () => {
		// p-em sets all sides; a later pt-2 overrides only the top
		expect(cx("p-em pt-2")).toBe("p-em pt-2");
		expect(cx("px-em pl-4")).toBe("px-em pl-4");
	});
});

describe("cx — value shapes (clsx parity)", () => {
	test("object syntax includes truthy keys, drops falsy", () => {
		expect(cx({ "p-4": true, "p-8": false, "m-2": true })).toBe("p-4 m-2");
	});

	test("object syntax resolves conflicts left-to-right by insertion order", () => {
		expect(cx({ "p-4": true, "p-8": true })).toBe("p-8");
	});

	test("arrays are flattened recursively", () => {
		expect(cx(["px-4", ["py-2", ["text-sm"]]])).toBe("px-4 py-2 text-sm");
	});

	test("falsy values are ignored (false, null, undefined, 0, '')", () => {
		expect(cx("base", false, null, undefined, 0, "")).toBe("base");
	});

	test("numbers are coerced to strings", () => {
		expect(cx(1, "px-4")).toBe("1 px-4");
	});

	test("mixed strings, arrays, objects, and conditionals", () => {
		const isActive = true;
		const isDisabled = false;
		expect(
			cx("flex items-center", ["gap-2", isActive && "bg-blue-500"], {
				"opacity-50": isDisabled,
				rounded: true,
			}),
		).toBe("flex items-center gap-2 bg-blue-500 rounded");
	});

	test("consumer className overrides component defaults (prop-override use case)", () => {
		const className = "bg-red-500";
		expect(cx("bg-blue-500 text-white px-4 py-2 rounded", className)).toBe(
			"text-white px-4 py-2 rounded bg-red-500",
		);
	});
});

describe("cx — modifiers, important, postfix, arbitrary", () => {
	test("variant modifiers scope conflicts", () => {
		expect(cx("hover:bg-red-500 hover:bg-blue-500")).toBe("hover:bg-blue-500");
		expect(cx("md:p-4 md:p-8")).toBe("md:p-8");
		// different modifiers do not conflict
		expect(cx("p-4 hover:p-8")).toBe("p-4 hover:p-8");
	});

	test("important modifier (Tailwind v4 trailing and legacy leading)", () => {
		expect(cx("p-4! p-8!")).toBe("p-8!");
		expect(cx("!p-4 !p-8")).toBe("!p-8");
		// important and non-important are distinct conflict keys
		expect(cx("p-4 p-8!")).toBe("p-4 p-8!");
	});

	test("postfix (opacity) modifier", () => {
		expect(cx("bg-red-500/50 bg-red-500/75")).toBe("bg-red-500/75");
		expect(cx("text-black/50 text-black/80")).toBe("text-black/80");
	});

	test("arbitrary values conflict within their group", () => {
		expect(cx("w-[10px] w-[20px]")).toBe("w-[20px]");
		expect(cx("p-[3px] p-[5px]")).toBe("p-[5px]");
		expect(cx("w-4 w-[20px]")).toBe("w-[20px]");
	});

	test("arbitrary properties conflict by property name", () => {
		expect(cx("[mask-type:luminance] [mask-type:alpha]")).toBe("[mask-type:alpha]");
		expect(cx("[r:var(--radius)] origin-center")).toBe("[r:var(--radius)] origin-center");
	});

	test("negative values", () => {
		expect(cx("-mt-2 -mt-4")).toBe("-mt-4");
		expect(cx("-z-10 z-20")).toBe("z-20");
	});
});

describe("cx — responsive breakpoint modifiers", () => {
	// Mantle layers custom breakpoints on top of Tailwind's defaults in mantle.css
	// (`--breakpoint-2xs: 22.5rem`, `--breakpoint-xs: 30rem`). The merge engine never validates a
	// variant prefix against a configured breakpoint/screens list — every prefix, custom or
	// built-in, is parsed and sorted as an opaque modifier. So mantle's custom breakpoints get
	// conflict-scoped exactly like the built-ins with zero extra config: distinct breakpoints get
	// distinct conflict keys and all survive, while same-breakpoint utilities in the same group
	// collapse to the last. These cases lock that behavior in. Regression coverage for the
	// reported `xs:gap-3 md:gap-4` blog layout.
	test("different breakpoints on the same utility never conflict", () => {
		expect(cx("pb-8 flex flex-col xs:gap-3 md:gap-4")).toBe("pb-8 flex flex-col xs:gap-3 md:gap-4");
		expect(cx("gap-1 2xs:gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6")).toBe(
			"gap-1 2xs:gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6",
		);
	});

	test("custom mantle breakpoints (2xs, xs) behave like built-in ones", () => {
		// same breakpoint + same group => last wins
		expect(cx("xs:gap-3 xs:gap-5")).toBe("xs:gap-5");
		expect(cx("2xs:p-2 2xs:p-4")).toBe("2xs:p-4");
		// custom breakpoints are distinct conflict keys from each other and from built-ins
		expect(cx("xs:gap-3 2xs:gap-3")).toBe("xs:gap-3 2xs:gap-3");
		expect(cx("xs:gap-3 sm:gap-3")).toBe("xs:gap-3 sm:gap-3");
	});

	test("a base utility and its breakpoint variant coexist", () => {
		expect(cx("hidden xs:block")).toBe("hidden xs:block");
		expect(cx("gap-0 xs:gap-3")).toBe("gap-0 xs:gap-3");
	});

	test("breakpoints compose with state modifiers and still scope conflicts", () => {
		expect(cx("xs:hover:gap-3 xs:hover:gap-5")).toBe("xs:hover:gap-5");
		expect(cx("xs:hover:gap-3 md:hover:gap-4")).toBe("xs:hover:gap-3 md:hover:gap-4");
	});

	test("breakpoint modifiers survive when split across args", () => {
		expect(cx("flex flex-col", "xs:gap-3", "md:gap-4")).toBe("flex flex-col xs:gap-3 md:gap-4");
	});
});

describe("cx — tagged-template form", () => {
	test("merges a static template", () => {
		expect(cx`px-2 px-4`).toBe("px-4");
	});

	test("merges with a truthy interpolation", () => {
		const active = true;
		expect(cx`px-2 px-4 ${active && "bg-blue-500"}`).toBe("px-4 bg-blue-500");
	});

	test("falsy interpolations are dropped", () => {
		const active = false;
		expect(cx`px-2 ${active && "bg-blue-500"} py-1`).toBe("px-2 py-1");
	});

	test("interpolation participates in conflict resolution", () => {
		const override = "text-blue-500";
		expect(cx`text-red-500 ${override}`).toBe("text-blue-500");
	});

	test("object interpolation resolves like the variadic form", () => {
		expect(cx`p-2 ${{ "p-8": true }}`).toBe("p-8");
	});

	test("repeated identical calls return identical output (cache-stable)", () => {
		const render = (active: boolean) => cx`px-2 px-4 ${active && "bg-blue-500"}`;
		expect(render(true)).toBe("px-4 bg-blue-500");
		expect(render(true)).toBe("px-4 bg-blue-500");
		expect(render(false)).toBe("px-4");
		expect(render(true)).toBe("px-4 bg-blue-500");
	});

	test("mutated object interpolation is not wrongly cached", () => {
		const dynamic: Record<string, boolean> = { "p-4": true };
		expect(cx`base ${dynamic}`).toBe("base p-4");
		dynamic["p-4"] = false;
		dynamic["p-8"] = true;
		expect(cx`base ${dynamic}`).toBe("base p-8");
	});
});

describe("cx — caching correctness", () => {
	test("same first arg, different rest args do not cross-contaminate", () => {
		expect(cx("p-4", "p-8")).toBe("p-8");
		expect(cx("p-4", "p-2")).toBe("p-2");
		expect(cx("p-4", "p-8")).toBe("p-8");
		expect(cx("p-4", "m-2")).toBe("p-4 m-2");
	});

	test("repeated variadic calls are stable", () => {
		for (let index = 0; index < 1000; index++) {
			expect(cx("flex", "p-4", "p-8", index % 2 === 0 && "text-red-500")).toBe(
				index % 2 === 0 ? "flex p-8 text-red-500" : "flex p-8",
			);
		}
	});

	test("mutated object arg is reflected, not stale-cached", () => {
		const dynamic: Record<string, boolean> = { "p-4": true };
		expect(cx("base", dynamic)).toBe("base p-4");
		dynamic["p-4"] = false;
		dynamic["p-8"] = true;
		expect(cx("base", dynamic)).toBe("base p-8");
	});

	test("single truthy string among falsy args", () => {
		expect(cx(false, "p-4 p-8", null)).toBe("p-8");
	});
});
