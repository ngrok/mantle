import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, Fragment } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { Breadcrumb } from "./breadcrumb.js";

const Trail = ({ crumbs }: { crumbs: ReadonlyArray<string> }) => (
	<Breadcrumb.Root>
		<Breadcrumb.List>
			{crumbs.map((crumb, index) => (
				<Fragment key={crumb}>
					{index > 0 && <Breadcrumb.Separator />}
					<Breadcrumb.Item>
						{index === crumbs.length - 1 ? (
							<Breadcrumb.Page>{crumb}</Breadcrumb.Page>
						) : (
							<Breadcrumb.Link href={`/${crumb}`}>{crumb}</Breadcrumb.Link>
						)}
					</Breadcrumb.Item>
				</Fragment>
			))}
		</Breadcrumb.List>
	</Breadcrumb.Root>
);

describe("Breadcrumb", () => {
	test("Root renders a nav landmark labeled Breadcrumb by default", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
		expect(nav.tagName).toBe("NAV");
		expect(nav).toHaveAttribute("data-slot", "breadcrumb");
	});

	test("Root's default aria-label is overridable by the consumer", () => {
		render(
			<Breadcrumb.Root aria-label="Miettes de pain">
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Accueil</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		expect(screen.getByRole("navigation", { name: "Miettes de pain" })).toBeInTheDocument();
		expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).not.toBeInTheDocument();
	});

	test("Root renders as child element when asChild is true and keeps data-slot", () => {
		render(
			<Breadcrumb.Root asChild>
				<div data-testid="root">crumbs</div>
			</Breadcrumb.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveAttribute("data-slot", "breadcrumb");
		expect(root).toHaveAttribute("aria-label", "Breadcrumb");
	});

	// tailwind-merge override contract: min-w-0 is what lets the landmark shrink
	// inside a flex row, so a consumer's className must compose with it rather
	// than replace it — and a conflicting min-w-* must win outright.
	test("Root keeps its min-width default beside a consumer className", () => {
		render(
			<Breadcrumb.Root className="custom-class" data-testid="root">
				crumbs
			</Breadcrumb.Root>,
		);
		expect(screen.getByTestId("root").className).toBe("min-w-0 custom-class");
	});

	test("Root's min-width default loses to a consumer min-w-* utility", () => {
		render(
			<Breadcrumb.Root className="min-w-full" data-testid="root">
				crumbs
			</Breadcrumb.Root>,
		);
		expect(screen.getByTestId("root").className).toBe("min-w-full");
	});

	test("Root forwards a ref to the nav element", () => {
		const ref = createRef<HTMLElement>();
		render(<Breadcrumb.Root ref={ref}>crumbs</Breadcrumb.Root>);
		expect(ref.current).not.toBeNull();
		expect(ref.current?.tagName).toBe("NAV");
	});

	test("asChild composition accumulates the data-slot chain in DOM order", () => {
		render(
			<Breadcrumb.Item asChild>
				<Breadcrumb.Page data-testid="crumb">Current</Breadcrumb.Page>
			</Breadcrumb.Item>,
		);
		expect(screen.getByTestId("crumb")).toHaveAttribute(
			"data-slot",
			"breadcrumb-item breadcrumb-page",
		);
	});

	test("List renders an ordered list", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const list = screen.getByRole("list");
		expect(list.tagName).toBe("OL");
		expect(list).toHaveAttribute("data-slot", "breadcrumb-list");
	});

	// tailwind-merge override contract: a consumer's gap replaces the default one
	// instead of landing beside it, while the scroll treatment survives.
	test("List's gap default loses to a consumer gap utility", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List className="gap-3">
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const list = screen.getByRole("list");
		expect(list.className).toContain("gap-3");
		expect(list.className).not.toContain("gap-1.5");
		expect(list.className).toContain("overflow-x-auto");
	});

	// Cross-file spelling pin: `scroll-fade-x` is the @utility declared in
	// packages/mantle/src/mantle.css that masks the scrolled edges, so renaming
	// the class here without renaming it there silently drops the fade.
	test("List carries the scroll-fade-x edge mask", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		expect(screen.getByRole("list").className).toContain("scroll-fade-x");
	});

	test("Item renders a listitem and merges custom className", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item className="pl-2">
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const item = screen.getByRole("listitem");
		expect(item.tagName).toBe("LI");
		expect(item).toHaveAttribute("data-slot", "breadcrumb-item");
		expect(item.className).toContain("pl-2");
		expect(item.className).toContain("inline-flex");
	});

	test("Link renders an anchor with its href", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/endpoints");
		expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
	});

	test("Link renders as child element when asChild is true, merging className and keeping data-slot", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link asChild className="font-medium">
							<a href="/endpoints" className="router-link">
								Endpoints
							</a>
						</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });
		expect(link).toHaveAttribute("href", "/endpoints");
		expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
		expect(link.className).toContain("font-medium");
		expect(link.className).toContain("router-link");
	});

	test("Label renders a non-link crumb — no anchor, no aria-current", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Label>Settings</Breadcrumb.Label>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>General</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const label = screen.getByText("Settings");
		expect(label.tagName).toBe("SPAN");
		expect(label).toHaveAttribute("data-slot", "breadcrumb-label");
		expect(label).not.toHaveAttribute("aria-current");
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		// The prefix names a level, so it counts as a crumb — unlike a separator.
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByText("General")).toHaveAttribute("aria-current", "page");
	});

	test("Label renders as child element when asChild is true, merging className, data attributes, and ref", () => {
		const ref = createRef<HTMLElement>();
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Label asChild className="font-medium" ref={ref}>
							<span className="section-prefix" data-testid="label">
								Settings
							</span>
						</Breadcrumb.Label>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const label = screen.getByTestId("label");
		expect(label).toHaveAttribute("data-slot", "breadcrumb-label");
		expect(label.className).toContain("font-medium");
		expect(label.className).toContain("section-prefix");
		expect(ref.current).toBe(label);
	});

	test("Page renders a span with aria-current=page and is not a link", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const page = screen.getByText("Current");
		expect(page.tagName).toBe("SPAN");
		expect(page).toHaveAttribute("aria-current", "page");
		expect(page).toHaveAttribute("data-slot", "breadcrumb-page");
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	test("Page always emits aria-current=page — a consumer-supplied value cannot override it", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page aria-current="false">Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		expect(screen.getByText("Current")).toHaveAttribute("aria-current", "page");
	});

	test("Page enforces aria-current=page even when an asChild child supplies its own value", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page asChild>
							<span aria-current="false">Current</span>
						</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		expect(screen.getByText("Current")).toHaveAttribute("aria-current", "page");
	});

	test("Separator stays presentational even when an asChild child supplies its own role/aria-hidden", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator asChild>
						<li data-testid="separator" role="group" aria-hidden="false">
							/
						</li>
					</Breadcrumb.Separator>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const separator = screen.getByTestId("separator");
		expect(separator).toHaveAttribute("role", "presentation");
		expect(separator).toHaveAttribute("aria-hidden", "true");
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	test("Separator always stays presentational — consumer role/aria-hidden cannot override it", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator data-testid="separator" role="listitem" aria-hidden="false" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const separator = screen.getByTestId("separator");
		expect(separator).toHaveAttribute("role", "presentation");
		expect(separator).toHaveAttribute("aria-hidden", "true");
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	test("Separator renders an aria-hidden li with a default caret icon", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator data-testid="separator" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const separator = screen.getByTestId("separator");
		expect(separator.tagName).toBe("LI");
		expect(separator).toHaveAttribute("aria-hidden", "true");
		expect(separator).toHaveAttribute("role", "presentation");
		expect(separator).toHaveAttribute("data-slot", "breadcrumb-separator");
		expect(separator.querySelector("svg")).not.toBeNull();
	});

	test("Separator merges a consumer className beside its own", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Separator className="mx-2" data-testid="separator" />
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		// tailwind-merge override contract: mx-2 does not conflict with shrink-0, so
		// the consumer's spacing lands beside the part's own non-shrinking default.
		expect(screen.getByTestId("separator").className).toBe("shrink-0 mx-2");
	});

	test("Separator custom children replace the default caret", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Separator data-testid="separator">
						<span>/</span>
					</Breadcrumb.Separator>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const separator = screen.getByTestId("separator");
		expect(separator).toHaveTextContent("/");
		expect(separator.querySelector("svg")).toBeNull();
	});

	test("Skeleton renders one crumb-shaped placeholder with a status announcement", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/apps">Apps</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Skeleton itemCount={3} data-testid="skeleton" />
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const skeleton = screen.getByTestId("skeleton");
		expect(skeleton.tagName).toBe("LI");
		expect(skeleton).toHaveAttribute("data-slot", "breadcrumb-skeleton");
		// The placeholder is one crumb until the real items replace it.
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		// Three bars stand in for three crumbs, divided by two carets.
		expect(skeleton.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
		expect(skeleton.querySelectorAll("svg")).toHaveLength(2);
		expect(screen.getByRole("status")).toHaveTextContent("Loading breadcrumbs…");
	});

	test("Skeleton's announcement label is overridable for localization", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Skeleton itemCount={1} label="Chargement du fil d'Ariane…" />
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		expect(screen.getByRole("status")).toHaveTextContent("Chargement du fil d'Ariane…");
		expect(screen.queryByText("Loading breadcrumbs…")).not.toBeInTheDocument();
	});

	test("Skeleton merges className, forwards a ref, and hides its bars from assistive technology", () => {
		const ref = createRef<HTMLLIElement>();
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Skeleton itemCount={2} className="pl-2" ref={ref} data-testid="skeleton" />
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const skeleton = screen.getByTestId("skeleton");
		expect(ref.current).toBe(skeleton);
		expect(skeleton.className).toContain("pl-2");
		expect(skeleton.className).toContain("shrink-0");
		for (const bar of skeleton.querySelectorAll('[data-slot="skeleton"]')) {
			expect(bar).toHaveAttribute("aria-hidden", "true");
		}
	});

	test("Separators are excluded from the accessible listitem count", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>ep_2h8</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		// role="presentation" removes listitem semantics from separators.
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
	});

	test("full composition nests navigation > list > items in order", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>ep_2h8</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
		const list = screen.getByRole("list");
		expect(nav).toContainElement(list);
		const items = screen.getAllByRole("listitem");
		for (const item of items) {
			expect(list).toContainElement(item);
		}
		expect(items[0]).toHaveTextContent("Home");
		expect(items[1]).toHaveTextContent("Endpoints");
		expect(items[2]).toHaveTextContent("ep_2h8");
		expect(screen.getAllByRole("link")).toHaveLength(2);
		expect(screen.getByText("ep_2h8")).toHaveAttribute("aria-current", "page");
	});

	describe("List scroll position", () => {
		// happy-dom reports every layout metric as 0, so the trail's geometry comes
		// from prototype stubs. `scrollLeft` there is a plain property, which records
		// whatever offset the component assigns. The end of a trail is its scroll
		// width less the width of the row it has to fit into.
		const stubTrail = ({
			scrollWidth,
			clientWidth,
		}: {
			scrollWidth: number;
			clientWidth: number;
		}) => ({
			scrollWidth: vi
				.spyOn(HTMLElement.prototype, "scrollWidth", "get")
				.mockReturnValue(scrollWidth),
			clientWidth: vi
				.spyOn(HTMLElement.prototype, "clientWidth", "get")
				.mockReturnValue(clientWidth),
		});

		test("the trail starts at its end, so the current page is in view", () => {
			stubTrail({ scrollWidth: 400, clientWidth: 100 });
			render(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);
			expect(screen.getByRole("list").scrollLeft).toBe(300);
		});

		test("a navigation that swaps the crumbs re-pins the trail to its new end", () => {
			const { scrollWidth } = stubTrail({ scrollWidth: 400, clientWidth: 100 });
			const { rerender } = render(<Trail crumbs={["Home", "Endpoints"]} />);
			const list = screen.getByRole("list");
			expect(list.scrollLeft).toBe(300);

			scrollWidth.mockReturnValue(700);
			rerender(<Trail crumbs={["Home", "Endpoints", "Cloud Endpoints", "ep_2h8"]} />);
			expect(list.scrollLeft).toBe(600);
		});

		test("a re-render that leaves the trail unchanged keeps the reader's scroll position", () => {
			stubTrail({ scrollWidth: 400, clientWidth: 100 });
			const { rerender } = render(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);
			const list = screen.getByRole("list");

			// The reader scrolls back to the root of the hierarchy.
			list.scrollLeft = 0;
			rerender(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);
			expect(list.scrollLeft).toBe(0);
		});

		test("a crumb under focus keeps its place when the trail changes around it", async () => {
			const user = userEvent.setup();
			const { scrollWidth } = stubTrail({ scrollWidth: 400, clientWidth: 100 });
			const { rerender } = render(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);
			const list = screen.getByRole("list");

			await user.tab();
			// The reader is reading the crumb they tabbed to, wherever it sits.
			list.scrollLeft = 40;

			scrollWidth.mockReturnValue(700);
			rerender(<Trail crumbs={["Home", "Endpoints", "Cloud Endpoints", "ep_2h8"]} />);

			expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();
			expect(list.scrollLeft).toBe(40);
		});

		test("a trail that could not be measured at first pins once it can", () => {
			// A trail first rendered inside a display:none ancestor measures zero on
			// every axis, so the end it has to reach only exists once it is shown.
			const { scrollWidth, clientWidth } = stubTrail({ scrollWidth: 0, clientWidth: 0 });
			const { rerender } = render(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);
			const list = screen.getByRole("list");

			scrollWidth.mockReturnValue(400);
			clientWidth.mockReturnValue(100);
			rerender(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);

			expect(list.scrollLeft).toBe(300);
		});
	});

	test("the server render carries the whole trail, scroll container and all", () => {
		const html = renderToString(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);

		// The scroll pin runs in an effect, so nothing about it may hold the trail
		// back to the client: the first paint has to be the finished trail, not an
		// empty row that fills in after hydration.
		expect(html).toContain('data-slot="breadcrumb-list"');
		expect(html).toContain("Endpoints");
		expect(html).toContain('aria-current="page"');
		expect(html).toContain("ep_2h8");
	});

	test("focus reaching a crumb scrolls nothing itself", async () => {
		const user = userEvent.setup();
		const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
		render(<Trail crumbs={["Home", "Endpoints", "ep_2h8"]} />);

		await user.tab();

		// Bringing a tabbed-to crumb into view is the browser's own job, driven by
		// the list's scroll padding. Doing it here as well would fire between a
		// press and its release and slide the crumb out from under the pointer,
		// so the click would land on whatever replaced it.
		expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();
		expect(scrollIntoView).not.toHaveBeenCalled();
	});
});
