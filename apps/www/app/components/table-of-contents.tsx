import { cx } from "@ngrok/mantle/cx";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import type { TocEntry } from "~/utilities/docs";

// Matches the `scroll-mt-24` (6rem = 96px) on `HashLinkHeading`. Aligning the
// trigger with where headings land after a hash-link click ensures the clicked
// entry — not its predecessor — is the one marked active.
const HEADER_OFFSET = 96;
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
	const [activeId, setActiveId] = useState<string | undefined>(() => entries[0]?.id);
	const location = useLocation();

	useEffect(() => {
		if (entries.length === 0) {
			return;
		}
		// Depend on `location.hash` so ToC link clicks update the highlight
		// immediately — otherwise scroll-based detection lags the smooth-scroll
		// animation and briefly highlights the predecessor heading.
		const hash = location.hash.slice(1);
		if (hash && entries.some((entry) => entry.id === hash)) {
			setActiveId(hash);
		}
	}, [entries, location.hash]);

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
			// Round to whole pixels so a heading landing at the scroll-margin
			// position (where `offsetTop` and `trigger` are mathematically equal)
			// can't be off-by-sub-pixel and lose the `<=` check to its predecessor.
			const trigger = Math.round(
				scrollTop + HEADER_OFFSET + smoothstep * (clientHeight - HEADER_OFFSET),
			);

			let next: string | undefined;
			for (const entry of entries) {
				const element = document.getElementById(entry.id);
				if (!element) {
					continue;
				}
				const offsetTop = Math.round(element.getBoundingClientRect().top + scrollTop);
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

/**
 * A table of contents sidebar listing h1/h2/h3 headings from the current MDX
 * page and highlighting the active section based on scroll position.
 */
export function TableOfContents({ entries }: { entries: Array<TocEntry> }) {
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

	if (entries.length === 0) {
		return null;
	}

	return (
		<nav
			aria-label="Table of contents"
			className="sticky top-15 flex max-h-[calc(100vh-3.75rem)] w-40 flex-col pt-4"
		>
			<p className="mb-3 text-xs font-medium uppercase tracking-wider font-mono">On this page</p>
			<div className="scroll-fade-y scrollbar min-h-0 flex-1 overflow-y-auto pb-4">
				<ol className="space-y-1 border-l border-gray-300">
					{entries.map((entry) => (
						<li
							key={entry.id}
							// Keep active entries clear of the scroll-fade-y edge fade when auto-scrolled into view.
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
									// 3px left bar that overlays the ol's 1px gray edge (descendant
									// paints over ancestor) and extends 2px rightward into the content
									// area. We can't extend leftward — the scroll container's `overflow-y-auto`
									// implicitly clips horizontal overflow, so any negative-margin
									// extension just gets cut off. Padding compensates so content text
									// position stays the same as the previous 1px-bar layout.
									"relative -ml-px block border-l-[3px] py-1 text-xs leading-snug transition-colors",
									// Focus ring is a pseudo-element offset past the 3px bar so the
									// active/gray left edge stays visible through the focused area.
									"focus:outline-hidden",
									"focus-visible:before:pointer-events-none focus-visible:before:absolute",
									"focus-visible:before:inset-y-0 focus-visible:before:left-0.75 focus-visible:before:right-0",
									"focus-visible:before:rounded-md focus-visible:before:content-['']",
									"focus-visible:before:ring-3 focus-visible:before:ring-inset focus-visible:before:ring-focus-accent",
									entry.level <= 2 ? "pl-2.5" : "pl-5.5",
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
			</div>
		</nav>
	);
}
