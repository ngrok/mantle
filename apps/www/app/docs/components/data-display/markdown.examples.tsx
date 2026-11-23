import { PreviewCanvas } from "~/components/preview-canvas";
import { MathDemo, StaticAnswerDemo, StreamingAnswerDemo } from "~/features/markdown-demos";

/** The first example on the Markdown docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="items-start">
			<StreamingAnswerDemo />
		</PreviewCanvas>
	);
}

/** The "Complete answers" example on the Markdown docs page. */
export function CompleteAnswersExample() {
	return (
		<PreviewCanvas>
			<StaticAnswerDemo />
		</PreviewCanvas>
	);
}

/** The "Math" example on the Markdown docs page. */
export function MathExample() {
	return (
		<PreviewCanvas>
			<MathDemo />
		</PreviewCanvas>
	);
}
