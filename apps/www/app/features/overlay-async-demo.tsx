import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Button } from "@ngrok/mantle/button";
import { DescriptionList } from "@ngrok/mantle/description-list";
import { Dialog } from "@ngrok/mantle/dialog";
import { Empty } from "@ngrok/mantle/empty";
import { Label } from "@ngrok/mantle/label";
import { MediaObject } from "@ngrok/mantle/media-object";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { Separator } from "@ngrok/mantle/separator";
import { Sheet } from "@ngrok/mantle/sheet";
import { Skeleton } from "@ngrok/mantle/skeleton";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { SmileyMeltingIcon } from "@phosphor-icons/react/SmileyMelting";
import {
	useQuery,
	useQueryClient,
	type QueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type ReactNode, useEffect, useId, useState } from "react";

const SIMULATED_USER_API_LATENCY_MS = 1_500;
const SERVER_ERROR_RETRY_LIMIT = 2;
const USER_QUERY_RETRY_DELAY_MS = 500;
const USER_QUERY_KEY_ROOT = ["overlay-async-user"];

/** Scenario names used by the docs demo controls. */
type UserRequestScenario = "success" | "not-found" | "server-error";

/** The floating overlay shells the demo can host the async body in. */
const overlayKinds = ["sheet", "dialog", "alert-dialog"] as const;

/** One of the overlay shells supported by the demo. */
type OverlayKind = (typeof overlayKinds)[number];

/** Narrows a raw radio value to a known overlay kind. */
function isOverlayKind(value: string): value is OverlayKind {
	const kinds: readonly string[] = overlayKinds;
	return kinds.includes(value);
}

/** The typed user record returned by the demo API. */
type User = {
	/** Stable user identifier from the backend. */
	id: string;
	/** Display name shown in the overlay header content. */
	name: string;
	/** Primary email address for the account. */
	email: string;
	/** Role within the current workspace. */
	role: string;
	/** Workspace name used to make the example feel like app data. */
	workspace: string;
	/** Billing plan attached to the workspace. */
	plan: string;
	/** ISO date string for when the user joined. */
	joinedAt: string;
	/** Human-readable recent activity summary. */
	lastActiveAt: string;
};

/** The HTTP status codes intentionally simulated by the demo. */
type UserRequestErrorStatus = 404 | 500;

/** Options for constructing a typed demo request error. */
type UserRequestErrorOptions = {
	/** HTTP status returned by the simulated endpoint. */
	status: UserRequestErrorStatus;
	/** User-facing or operator-facing error message. */
	message: string;
	/** Request identifier included in the inline error UI. */
	requestId: string;
};

/** Error shape used when the simulated endpoint returns a non-2xx response. */
class UserRequestError extends Error {
	/** HTTP status returned by the simulated endpoint. */
	readonly status: UserRequestErrorStatus;
	/** Request identifier included in the inline error UI. */
	readonly requestId: string;

	/** Creates a typed request error that preserves HTTP metadata. */
	constructor({ message, requestId, status }: UserRequestErrorOptions) {
		super(message);
		this.name = "UserRequestError";
		this.requestId = requestId;
		this.status = status;
	}
}

/** Error used when TanStack Query aborts a request after the overlay unmounts. */
class RequestCancelledError extends Error {
	/** Creates a cancellation error that the retry policy can ignore. */
	constructor() {
		super("The user details request was cancelled.");
		this.name = "RequestCancelledError";
	}
}

/** Options for delaying the simulated API response. */
type WaitForDemoApiOptions = {
	/** Delay duration in milliseconds. */
	durationMs: number;
	/** Abort signal passed by TanStack Query. */
	signal?: AbortSignal;
};

/** Waits before resolving so the overlay can show the pending state. */
function waitForDemoApi({ durationMs, signal }: WaitForDemoApiOptions): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new RequestCancelledError());
			return;
		}

		const timeoutId = setTimeout(() => {
			signal?.removeEventListener("abort", handleAbort);
			resolve();
		}, durationMs);

		/** Cancels the simulated API delay when the query unmounts. */
		function handleAbort() {
			clearTimeout(timeoutId);
			signal?.removeEventListener("abort", handleAbort);
			reject(new RequestCancelledError());
		}

		signal?.addEventListener("abort", handleAbort, { once: true });
	});
}

/** Options accepted by the simulated user fetcher. */
type FetchUserOptions = {
	/** User identifier requested by the overlay. */
	userId: string;
	/** Demo scenario selected by the user. */
	scenario: UserRequestScenario;
	/** Abort signal passed by TanStack Query. */
	signal?: AbortSignal;
};

/** Simulates a production API client with latency, typed data, and HTTP errors. */
export async function fetchUser({ scenario, signal, userId }: FetchUserOptions): Promise<User> {
	await waitForDemoApi({ durationMs: SIMULATED_USER_API_LATENCY_MS, signal });

	if (scenario === "not-found") {
		throw new UserRequestError({
			status: 404,
			message: `No user exists for ${userId}.`,
			requestId: createDemoRequestId({ status: 404, userId }),
		});
	}

	if (scenario === "server-error") {
		throw new UserRequestError({
			status: 500,
			message: "The user service failed before returning profile data.",
			requestId: createDemoRequestId({ status: 500, userId }),
		});
	}

	return {
		id: userId,
		name: "Ada Lovelace",
		email: "ada.lovelace@example.com",
		role: "Founding Engineer",
		workspace: "Analytical Engines",
		plan: "Enterprise",
		joinedAt: "1843-07-08",
		lastActiveAt: "2 minutes ago",
	};
}

/** Options for creating a deterministic request id in the demo. */
type CreateDemoRequestIdOptions = {
	/** HTTP status returned by the simulated endpoint. */
	status: UserRequestErrorStatus;
	/** User identifier requested by the overlay. */
	userId: string;
};

/** Creates a stable request id so the error UI looks like real production output. */
function createDemoRequestId({ status, userId }: CreateDemoRequestIdOptions): string {
	return `req_${status}_${userId.replace(/[^a-z0-9]/gi, "").slice(-8)}`;
}

/** Options passed to the demo query hook. */
type UseUserQueryOptions = {
	/** User identifier requested by the overlay. */
	userId: string;
	/** Demo scenario selected by the user. */
	scenario: UserRequestScenario;
};

/** Fetches user details for the overlay with TanStack Query and an explicit retry policy. */
function useUserQuery({ scenario, userId }: UseUserQueryOptions): UseQueryResult<User, Error> {
	return useQuery<User, Error>({
		queryKey: [...USER_QUERY_KEY_ROOT, userId, scenario],
		queryFn: ({ signal }) => fetchUser({ userId, scenario, signal }),
		retry: (failureCount, error) => shouldRetryUserQuery({ error, failureCount }),
		retryDelay: USER_QUERY_RETRY_DELAY_MS,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}

/** Options passed to the query retry policy. */
type ShouldRetryUserQueryOptions = {
	/** Number of failed attempts TanStack Query has observed. */
	failureCount: number;
	/** Error thrown by the query function. */
	error: Error;
};

/** Retries transient server failures while skipping terminal and cancelled requests. */
function shouldRetryUserQuery({ error, failureCount }: ShouldRetryUserQueryOptions): boolean {
	if (error instanceof RequestCancelledError) {
		return false;
	}

	if (error instanceof UserRequestError && error.status === 500) {
		return failureCount < SERVER_ERROR_RETRY_LIMIT;
	}

	return false;
}

const scenarioLabels: Record<UserRequestScenario, string> = {
	success: "happy path",
	"not-found": "404",
	"server-error": "500",
};

/** Props shared by every controlled async overlay shell in the demo. */
type UserOverlayProps = {
	/** User identifier requested by the overlay. */
	userId: string;
	/** Demo scenario selected by the user. */
	scenario: UserRequestScenario;
	/** Called when the user dismisses the overlay. */
	onClose: () => void;
};

/** Renders immediately, then swaps the sheet body from pending to success or error. */
function UserSheet({ onClose, scenario, userId }: UserOverlayProps) {
	const query = useUserQuery({ scenario, userId });

	return (
		<Sheet.Root
			open
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose();
				}
			}}
		>
			<Sheet.Content preferredWidth="sm:max-w-[34rem]">
				<Sheet.Header>
					<Sheet.TitleGroup>
						<Sheet.Title>User details</Sheet.Title>
						<Sheet.Actions>
							<Sheet.CloseIconButton />
						</Sheet.Actions>
					</Sheet.TitleGroup>
					<Sheet.Description>
						Loading <span className="font-mono">{userId}</span> through the{" "}
						{scenarioLabels[scenario]} case.
					</Sheet.Description>
				</Sheet.Header>
				<Sheet.Body>
					<UserDetailsBody query={query} />
				</Sheet.Body>
				<Sheet.Footer>
					<Sheet.Close asChild>
						<Button type="button" appearance="outlined" intent="neutral">
							Close
						</Button>
					</Sheet.Close>
					<Button type="button" appearance="filled" intent="neutral" disabled={!query.isSuccess}>
						Save changes
					</Button>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	);
}

/** Renders immediately, then swaps the dialog body from pending to success or error. */
function UserDialog({ onClose, scenario, userId }: UserOverlayProps) {
	const query = useUserQuery({ scenario, userId });

	return (
		<Dialog.Root
			open
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose();
				}
			}}
		>
			<Dialog.Content preferredWidth="max-w-xl">
				{/* Dialog.Header is a single flex row — Title + CloseIconButton only.
				    The description lives at the top of the Body (Radix wires
				    aria-describedby from anywhere inside Content). */}
				<Dialog.Header>
					<Dialog.Title>User details</Dialog.Title>
					<Dialog.CloseIconButton />
				</Dialog.Header>
				<Dialog.Body className="space-y-4">
					<Dialog.Description>
						Loading <span className="font-mono">{userId}</span> through the{" "}
						{scenarioLabels[scenario]} case.
					</Dialog.Description>
					<UserDetailsBody query={query} />
				</Dialog.Body>
				<Dialog.Footer>
					<Dialog.Close asChild>
						<Button type="button" appearance="outlined" intent="neutral">
							Close
						</Button>
					</Dialog.Close>
					<Button type="button" appearance="filled" intent="neutral" disabled={!query.isSuccess}>
						Save changes
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	);
}

/**
 * Renders immediately and loads the record the user is about to act on. The
 * destructive action stays disabled until the data resolves — confirming
 * against a record that hasn't loaded is never safe.
 */
function UserAlertDialog({ onClose, scenario, userId }: UserOverlayProps) {
	const query = useUserQuery({ scenario, userId });

	return (
		<AlertDialog.Root
			intent="danger"
			open
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose();
				}
			}}
		>
			<AlertDialog.Content preferredWidth="max-w-xl">
				<AlertDialog.Icon />
				<AlertDialog.Body>
					<AlertDialog.Header>
						<AlertDialog.Title>Remove this user?</AlertDialog.Title>
						<AlertDialog.Description>
							Review <span className="font-mono">{userId}</span> before removing them — loaded
							through the {scenarioLabels[scenario]} case.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<div className="mt-4">
						<UserDetailsBody query={query} />
					</div>
					<AlertDialog.Footer>
						<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
						<AlertDialog.Action type="button" disabled={!query.isSuccess}>
							Remove user
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Body>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}

/** Props for selecting which body state to render. */
type UserDetailsBodyProps = {
	/** TanStack Query result that drives the body state. */
	query: UseQueryResult<User, Error>;
};

/** Keeps the overlay chrome stable while only the body content changes. */
function UserDetailsBody({ query }: UserDetailsBodyProps) {
	if (query.isPending) {
		return <UserDetailsLoading failureCount={query.failureCount} />;
	}

	if (query.isError) {
		return (
			<UserDetailsError
				error={query.error}
				isRetrying={query.isFetching}
				onRetry={() => {
					void query.refetch();
				}}
			/>
		);
	}

	if (query.isSuccess) {
		return <UserDetails user={query.data} />;
	}

	return null;
}

/** Props for the loading state. */
type UserDetailsLoadingProps = {
	/** Failed attempts observed while TanStack Query is still retrying. */
	failureCount: number;
};

/** Mirrors the successful layout so the overlay body does not jump when data arrives. */
function UserDetailsLoading({ failureCount }: UserDetailsLoadingProps) {
	return (
		<div className="space-y-4" aria-busy="true" aria-label="Loading user details">
			<MediaObject.Root className="items-center">
				<MediaObject.Media>
					<Skeleton className="size-12 rounded-full" />
				</MediaObject.Media>
				<MediaObject.Content className="space-y-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-3 w-56" />
				</MediaObject.Content>
			</MediaObject.Root>
			<Separator />
			<div className="space-y-2">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-5/6" />
				<Skeleton className="h-3 w-3/4" />
			</div>
			{failureCount > 0 && (
				<p className="text-sm text-muted" role="status">
					Retrying after {failureCount} failed {failureCount === 1 ? "attempt" : "attempts"}.
				</p>
			)}
		</div>
	);
}

/** Props for the inline error state. */
type UserDetailsErrorProps = {
	/** Error thrown by the query function. */
	error: Error;
	/** Whether a manual retry is currently in flight. */
	isRetrying: boolean;
	/** Called when the user requests another attempt. */
	onRetry: () => void;
};

/** Renders a recoverable inline error instead of closing the overlay. */
function UserDetailsError({ error, isRetrying, onRetry }: UserDetailsErrorProps) {
	const copy = getUserErrorCopy(error);

	return (
		<Empty.Root className="py-8">
			<Empty.Icon svg={copy.icon} />
			<Empty.Title className="text-lg">{copy.title}</Empty.Title>
			<Empty.Description>
				<p>{copy.description}</p>
				{copy.requestId && (
					<p>
						Request ID <span className="font-mono text-strong">{copy.requestId}</span>
					</p>
				)}
			</Empty.Description>
			{copy.canRetry && (
				<Empty.Actions>
					<Button
						type="button"
						appearance="filled"
						intent="danger"
						isLoading={isRetrying}
						onClick={onRetry}
					>
						Retry request
					</Button>
				</Empty.Actions>
			)}
		</Empty.Root>
	);
}

/** Copy values shown by the inline error state. */
type UserErrorCopy = {
	/** Whether the Empty state should render a retry action. */
	canRetry: boolean;
	/** Icon shown by the Empty state. */
	icon: ReactNode;
	/** Short Empty state title. */
	title: string;
	/** Human-readable remediation context. */
	description: string;
	/** Optional request id shown for support workflows. */
	requestId?: string;
};

/** Converts typed request errors into user-facing copy. */
function getUserErrorCopy(error: Error): UserErrorCopy {
	if (error instanceof UserRequestError && error.status === 404) {
		return {
			canRetry: false,
			icon: <MagnifyingGlassIcon />,
			title: "User not found",
			description: "The request completed, but no user exists for that id.",
			requestId: error.requestId,
		};
	}

	if (error instanceof UserRequestError && error.status === 500) {
		return {
			canRetry: true,
			icon: <SmileyMeltingIcon />,
			title: "User service unavailable",
			description:
				"The service failed after retrying. Keep the overlay open so the user can try again.",
			requestId: error.requestId,
		};
	}

	return {
		canRetry: true,
		icon: <SmileyMeltingIcon />,
		title: "Could not load user",
		description: error.message || "An unknown error occurred.",
	};
}

/** Props for the successful user details state. */
type UserDetailsProps = {
	/** Loaded user data returned by the query. */
	user: User;
};

/** Renders the successful data state. */
function UserDetails({ user }: UserDetailsProps) {
	return (
		<div className="space-y-4">
			<MediaObject.Root className="items-center">
				<MediaObject.Media>
					<div className="flex size-12 items-center justify-center rounded-full bg-accent-500 font-mono text-on-filled">
						{user.name[0]}
					</div>
				</MediaObject.Media>
				<MediaObject.Content>
					<p className="font-medium text-strong">{user.name}</p>
					<p className="text-sm text-muted">{user.email}</p>
				</MediaObject.Content>
			</MediaObject.Root>
			<Separator />
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>ID</DescriptionList.Label>
					<DescriptionList.Value>{user.id}</DescriptionList.Value>
				</DescriptionList.Item>
				<DescriptionList.Item>
					<DescriptionList.Label>Role</DescriptionList.Label>
					<DescriptionList.Value>{user.role}</DescriptionList.Value>
				</DescriptionList.Item>
				<DescriptionList.Item>
					<DescriptionList.Label>Workspace</DescriptionList.Label>
					<DescriptionList.Value>{user.workspace}</DescriptionList.Value>
				</DescriptionList.Item>
				<DescriptionList.Item>
					<DescriptionList.Label>Plan</DescriptionList.Label>
					<DescriptionList.Value>{user.plan}</DescriptionList.Value>
				</DescriptionList.Item>
				<DescriptionList.Item>
					<DescriptionList.Label>Joined</DescriptionList.Label>
					<DescriptionList.Value>{user.joinedAt}</DescriptionList.Value>
				</DescriptionList.Item>
				<DescriptionList.Item>
					<DescriptionList.Label>Last active</DescriptionList.Label>
					<DescriptionList.Value>{user.lastActiveAt}</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>
		</div>
	);
}

/** Selected overlay state owned by the parent list/page. */
type SelectedUserOverlay = {
	/** User identifier requested by the overlay. */
	userId: string;
	/** Demo scenario selected by the user. */
	scenario: UserRequestScenario;
	/** Overlay shell hosting the async body, captured at open time. */
	overlay: OverlayKind;
};

/** Returns the user id that makes the selected scenario readable in the UI. */
function userIdForScenario(scenario: UserRequestScenario): string {
	if (scenario === "not-found") {
		return "user_missing";
	}

	return "user_01J8Q7Z5K2";
}

/** Query key for the success scenario, used to observe and clear just the happy-path cache entry. */
const HAPPY_PATH_QUERY_KEY = [...USER_QUERY_KEY_ROOT, userIdForScenario("success"), "success"];

/** Tracks whether the happy-path query has a successful response in the cache. The 404 and 500 scenarios throw, so they never reach a successful cache state. */
function useIsHappyPathCached(): boolean {
	const queryClient = useQueryClient();
	const [isCached, setIsCached] = useState(() => readIsHappyPathCached(queryClient));

	useEffect(() => {
		const cache = queryClient.getQueryCache();
		const unsubscribe = cache.subscribe((event) => {
			// Ignore cache events that don't touch the happy-path query so other consumers of the
			// QueryClient don't trigger a recompute on every cache mutation.
			if (!isHappyPathCacheEvent(event)) {
				return;
			}
			const next = readIsHappyPathCached(queryClient);
			setIsCached((prev) => (prev === next ? prev : next));
		});
		return unsubscribe;
	}, [queryClient]);

	return isCached;
}

/** Returns true when the happy-path query has a successful response in the cache. */
function readIsHappyPathCached(queryClient: QueryClient): boolean {
	const query = queryClient.getQueryCache().find({ queryKey: HAPPY_PATH_QUERY_KEY, exact: true });
	return query?.state.status === "success";
}

/** True when a query-cache event refers to the happy-path query key. */
function isHappyPathCacheEvent(event: { query: { queryKey: readonly unknown[] } }): boolean {
	const queryKey = event.query.queryKey;
	if (queryKey.length !== HAPPY_PATH_QUERY_KEY.length) {
		return false;
	}
	return queryKey.every((part, index) => part === HAPPY_PATH_QUERY_KEY[index]);
}

/** Builds the cache-state caption shown beneath the demo controls. */
function describeCacheState(isCached: boolean): string {
	if (isCached) {
		return `Happy path is cached. Reopening it now skips the pending state and renders the result immediately. Click "Clear cache" to reset.`;
	}
	return "No successful response is cached. Clicking happy path will fetch from scratch and show pending; closing the overlay keeps the result so reopening skips pending. The 404 and 500 scenarios throw, so reopening them always re-fetches.";
}

/** Display labels for the overlay picker. */
const overlayKindLabels: Record<OverlayKind, string> = {
	sheet: "Sheet",
	dialog: "Dialog",
	"alert-dialog": "Alert Dialog",
};

/** Opens the three async body states in a Sheet, Dialog, or Alert Dialog from parent-owned selection state. */
export function UserOverlayDemo() {
	const [overlay, setOverlay] = useState<OverlayKind>("sheet");
	const [selection, setSelection] = useState<SelectedUserOverlay | null>(null);
	const queryClient = useQueryClient();
	const isHappyPathCached = useIsHappyPathCached();
	const overlayPickerLabelId = useId();

	/** Opens a fresh overlay for the selected demo case. */
	const openOverlay = (scenario: UserRequestScenario) => {
		setSelection({ overlay, scenario, userId: userIdForScenario(scenario) });
	};

	/** Dismisses the overlay without clearing the cache so reopening can demonstrate skip-pending. */
	const closeOverlay = () => {
		setSelection(null);
	};

	/** Removes every cached response so the next click shows the pending state again. */
	const clearCache = () => {
		queryClient.removeQueries({ queryKey: USER_QUERY_KEY_ROOT });
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<Label id={overlayPickerLabelId}>Overlay</Label>
				{/* ButtonGroup renders the radio group itself — do not nest it inside
				    RadioGroup.Root, or the buttons bind to an inner, uncontrolled group. */}
				<RadioGroup.ButtonGroup
					aria-labelledby={overlayPickerLabelId}
					className="w-fit"
					value={overlay}
					onChange={(value: string) => {
						if (isOverlayKind(value)) {
							setOverlay(value);
						}
					}}
				>
					{overlayKinds.map((kind) => (
						<RadioGroup.Button key={kind} value={kind} className="whitespace-nowrap">
							{overlayKindLabels[kind]}
						</RadioGroup.Button>
					))}
				</RadioGroup.ButtonGroup>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					appearance="filled"
					intent="neutral"
					onClick={() => openOverlay("success")}
				>
					Happy path
				</Button>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => openOverlay("not-found")}
				>
					404 error
				</Button>
				<Button
					type="button"
					appearance="filled"
					intent="danger"
					onClick={() => openOverlay("server-error")}
				>
					500 error
				</Button>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					appearance="ghost"
					intent="neutral"
					onClick={clearCache}
					disabled={!isHappyPathCached}
				>
					Clear cache
				</Button>
			</div>
			<p className="text-sm text-muted" aria-live="polite">
				{describeCacheState(isHappyPathCached)}
			</p>
			{selection?.overlay === "sheet" && (
				<UserSheet userId={selection.userId} scenario={selection.scenario} onClose={closeOverlay} />
			)}
			{selection?.overlay === "dialog" && (
				<UserDialog
					userId={selection.userId}
					scenario={selection.scenario}
					onClose={closeOverlay}
				/>
			)}
			{selection?.overlay === "alert-dialog" && (
				<UserAlertDialog
					userId={selection.userId}
					scenario={selection.scenario}
					onClose={closeOverlay}
				/>
			)}
		</div>
	);
}
