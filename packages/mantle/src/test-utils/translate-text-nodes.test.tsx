/**
 * Pins the mechanism table published at
 * `apps/www/app/docs/browser-translation.mdx`. Every row there is a promise a
 * consumer designs against, so each shape below is reproduced rather than
 * reasoned about. Two rows shipped too wide until 2026-09-14: a reorder is safe
 * only away from text, and an unmount is safe only for a subtree that owns a
 * host node.
 */

import { render } from "@testing-library/react";
import { Fragment } from "react";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "./translate-text-nodes.js";

/**
 * Flatten a commit error into one string. React batches a placement error as an
 * `AggregateError` of `DOMException`s and a deletion error as a bare one, so a
 * test that asserts the DOM's message has to cover both shapes.
 */
function domErrors(error: unknown): string {
	const inner = error instanceof AggregateError ? error.errors : [error];
	return inner.map(String).join("\n");
}

/** Run `action` and return the DOM messages it threw, or `""` when it threw nothing. */
function caughtFrom(action: () => void): string {
	try {
		action();
	} catch (error) {
		return domErrors(error);
	}
	return "";
}

const INSERT_FAILED =
	"The node before which the new node is to be inserted is not a child of this node";
const REMOVE_FAILED = "The node to be removed is not a child of this node";

function Chips({ ids, total }: { ids: string[]; total?: string }) {
	return (
		<div>
			{ids.map((id) => (
				<span data-chip={id} key={id}>
					{id}
				</span>
			))}
			{total}
		</div>
	);
}

type Entry = { id: string; term: string; description: string };

function FragmentEntries({ entries }: { entries: Entry[] }) {
	return (
		<dl>
			{entries.map((entry) => (
				<Fragment key={entry.id}>
					<dt>{entry.term}</dt>
					{entry.description}
				</Fragment>
			))}
		</dl>
	);
}

function ArrayEntry({ entry }: { entry: Entry }) {
	return [<dt key="term">{entry.term}</dt>, entry.description];
}

function TextReturningLabel({ text }: { text: string }) {
	return text;
}

function HostEntries({ entries }: { entries: Entry[] }) {
	return (
		<dl>
			{entries.map((entry) => (
				<div key={entry.id}>
					<dt>{entry.term}</dt>
					{entry.description}
				</div>
			))}
		</dl>
	);
}

const ALPHA: Entry = { id: "alpha", term: "Alpha", description: "The first entry." };
const BRAVO: Entry = { id: "bravo", term: "Bravo", description: "The second entry." };
const ENTRIES: Entry[] = [ALPHA, BRAVO];

describe("translateTextNodes", () => {
	test("a keyed re-sort in front of a bare text child throws", () => {
		const { container, rerender } = render(
			<Chips ids={["alpha", "bravo", "charlie"]} total="Total: 3 items" />,
		);
		translateTextNodes(container);

		const thrown = caughtFrom(() => {
			rerender(<Chips ids={["charlie", "alpha", "bravo"]} total="Total: 3 items" />);
		});

		expect(thrown).toContain(INSERT_FAILED);
	});

	test("a keyed re-sort away from text, and an element removal beside text, both survive", () => {
		const resorted = render(<Chips ids={["alpha", "bravo", "charlie"]} />);
		translateTextNodes(resorted.container);
		resorted.rerender(<Chips ids={["charlie", "alpha", "bravo"]} />);
		expect(chipOrder(resorted.container)).toEqual(["charlie", "alpha", "bravo"]);
		expect(resorted.container.textContent).toContain("[alpha-es]");

		const removed = render(<Chips ids={["alpha", "bravo", "charlie"]} total="Total: 3 items" />);
		translateTextNodes(removed.container);
		removed.rerender(<Chips ids={["alpha", "charlie"]} total="Total: 3 items" />);
		expect(chipOrder(removed.container)).toEqual(["alpha", "charlie"]);
		expect(removed.container.textContent).toContain("[Total: 3 items-es]");
	});

	test("removing a parent with no host node of its own throws on its bare text child", () => {
		const fragments = render(<FragmentEntries entries={ENTRIES} />);
		translateTextNodes(fragments.container);
		const fragmentThrown = caughtFrom(() => {
			fragments.rerender(<FragmentEntries entries={ENTRIES.slice(0, 1)} />);
		});
		expect(fragmentThrown).toContain(REMOVE_FAILED);

		const array = render(
			<dl>
				<ArrayEntry entry={ALPHA} />
			</dl>,
		);
		translateTextNodes(array.container);
		const arrayThrown = caughtFrom(() => {
			array.rerender(<dl />);
		});
		expect(arrayThrown).toContain(REMOVE_FAILED);
	});

	test("a lone string, number, or bigint child of a host element self-heals", () => {
		// The row every label slot is designed toward. React takes the
		// `shouldSetTextContent` fast path for all three primitives, so the update
		// is a `textContent` write that wipes the `<font>` rather than a removal
		// aimed at a node the parent no longer owns.
		for (const [before, after] of [
			["Alpha", <strong key="a">Bravo</strong>],
			[7, <strong key="b">Bravo</strong>],
			[7n, <strong key="c">Bravo</strong>],
		] as const) {
			const { container, rerender, unmount } = render(<p>{before}</p>);
			translateTextNodes(container);
			expect(container.querySelector("font")).not.toBeNull();

			rerender(<p>{after}</p>);

			expect(container.querySelector("font")).toBeNull();
			expect(container.querySelector("strong")).toHaveTextContent("Bravo");
			unmount();
		}
	});

	test("a component that returns bare text at its root is not that lone child", () => {
		// The distinction the table's last row turns on. The component owns no host
		// node, so React builds a real `HostText` fiber and removes it by itself
		// instead of writing through the parent's `textContent`.
		const { container, rerender } = render(
			<p>
				<TextReturningLabel text="Alpha" />
			</p>,
		);
		translateTextNodes(container);

		const thrown = caughtFrom(() => {
			rerender(
				<p>
					<strong>Bravo</strong>
				</p>,
			);
		});

		expect(thrown).toContain(REMOVE_FAILED);
	});

	test("removing a subtree that owns a host node survives", () => {
		const { container, rerender } = render(<HostEntries entries={ENTRIES} />);
		translateTextNodes(container);

		rerender(<HostEntries entries={ENTRIES.slice(0, 1)} />);

		expect(container.querySelectorAll("dt")).toHaveLength(1);
		expect(container.textContent).toContain("[Alpha-es]");
	});
});

function chipOrder(container: HTMLElement): (string | null)[] {
	return Array.from(container.querySelectorAll("[data-chip]")).map((node) =>
		node.getAttribute("data-chip"),
	);
}
