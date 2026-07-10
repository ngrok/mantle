/**
 * Runtime fold/unfold behavior for `CodeBlock.Code` lives in this module so it
 * can be unit-tested independently of React. The implementation deliberately
 * keeps all interaction state in the DOM and uses a single delegated event
 * handler per `<pre>` — no per-line listeners, no React re-renders on toggle.
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
	 * on every affected line every click — meaningful when 1000+ lines belong
	 * to the toggled region.
	 */
	lineToRegions: WeakMap<HTMLElement, Set<string>>;
};

const FOLD_GEOMETRY_CACHE = new WeakMap<Element, FoldGeometry>();

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

/** Clears per-code-element runtime state after the code element's HTML is replaced. */
function resetFoldState(codeElement: Element): void {
	clearRegionLinesCache(codeElement);
	codeElement.removeAttribute("data-folded-regions");
}

/**
 * Cheap liveness probe: checks whether the first cached line is still
 * attached to the document. If `innerHTML` was replaced under us, the cached
 * line elements get detached and {@link Element.isConnected} flips to false.
 * Inspecting one entry is enough — they all detach together when the parent's
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
	// Empty geometry — treat as still valid; rebuilding wouldn't add anything.
	return true;
}

/**
 * Reconciles a single line's hidden state with the currently-folded region
 * set. A line is hidden if any of its parent regions are folded.
 */
function syncLineHidden(
	line: HTMLElement,
	foldedRegions: Set<string>,
	lineRegions: Set<string>,
): void {
	let isHidden = false;
	for (const region of lineRegions) {
		if (foldedRegions.has(region)) {
			isHidden = true;
			break;
		}
	}
	if (isHidden) {
		line.dataset.foldHidden = "true";
	} else {
		delete line.dataset.foldHidden;
	}
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
	if (lines != null) {
		for (const line of lines) {
			const lineRegions = lineToRegions.get(line);
			if (lineRegions != null) {
				syncLineHidden(line, foldedRegions, lineRegions);
			}
		}
	}

	return true;
}

/**
 * Attaches a single delegated `click` listener to the given `<pre>` element.
 * Returns a teardown function suitable for `useEffect` cleanup.
 *
 * The handler is a no-op when the click does not land on a fold toggle, so it
 * is safe to attach unconditionally (e.g. for non-foldable code blocks).
 */
function attachFoldHandler(preElement: HTMLElement): () => void {
	const handleClick = (event: Event) => {
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

	preElement.addEventListener("click", handleClick);
	return () => {
		preElement.removeEventListener("click", handleClick);
	};
}

export {
	attachFoldHandler,
	clearRegionLinesCache,
	getFoldGeometry,
	resetFoldState,
	toggleFoldFromButton,
};
