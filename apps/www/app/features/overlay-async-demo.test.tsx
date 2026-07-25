// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUser, UserOverlayDemo } from "./overlay-async-demo";

/** Renders the demo inside the QueryClientProvider it expects from the app root. */
function renderDemo() {
	const queryClient = new QueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<UserOverlayDemo />
		</QueryClientProvider>,
	);
}

/**
 * Advances the demo's simulated latency (1.5s per attempt) and retry delays
 * inside `act`. Fake timers make the terminal-state tests instant instead of
 * ~15s of real waiting, and deterministic instead of polling.
 */
async function advanceBy(durationMs: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(durationMs);
	});
}

/** Long enough for the happy path, the terminal 404, and the retried 500. */
const SETTLE_MS = 10_000;

/** Past the first simulated request, but inside the retry delay that follows it. */
const FIRST_ATTEMPT_MS = 1_600;

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

// Regression: the overlay picker originally nested RadioGroup.ButtonGroup
// inside RadioGroup.Root, so the buttons bound to an inner, uncontrolled
// group — nothing was selected by default and every scenario opened a Sheet
// regardless of the picked overlay.
describe("UserOverlayDemo", () => {
	it("defaults the overlay picker to Sheet", () => {
		renderDemo();

		expect(screen.getByRole("radio", { name: "Sheet" }).getAttribute("aria-checked")).toBe("true");
		expect(screen.getByRole("radio", { name: "Dialog" }).getAttribute("aria-checked")).toBe(
			"false",
		);
	});

	it("opens an overlay immediately on scenario click, before data resolves", () => {
		renderDemo();

		fireEvent.click(screen.getByRole("button", { name: "Happy path" }));

		// The shell mounts synchronously with the pending body — that is the
		// recipe's core claim. (Sheet renders role="dialog".)
		expect(screen.getByRole("dialog", { name: "User details" })).toBeDefined();
	});

	it("opens the alert dialog when Alert Dialog is picked", () => {
		renderDemo();

		fireEvent.click(screen.getByRole("radio", { name: "Alert Dialog" }));
		fireEvent.click(screen.getByRole("button", { name: "Happy path" }));

		// The alert-dialog shell is distinguishable by its confirmation title and
		// its gated destructive action (disabled while the query is pending).
		expect(screen.getByRole("dialog", { name: "Remove this user?" })).toBeDefined();
		expect(screen.getByRole("button", { name: "Remove user" }).hasAttribute("disabled")).toBe(true);
	});

	it("opens the dialog when Dialog is picked", () => {
		renderDemo();

		fireEvent.click(screen.getByRole("radio", { name: "Dialog" }));
		fireEvent.click(screen.getByRole("button", { name: "404 error" }));

		expect(screen.getByRole("dialog", { name: "User details" })).toBeDefined();
		expect(screen.queryByRole("dialog", { name: "Remove this user?" })).toBeNull();
	});
});

// Every test above stops at the pending frame. These drive each scenario to its
// terminal state, which is where the recipe's actual claims live: the retry
// policy (transient 500s are retried, terminal 404s are not) and the error-copy
// mapping (only a recoverable failure gets a Retry action).
describe("UserOverlayDemo terminal states", () => {
	it("swaps the pending body for the loaded record", async () => {
		vi.useFakeTimers();
		renderDemo();

		fireEvent.click(screen.getByRole("button", { name: "Happy path" }));
		expect(screen.getByLabelText("Loading user details")).toBeDefined();
		expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(
			true,
		);

		await advanceBy(SETTLE_MS);

		expect(screen.queryByLabelText("Loading user details")).toBeNull();
		expect(screen.getByText("Ada Lovelace")).toBeDefined();
		expect(screen.getByText("ada.lovelace@example.com")).toBeDefined();
		expect(screen.getByText("Analytical Engines")).toBeDefined();
		// the gated action only opens once there is a record to act on
		expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(
			false,
		);
	});

	it("treats a 404 as terminal: no retry attempt and no retry action", async () => {
		vi.useFakeTimers();
		renderDemo();

		fireEvent.click(screen.getByRole("button", { name: "404 error" }));
		await advanceBy(FIRST_ATTEMPT_MS);

		// already terminal one attempt in — a retried 404 would still be pending
		expect(screen.queryByLabelText("Loading user details")).toBeNull();
		expect(screen.getByText("User not found")).toBeDefined();
		expect(screen.getByText("req_404_rmissing")).toBeDefined();
		expect(screen.queryByRole("button", { name: "Retry request" })).toBeNull();

		await advanceBy(SETTLE_MS);

		expect(screen.getByText("User not found")).toBeDefined();
		expect(screen.queryByRole("button", { name: "Retry request" })).toBeNull();
	});

	it("retries a 500, reports the attempt, then offers a manual retry", async () => {
		vi.useFakeTimers();
		renderDemo();

		fireEvent.click(screen.getByRole("button", { name: "500 error" }));
		await advanceBy(FIRST_ATTEMPT_MS);

		// still pending, because a 500 under the retry limit is retried
		expect(screen.getByLabelText("Loading user details")).toBeDefined();
		expect(screen.getByRole("status").textContent).toBe("Retrying after 1 failed attempt.");

		await advanceBy(SETTLE_MS);

		// the limit stops the retries, so the body reaches a recoverable error
		expect(screen.queryByLabelText("Loading user details")).toBeNull();
		expect(screen.getByText("User service unavailable")).toBeDefined();
		expect(screen.getByText("req_500_J8Q7Z5K2")).toBeDefined();
		expect(screen.getByRole("button", { name: "Retry request" })).toBeDefined();
	});

	it("keeps the alert dialog's destructive action gated until the record loads", async () => {
		vi.useFakeTimers();
		renderDemo();

		fireEvent.click(screen.getByRole("radio", { name: "Alert Dialog" }));
		fireEvent.click(screen.getByRole("button", { name: "500 error" }));
		await advanceBy(SETTLE_MS);

		// an inline error keeps the overlay open and the action gated, rather than
		// closing the overlay and losing the reader's place
		expect(screen.getByRole("dialog", { name: "Remove this user?" })).toBeDefined();
		expect(screen.getByText("User service unavailable")).toBeDefined();
		expect(screen.getByRole("button", { name: "Remove user" }).hasAttribute("disabled")).toBe(true);
	});

	it("enables Clear cache only while a successful response is cached", async () => {
		vi.useFakeTimers();
		renderDemo();

		// held by reference: an open overlay marks the controls aria-hidden, which
		// takes them out of reach of role queries
		const clearCache = screen.getByRole("button", { name: "Clear cache" });
		const happyPath = screen.getByRole("button", { name: "Happy path" });
		const serverError = screen.getByRole("button", { name: "500 error" });

		expect(clearCache.hasAttribute("disabled")).toBe(true);

		// a failed request never counts as a cached response
		fireEvent.click(serverError);
		await advanceBy(SETTLE_MS);
		expect(clearCache.hasAttribute("disabled")).toBe(true);

		fireEvent.click(happyPath);
		await advanceBy(SETTLE_MS);
		expect(clearCache.hasAttribute("disabled")).toBe(false);

		fireEvent.click(clearCache);
		expect(clearCache.hasAttribute("disabled")).toBe(true);
	});
});

/** The metadata the demo attaches to a simulated HTTP failure. */
function isUserRequestError(
	error: unknown,
): error is Error & { status: number; requestId: string } {
	return (
		error instanceof Error &&
		error.name === "UserRequestError" &&
		"status" in error &&
		typeof error.status === "number" &&
		"requestId" in error &&
		typeof error.requestId === "string"
	);
}

/** Reads a caught value's request-error fields, failing loudly on any other shape. */
function userRequestErrorFields(error: unknown) {
	if (!isUserRequestError(error)) {
		throw new Error(`expected a UserRequestError, received: ${String(error)}`);
	}
	return { message: error.message, requestId: error.requestId, status: error.status };
}

/** Runs the fetcher to settlement under fake timers, returning value or reason. */
async function settleFetch(promise: Promise<unknown>): Promise<unknown> {
	const settled = promise.catch((error: unknown) => error);
	await vi.advanceTimersByTimeAsync(SETTLE_MS);
	return settled;
}

// The retry policy and the error copy branch on these fields, so the fetcher has
// to keep producing them: a dropped `status` turns both the 404 and the 500 into
// the generic "Could not load user" fallback, which is retryable.
describe("fetchUser", () => {
	it("resolves the demo record for the success scenario", async () => {
		vi.useFakeTimers();

		const user = await settleFetch(fetchUser({ userId: "user_1", scenario: "success" }));

		expect(user).toMatchObject({ id: "user_1", name: "Ada Lovelace", plan: "Enterprise" });
	});

	it("rejects with a 404 and a request id for the not-found scenario", async () => {
		vi.useFakeTimers();

		const error = await settleFetch(fetchUser({ userId: "user_missing", scenario: "not-found" }));

		expect(userRequestErrorFields(error)).toEqual({
			status: 404,
			message: "No user exists for user_missing.",
			requestId: "req_404_rmissing",
		});
	});

	it("rejects with a 500 and a request id for the server-error scenario", async () => {
		vi.useFakeTimers();

		const error = await settleFetch(
			fetchUser({ userId: "user_01J8Q7Z5K2", scenario: "server-error" }),
		);

		expect(userRequestErrorFields(error)).toEqual({
			status: 500,
			message: "The user service failed before returning profile data.",
			requestId: "req_500_J8Q7Z5K2",
		});
	});

	it("rejects with a cancellation when the signal aborts mid-flight", async () => {
		vi.useFakeTimers();
		const controller = new AbortController();

		const settled = fetchUser({
			userId: "user_1",
			scenario: "success",
			signal: controller.signal,
		}).catch((error: unknown) => error);
		await vi.advanceTimersByTimeAsync(500);
		controller.abort();
		await vi.advanceTimersByTimeAsync(SETTLE_MS);
		const error = await settled;

		expect(error).toBeInstanceOf(Error);
		expect(error).toMatchObject({
			name: "RequestCancelledError",
			message: "The user details request was cancelled.",
		});
	});

	it("rejects immediately when the signal is already aborted", async () => {
		vi.useFakeTimers();

		const error = await settleFetch(
			fetchUser({ userId: "user_1", scenario: "success", signal: AbortSignal.abort() }),
		);

		expect(error).toMatchObject({ name: "RequestCancelledError" });
		// nothing was scheduled, so no timer is left behind for the next test
		expect(vi.getTimerCount()).toBe(0);
	});
});
