import { cx } from "@ngrok/mantle/cx";
import { PreviewFrame } from "./preview-frame";

type Props = {
	/**
	 * The page example key, `<page path>/<example name>`. The name `size` on
	 * `components/actions/button` renders `SizeExample` from
	 * `app/docs/components/actions/button.examples.tsx`.
	 */
	example: `${string}/${string}`;
	/** The example's name for the frame's accessible title and toolbar labels. */
	title: string;
	/** Merged onto the frame. */
	className?: string;
};

/**
 * A live docs example in its own document: a preview frame with a desktop,
 * tablet, and mobile viewport switch, a reload button, and a link that opens
 * the example in a new tab. The frame grows to the example's height, and it
 * joins the code block that follows it.
 *
 * @example
 * ```mdx
 * <Example example="components/actions/button/size" title="Button sizes" />
 *
 * ```tsx
 * <Button size="sm">Small</Button>
 * ```
 * ```
 */
export function Example({ example, title, className }: Props) {
	return (
		<PreviewFrame
			example={example}
			title={title}
			height="content"
			className={cx(
				"rounded-b-none border-b-0",
				"[&+pre]:rounded-t-none [&+[data-slot=code-block]]:rounded-t-none",
				className,
			)}
		/>
	);
}
