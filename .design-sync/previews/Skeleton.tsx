import { Card, MediaObject, Skeleton } from "@ngrok/mantle";

export const MediaObjectLoading = () => (
	<MediaObject.Root className="w-full max-w-96 items-center">
		<MediaObject.Media>
			<Skeleton className="h-12 w-12 rounded-full" />
		</MediaObject.Media>
		<MediaObject.Content className="space-y-3">
			<Skeleton className="w-full" />
			<Skeleton className="w-4/5" />
		</MediaObject.Content>
	</MediaObject.Root>
);

export const CardLoading = () => (
	<Card.Root className="w-full max-w-md">
		<Card.Header>
			<div role="status" aria-live="polite" className="space-y-2">
				<span className="sr-only">Loading endpoint details…</span>
				<Skeleton className="h-5 w-1/2" />
				<Skeleton className="w-3/4" />
			</div>
		</Card.Header>
		<Card.Body className="space-y-3">
			<Skeleton className="w-full" />
			<Skeleton className="w-full" />
			<Skeleton className="w-2/3" />
		</Card.Body>
	</Card.Root>
);

export const ListRows = () => (
	<div className="flex w-full max-w-md flex-col gap-4">
		{["a", "b", "c"].map((key) => (
			<div key={key} className="flex items-center gap-3">
				<Skeleton className="size-8 rounded-md" />
				<div className="flex-1 space-y-2">
					<Skeleton className="w-2/3" />
					<Skeleton className="h-3 w-1/3" />
				</div>
			</div>
		))}
	</div>
);
