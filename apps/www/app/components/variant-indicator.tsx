import { Icon } from "@ngrok/mantle/icon";
import { cx } from "@ngrok/mantle/cx";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

type VariantIndicatorProps = {
	/**
	 * The Tailwind class that shows the check icon when the variant is active (e.g. `"pointer-coarse:block"`).
	 */
	show: string;
	/**
	 * The Tailwind class that hides the x icon when the variant is active (e.g. `"pointer-coarse:hidden"`).
	 */
	hide: string;
};

/**
 * A live CSS-driven indicator that shows a check or x icon based on whether a Tailwind variant is active.
 */
function VariantIndicator({ show, hide }: VariantIndicatorProps) {
	return (
		<span className="inline-flex">
			<Icon
				className={cx("text-success-600 hidden size-4", show)}
				svg={<CheckIcon weight="bold" />}
			/>
			<Icon className={cx("text-danger-600 block size-4", hide)} svg={<XIcon weight="bold" />} />
		</span>
	);
}

export { VariantIndicator };
