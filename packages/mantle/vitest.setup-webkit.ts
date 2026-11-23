// Why: on a GitHub runner, which has no GPU, WebKit stops painting the whole browser once it
// composites a `filter: blur()` or a `backdrop-filter`. After that, no `requestAnimationFrame`
// runs and no animation starts, so tests in later files time out too. The Dialog `::backdrop`,
// `IconSwap`, `IconButton`, and `ThemeSwitcher` blur. No test asserts a filter, so WebKit runs
// without them. Chromium and Firefox keep them.
const noFilters = document.createElement("style");
noFilters.textContent =
	"*, ::before, ::after, ::backdrop { filter: none !important; backdrop-filter: none !important; }";
document.head.append(noFilters);
