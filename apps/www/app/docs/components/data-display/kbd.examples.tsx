import { Kbd } from "@ngrok/mantle/kbd";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Kbd docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<div className="flex items-center gap-2">
				<Kbd>K</Kbd>
				<Kbd>
					<span className="sr-only">Command</span>
					<span aria-hidden>⌘</span>
				</Kbd>
				<Kbd>
					<span className="sr-only">Control</span>
					<span aria-hidden>⌃</span>
				</Kbd>
				<Kbd>
					<span className="sr-only">Shift</span>
					<span aria-hidden>⇧</span>
				</Kbd>
				<Kbd>
					<span className="sr-only">Option</span>
					<span aria-hidden>⌥</span>
				</Kbd>
			</div>
		</PreviewCanvas>
	);
}

/** The "Keyboard shortcuts" example on the Kbd docs page. */
export function KeyboardShortcutsExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-2">
					<Kbd>
						<span className="sr-only">Command</span>
						<span aria-hidden>⌘</span>
					</Kbd>
					<span>+</span>
					<Kbd>K</Kbd>
				</div>
				<div className="flex items-center gap-2">
					<Kbd>
						<span className="sr-only">Control</span>
						<span aria-hidden>⌃</span>
					</Kbd>
					<span>+</span>
					<Kbd>
						<span className="sr-only">Shift</span>
						<span aria-hidden>⇧</span>
					</Kbd>
					<span>+</span>
					<Kbd>P</Kbd>
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Accessibility" example on the Kbd docs page. */
export function AccessibilityExample() {
	return (
		<PreviewCanvas>
			<div className="flex items-center gap-2">
				<Kbd>
					<span className="sr-only">Command</span>
					<span aria-hidden>⌘</span>
				</Kbd>
				<span>+</span>
				<Kbd>K</Kbd>
			</div>
		</PreviewCanvas>
	);
}
