/**
 * Runtime fold/unfold behavior for `CodeBlock.Code` lives in this module so it
 * can be unit-tested independently of React. The implementation deliberately
 * keeps all interaction state in the DOM and uses a single delegated event
 * handler per `<pre>`: no per-line listeners, no React re-renders on toggle.
 *
 * Why event delegation: GitHub's diff-line performance work showed that
 * attaching listeners per line scales poorly past ~1000 rows. A single
 * top-level listener with attribute-based dispatch keeps memory overhead
 * constant and avoids React reconciliation entirely.
 *
 * @see https://github.blog/engineering/architecture-optimization/the-uphill-climb-of-making-diff-lines-performant/
 */

/**
 * Cached per-`<code>` fold geometry. Built lazily on first interaction and
 * invalidated by `clearRegionLinesCache` whenever the inner HTML is replaced.
 */
type FoldGeometry = {
	/** Map from fold-region ID → the line elements that belong to that region. */
	regionToLines: Map<string, HTMLElement[]>;
	/**
	 * Per-line cache of parent fold-region IDs as a `Set`. Pre-parsed at
	 * map-build time so toggles can avoid re-splitting `data-fold-regions`
	 * on every affected line every click. This matters when 1000+ lines belong
	 * to the toggled region.
	 */
	lineToRegions: WeakMap<HTMLElement, Set<string>>;
};

const FOLD_GEOMETRY_CACHE = new WeakMap<Element, FoldGeometry>();

/** How long a fold opens or closes. `mantle.css` holds the same duration. */
const FOLD_MOTION_MS = 200;

/** The most lines that animate in one toggle. */
const FOLD_MOTION_LINE_LIMIT = 50;

/** The toggle that last showed each line, so the timer of an older toggle leaves a newer open alone. */
const LINE_SHOWN_BY = new WeakMap<HTMLElement, number>();
let lastToggle = 0;

/**
 * Splits a space-separated string into a `Set`, dropping empty entries. Used
 * to parse `data-fold-regions` and `data-folded-regions` attribute values.
 */
function parseSpaceSeparated(value: string | null | undefined): Set<string> {
	const set = new Set<string>();
	if (value == null || value === "") {
		return set;
	}
	for (const part of value.split(" ")) {
		if (part !== "") {
			set.add(part);
		}
	}
	return set;
}

/**
 * Builds (and memoizes per `<code>` element) the {@link FoldGeometry} index.
 * Lazy on first interaction so initial render cost stays at zero.
 *
 * If a cached geometry exists but its first cached line element is no longer
 * connected to the DOM, the cache is treated as stale (typically because
 * something replaced the `<code>`'s `innerHTML` without going through the
 * `clearRegionLinesCache` path) and rebuilt from the current children.
 */
function getFoldGeometry(codeElement: Element): FoldGeometry {
	const cached = FOLD_GEOMETRY_CACHE.get(codeElement);
	if (cached != null && isGeometryConnected(cached)) {
		return cached;
	}
	const regionToLines = new Map<string, HTMLElement[]>();
	const lineToRegions = new WeakMap<HTMLElement, Set<string>>();
	const lineElements = codeElement.querySelectorAll("[data-fold-regions]");
	for (let index = 0; index < lineElements.length; index += 1) {
		const lineElement = lineElements[index];
		if (!(lineElement instanceof HTMLElement)) {
			continue;
		}
		const regions = parseSpaceSeparated(lineElement.dataset.foldRegions);
		if (regions.size === 0) {
			continue;
		}
		lineToRegions.set(lineElement, regions);
		for (const region of regions) {
			let lines = regionToLines.get(region);
			if (lines == null) {
				lines = [];
				regionToLines.set(region, lines);
			}
			lines.push(lineElement);
		}
	}
	const geometry: FoldGeometry = { regionToLines, lineToRegions };
	FOLD_GEOMETRY_CACHE.set(codeElement, geometry);
	return geometry;
}

/** Resets the per-element cache. Called when the code block re-renders new content. */
function clearRegionLinesCache(codeElement: Element): void {
	FOLD_GEOMETRY_CACHE.delete(codeElement);
}

/** Clears the runtime's fold state of one code element: after its HTML is replaced, or after its fold ranges change. */
function resetFoldState(codeElement: Element): void {
	clearRegionLinesCache(codeElement);
	codeElement.removeAttribute("data-folded-regions");
	// Why each line: React keeps a streamed block's line elements when its fold ranges change, so they keep the runtime's state.
	for (const line of codeElement.querySelectorAll<HTMLElement>(
		"[data-fold-hidden], [data-fold-instant]",
	)) {
		line.removeAttribute("data-fold-hidden");
		line.removeAttribute("data-fold-instant");
		line.inert = false;
	}
	for (const toggle of codeElement.querySelectorAll('[data-fold-line][aria-expanded="false"]')) {
		toggle.setAttribute("aria-expanded", "true");
	}
}

/**
 * Cheap liveness probe: checks whether the first cached line is still
 * attached to the document. If `innerHTML` was replaced under us, the cached
 * line elements get detached and {@link Element.isConnected} flips to false.
 * Inspecting one entry is enough: they all detach together when the parent's
 * `innerHTML` is reset.
 */
function isGeometryConnected(geometry: FoldGeometry): boolean {
	for (const lines of geometry.regionToLines.values()) {
		if (lines.length === 0) {
			continue;
		}
		const sample = lines[0];
		if (sample == null) {
			continue;
		}
		return sample.isConnected;
	}
	// Empty geometry: treat as still valid; rebuilding wouldn't add anything.
	return true;
}

/** Returns whether a line is hidden: it is when any of its fold regions is folded. */
function isLineHidden(foldedRegions: Set<string>, lineRegions: Set<string>): boolean {
	for (const region of lineRegions) {
		if (foldedRegions.has(region)) {
			return true;
		}
	}
	return false;
}

/**
 * Toggles the fold region addressed by `button` and synchronizes only the
 * affected lines. The set of folded regions is persisted on the `<code>`
 * element via `data-folded-regions`, keeping the source of truth in the DOM.
 *
 * Returns `true` if a toggle occurred (button was a valid fold toggle), so
 * callers can avoid follow-up work for unrelated clicks.
 */
function toggleFoldFromButton(button: HTMLButtonElement): boolean {
	const regionId = button.dataset.foldLine;
	if (regionId == null || regionId === "") {
		return false;
	}
	const codeElement = button.closest("[data-slot='code-block-code']")?.querySelector("code");
	if (codeElement == null) {
		return false;
	}

	const foldedRegions = parseSpaceSeparated(codeElement.getAttribute("data-folded-regions"));
	const isCollapsed = foldedRegions.has(regionId);
	const willCollapse = !isCollapsed;

	if (willCollapse) {
		foldedRegions.add(regionId);
	} else {
		foldedRegions.delete(regionId);
	}

	if (foldedRegions.size === 0) {
		codeElement.removeAttribute("data-folded-regions");
	} else {
		codeElement.setAttribute("data-folded-regions", [...foldedRegions].join(" "));
	}

	button.setAttribute("aria-expanded", willCollapse ? "false" : "true");

	const { regionToLines, lineToRegions } = getFoldGeometry(codeElement);
	const lines = regionToLines.get(regionId);
	const shown: HTMLElement[] = [];
	let changed = 0;
	for (const line of lines ?? []) {
		const lineRegions = lineToRegions.get(line);
		if (lineRegions == null) {
			continue;
		}
		const isHidden = isLineHidden(foldedRegions, lineRegions);
		if (isHidden === (line.dataset.foldHidden === "true")) {
			continue;
		}
		// Why a limit: each line runs its own transitions, and a fold of 1,000
		// lines dropped frames. The opener is at the top, so the first lines are
		// the ones in view; the others change at once.
		line.toggleAttribute("data-fold-instant", changed >= FOLD_MOTION_LINE_LIMIT);
		changed += 1;
		// Why at once: a line that closes stays on screen while it animates, and keyboard focus must not reach it.
		line.inert = isHidden;
		if (isHidden) {
			line.dataset.foldHidden = "true";
		} else {
			// Why "false" and not no attribute: `mantle.css` opens the line from
			// `[data-fold-hidden="false"]`, so a line that loads open does not animate.
			line.dataset.foldHidden = "false";
			shown.push(line);
		}
	}
	if (shown.length > 0) {
		lastToggle += 1;
		const toggle = lastToggle;
		for (const line of shown) {
			LINE_SHOWN_BY.set(line, toggle);
		}
		// Why a timer, not `transitionend`: a hidden tab or an interrupted
		// transition fires no event. Why from the next frame: the transition
		// starts there, and a late frame must not end it early.
		requestAnimationFrame(() => {
			setTimeout(() => {
				for (const line of shown) {
					if (LINE_SHOWN_BY.get(line) === toggle && line.dataset.foldHidden === "false") {
						delete line.dataset.foldHidden;
					}
				}
			}, FOLD_MOTION_MS);
		});
	}

	return true;
}

/**
 * Toggles the fold when a click lands on a fold toggle button. Other clicks do nothing.
 */
const handleFoldClick = (event: Event) => {
	const target = event.target;
	if (!(target instanceof Element)) {
		return;
	}
	const button = target.closest(".mantle-code-fold-toggle");
	if (!(button instanceof HTMLButtonElement)) {
		return;
	}
	toggleFoldFromButton(button);
};

/**
 * Attaches a single delegated `click` listener to the given `<pre>` element.
 * Returns a teardown function suitable for `useEffect` cleanup.
 *
 * The handler is a no-op when the click does not land on a fold toggle, so it
 * is safe to attach unconditionally (e.g. for non-foldable code blocks).
 */
function attachFoldHandler(preElement: HTMLElement): () => void {
	preElement.addEventListener("click", handleFoldClick);
	return () => {
		preElement.removeEventListener("click", handleFoldClick);
	};
}

export {
	//,
	attachFoldHandler,
	clearRegionLinesCache,
	getFoldGeometry,
	resetFoldState,
	toggleFoldFromButton,
};
