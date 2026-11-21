/**
 * The toolbar band `AppLayout.Header` and `AppLayout.SidePanelHeader` share, so
 * the two rows and the sidebar header's switcher row center on one line.
 * Standalone the band is `h-14`. With a `Sidebar.Header` in the shell, the
 * height derives from the sidebar's `--sidebar-header-height` token: the row
 * sits below the card's gutter and its 1px border, so center parity needs the
 * band minus twice each. The band is the sidebar header's first row, so a header
 * that stacks a second row leaves this height alone. Set
 * `--sidebar-header-height` on a common ancestor (e.g. `AppLayout.Root`) and
 * every row moves together.
 */
const headerBandClassName =
	"h-14 group-has-data-[slot~=sidebar-header]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-2*var(--app-layout-card-gutter,0.5rem)-2px)]";

export {
	//,
	headerBandClassName,
};
