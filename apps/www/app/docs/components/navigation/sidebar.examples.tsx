import {
	SidebarAnatomyDemo,
	SidebarNarrowMenuExample,
	SidebarPolymorphismDemo,
	SidebarRailTooltipExample,
	SidebarRowWidthMenuExample,
	SidebarWidthExample,
} from "~/features/sidebar-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "Polymorphism" example on the Sidebar docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="min-h-160 p-4 md:p-8">
			<SidebarPolymorphismDemo />
		</PreviewCanvas>
	);
}

/** The "Width" example on the Sidebar docs page. */
export function WidthExample() {
	return (
		<PreviewCanvas className="min-h-160 p-4 md:p-8">
			<SidebarWidthExample />
		</PreviewCanvas>
	);
}

/** The "Labeling the rail for pointer users" example on the Sidebar docs page. */
export function LabelingTheRailForPointerUsersExample() {
	return (
		<PreviewCanvas className="min-h-160 p-4 md:p-8">
			<SidebarRailTooltipExample />
		</PreviewCanvas>
	);
}

/** The "Floor the menu at the row width" example on the Sidebar docs page. */
export function FloorTheMenuAtTheRowWidthExample() {
	return (
		<PreviewCanvas className="min-h-160 p-4 md:p-8">
			<SidebarRowWidthMenuExample />
		</PreviewCanvas>
	);
}

/** The "A narrower panel" example on the Sidebar docs page. */
export function ANarrowerPanelExample() {
	return (
		<PreviewCanvas className="min-h-160 p-4 md:p-8">
			<SidebarNarrowMenuExample />
		</PreviewCanvas>
	);
}

/** The "Navigation anatomy" example on the Sidebar docs page. */
export function NavigationAnatomyExample() {
	return (
		<PreviewCanvas className="min-h-160 p-4 md:p-8">
			<SidebarAnatomyDemo />
		</PreviewCanvas>
	);
}
