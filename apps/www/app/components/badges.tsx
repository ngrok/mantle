import { Badge } from "@ngrok/mantle/badge";
import type { WithStyleProps } from "@ngrok/mantle/types";
import { HandPalmIcon } from "@phosphor-icons/react/HandPalm";
import { LightbulbIcon } from "@phosphor-icons/react/Lightbulb";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";

const PreviewBadge = ({ className, style }: WithStyleProps) => (
	<Badge
		className={className}
		appearance="muted"
		color="fuchsia"
		icon={<SparkleIcon />}
		style={style}
	>
		Preview
	</Badge>
);

const ProposalBadge = ({ className, style }: WithStyleProps) => (
	<Badge
		className={className}
		appearance="muted"
		color="amber"
		icon={<LightbulbIcon />}
		style={style}
	>
		Proposal
	</Badge>
);

const UnreleasedBadge = ({ className, style }: WithStyleProps) => (
	<Badge className={className} appearance="muted" color="red" icon={<HandPalmIcon />} style={style}>
		Unreleased
	</Badge>
);

export {
	//,
	PreviewBadge,
	ProposalBadge,
	UnreleasedBadge,
};
