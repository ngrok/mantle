import { cx } from "@ngrok/mantle/cx";
import type { WithStyleProps } from "@ngrok/mantle/types";

/** Sidebar navigation for the blocks section. */
export function BlocksNavigation({ className, style }: WithStyleProps) {
	return (
		<nav className={cx("text-sm pb-16", className)} style={style}>
			<ul className="flex flex-col">
				<li className="mb-2 text-xs font-medium uppercase tracking-wider font-mono">Blocks</li>
			</ul>
		</nav>
	);
}
