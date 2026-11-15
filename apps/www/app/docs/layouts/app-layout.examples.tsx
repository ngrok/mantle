import {
	AppLayoutHeaderSlotsExample,
	AppLayoutPageShapesExample,
	AppLayoutPinnedFooterExample,
	AppLayoutPolymorphismDemo,
	AppLayoutScrollResetExample,
} from "~/features/app-layout-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The "Polymorphism" example on the App Layout docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="h-dvh p-0 md:p-0">
			<AppLayoutPolymorphismDemo />
		</PreviewCanvas>
	);
}

/** The "Header slots" example on the App Layout docs page. */
export function HeaderSlotsExample() {
	return (
		<PreviewCanvas className="h-dvh p-0 md:p-0">
			<AppLayoutHeaderSlotsExample />
		</PreviewCanvas>
	);
}

/** The "Sizing a page to the card" example on the App Layout docs page. */
export function SizingAPageToTheCardExample() {
	return (
		<PreviewCanvas className="h-dvh p-0 md:p-0">
			<AppLayoutPageShapesExample />
		</PreviewCanvas>
	);
}

/** The "Pinning a footer to the card" example on the App Layout docs page. */
export function PinningAFooterToTheCardExample() {
	return (
		<PreviewCanvas className="h-dvh p-0 md:p-0">
			<AppLayoutPinnedFooterExample />
		</PreviewCanvas>
	);
}

/** The "Scroll restoration" example on the App Layout docs page. */
export function ScrollRestorationExample() {
	return (
		<PreviewCanvas className="h-dvh p-0 md:p-0">
			<AppLayoutScrollResetExample />
		</PreviewCanvas>
	);
}
