import { Alert } from "@ngrok/mantle/alert";
import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Badge } from "@ngrok/mantle/badge";
import { Button, IconButton } from "@ngrok/mantle/button";
import { Toast } from "@ngrok/mantle/toast";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { XIcon } from "@phosphor-icons/react/X";

declare const tone: "neutral" | "danger";
declare const isPending: boolean;
declare function save(): void;

export const Buttons = (
	<>
		<Button appearance="outlined" intent="accent" onClick={save}>
			Details
		</Button>
		<Button intent="neutral" appearance="filled" onClick={save}>
			Save
		</Button>
		<Button type="submit" appearance="filled" intent="accent" isLoading={isPending}>
			Save
		</Button>
		<Button appearance="outlined" intent="neutral">
			Cancel
		</Button>
		<Button appearance="outlined" intent="danger">
			Delete
		</Button>
		<Button intent="accent" appearance="ghost" onClick={save}>
			Dismiss
		</Button>
		<Button appearance="outlined" intent={tone}>
			Dynamic
		</Button>
	</>
);

export const IconButtons = (
	<>
		<IconButton appearance="outlined" intent="neutral" label="Copy" icon={<CopyIcon />} />
		<IconButton intent="neutral" appearance="ghost" size="sm" label="Dismiss" icon={<XIcon />} />
	</>
);

export const Feedback = (
	<>
		<Alert.Root intent="warning">…</Alert.Root>
		<Toast.Root intent="success">…</Toast.Root>
		<AlertDialog.Root intent="danger">…</AlertDialog.Root>
		<AlertDialog.Action intent="accent">Continue</AlertDialog.Action>
	</>
);

// Negative cases: a migrated button, a Badge, and a non-mantle prop stay as written.
export const Untouched = (
	<>
		<Button appearance="ghost" intent="neutral">
			Already migrated
		</Button>
		<Badge appearance="muted" color="green">
			ok
		</Badge>
		<img src="/hero.png" alt="" fetchPriority="high" />
	</>
);
