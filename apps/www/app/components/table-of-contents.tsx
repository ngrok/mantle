import { cx } from "@ngrok/mantle/cx";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";
import { ScrollMask } from "./scroll-mask";

type TocEntry = {
	/** The heading's `id` attribute (from rehype-slug). */
	id: string;
	/** The visible text content of the heading. */
	text: string;
	/** The heading level (1, 2, or 3). */
	level: number;
};

/**
 * Extracts h1, h2, and h3 headings from a container element.
 * Only includes headings that have an `id` attribute (added by rehype-slug).
 */
function getHeadings(container: HTMLElement): Array<TocEntry> {
	const headings = container.querySelectorAll<HTMLHeadingElement>("h1[id], h2[id], h3[id]");
	const entries: Array<TocEntry> = [];
	for (const heading of headings) {
		const id = heading.id;
		const text = heading.textContent?.trim();
		if (id && text) {
			entries.push({
				id,
				text,
				level: Number(heading.tagName[1]),
			});
		}
	}
	return entries;
}

const HEADER_OFFSET = 80;
const EASE_START = 0.75;

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

/**
 * Tracks which heading is currently "active" by computing a virtual trigger
 * line in document coordinates. The trigger line sits just below the sticky
 * header for most of the page, then eases toward the viewport bottom as the
 * user approaches the end of the page so headings that can't physically reach
 * the usual trigger line (the last few on a long page) still activate.
 *
 * See https://thirty-five.com/overengineered-anchoring.
 */
function useActiveHeading(entries: Array<TocEntry>): string | undefined {
	const [activeId, setActiveId] = useState<string | undefined>(undefined);
	const location = useLocation();

	useEffect(() => {
		setActiveId(undefined);
	}, [location.pathname]);

	useEffect(() => {
		if (entries.length === 0) {
			return;
		}
		const hash = window.location.hash.slice(1);
		const initial = hash && entries.some((entry) => entry.id === hash) ? hash : entries[0]?.id;
		setActiveId(initial);
	}, [entries]);

	useEffect(() => {
		if (entries.length === 0) {
			return;
		}

		let rafId: number | undefined;

		const compute = () => {
			rafId = undefined;
			const scroller = document.scrollingElement ?? document.documentElement;
			const { scrollTop, scrollHeight, clientHeight } = scroller;
			const maxScroll = Math.max(1, scrollHeight - clientHeight);

			const progress = clamp01(scrollTop / maxScroll);
			const easeT = clamp01((progress - EASE_START) / (1 - EASE_START));
			const smoothstep = easeT * easeT * (3 - 2 * easeT);
			const trigger = scrollTop + HEADER_OFFSET + smoothstep * (clientHeight - HEADER_OFFSET);

			let next: string | undefined;
			for (const entry of entries) {
				const element = document.getElementById(entry.id);
				if (!element) {
					continue;
				}
				const offsetTop = element.getBoundingClientRect().top + scrollTop;
				if (offsetTop <= trigger) {
					next = entry.id;
				} else {
					break;
				}
			}
			setActiveId(next ?? entries[0]?.id);
		};

		const schedule = () => {
			if (rafId == null) {
				rafId = requestAnimationFrame(compute);
			}
		};

		compute();
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		return () => {
			if (rafId != null) {
				cancelAnimationFrame(rafId);
			}
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
		};
	}, [entries]);

	return activeId;
}

/** The id of the DOM element where the ToC portals into (placed in layout.tsx). */
const TOC_PORTAL_ID = "toc-portal";

/**
 * A table of contents sidebar that portals outside of `<main>` into a layout-level
 * container. Lists h2/h3 headings from the current MDX page and highlights the
 * active section based on scroll position.
 *
 * The portal target (`#toc-portal`) is rendered in `layout.tsx` alongside `<main>`.
 *
 * The `contentRef` should point to the container element that holds the MDX content
 * so headings can be extracted from it.
 */
function TableOfContents({ contentRef }: { contentRef: RefObject<HTMLDivElement | null> }) {
	const [entries, setEntries] = useState<Array<TocEntry>>([]);
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
	const location = useLocation();

	useEffect(() => {
		setPortalTarget(document.getElementById(TOC_PORTAL_ID));
	}, []);

	const updateEntries = useCallback(() => {
		if (contentRef.current) {
			setEntries(getHeadings(contentRef.current));
		}
	}, [contentRef]);

	// MutationObserver catches Suspense-deferred MDX that mounts after the route effect fires.
	useEffect(() => {
		updateEntries();

		const container = contentRef.current;
		if (!container) {
			return;
		}

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
				for (const node of nodes) {
					if (!(node instanceof HTMLElement)) {
						continue;
					}

					const tagName = node.tagName;
					if ((tagName === "H1" || tagName === "H2" || tagName === "H3") && node.id) {
						updateEntries();
						return;
					}

					if (node.querySelector("h1[id], h2[id], h3[id]")) {
						updateEntries();
						return;
					}
				}
			}
		});
		observer.observe(container, { childList: true, subtree: true });
		return () => {
			observer.disconnect();
		};
	}, [location.pathname, updateEntries, contentRef]);

	const activeId = useActiveHeading(entries);
	const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

	useEffect(() => {
		if (!activeId) {
			return;
		}
		const element = itemRefs.current.get(activeId);
		if (element) {
			element.scrollIntoView({ block: "nearest" });
		}
	}, [activeId]);

	if (entries.length === 0 || !portalTarget) {
		return null;
	}

	return createPortal(
		<nav
			aria-label="Table of contents"
			className="sticky top-15 flex max-h-[calc(100vh-3.75rem)] w-40 flex-col pt-4"
		>
			<p className="mb-3 text-xs font-medium uppercase tracking-wider font-mono">On this page</p>
			<ScrollMask className="scrollbar min-h-0 flex-1 overflow-y-auto pb-4">
				<ol className="space-y-1 border-l border-gray-300">
					{entries.map((entry) => (
						<li
							key={entry.id}
							// Keep active entries clear of the ScrollMask fade when auto-scrolled into view.
							className="scroll-my-6"
							ref={(node) => {
								if (node) {
									itemRefs.current.set(entry.id, node);
								} else {
									itemRefs.current.delete(entry.id);
								}
							}}
						>
							<Link
								to={{ hash: entry.id }}
								preventScrollReset
								aria-current={activeId === entry.id ? "location" : undefined}
								className={cx(
									"-ml-px block border-l py-1 text-xs leading-snug transition-colors",
									entry.level <= 2 ? "pl-3" : "pl-6",
									activeId === entry.id
										? "text-strong border-accent-500 font-medium"
										: "text-muted border-transparent hover:text-strong hover:border-gray-400",
								)}
							>
								{entry.text}
							</Link>
						</li>
					))}
				</ol>
			</ScrollMask>
		</nav>,
		portalTarget,
	);
}

export {
	//,
	TableOfContents,
	TOC_PORTAL_ID,
};
