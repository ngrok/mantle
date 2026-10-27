// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useQueryParamInput } from "./query-url-state";

afterEach(() => {
	vi.useRealTimers();
});

beforeEach(() => {
	vi.useFakeTimers();
});

/** Shows the typed text and offers one edit, so a test can type without the full input. */
function Host() {
	const { query, setQuery } = useQueryParamInput();
	return (
		<>
			<output>{query}</output>
			<button type="button" onClick={() => setQuery("is:new")}>
				Type
			</button>
		</>
	);
}

function renderWithRouter(initialPath: string) {
	const router = createMemoryRouter([{ path: "/", element: <Host /> }], {
		initialEntries: [initialPath],
	});
	render(<RouterProvider router={router} />);
	return router;
}

describe("useQueryParamInput", () => {
	test("writes the typed text to the URL after the wait", async () => {
		const router = renderWithRouter("/");

		act(() => screen.getByRole("button", { name: "Type" }).click());
		await act(async () => {
			await vi.advanceTimersByTimeAsync(250);
		});

		expect(router.state.location.search).toBe("?q=is%3Anew");
		expect(screen.getByRole("status").textContent).toBe("is:new");
	});

	test("sends a paginated list back to its first page", async () => {
		const router = renderWithRouter("/?q=old&page=3&sort=name");

		act(() => screen.getByRole("button", { name: "Type" }).click());
		await act(async () => {
			await vi.advanceTimersByTimeAsync(250);
		});

		expect(router.state.location.search).toBe("?q=is%3Anew&sort=name");
	});

	test("keeps a navigation that lands inside the wait", async () => {
		const router = renderWithRouter("/?q=old");

		act(() => screen.getByRole("button", { name: "Type" }).click());
		await act(async () => {
			await router.navigate("/?q=shared");
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(250);
		});

		expect(router.state.location.search).toBe("?q=shared");
		expect(screen.getByRole("status").textContent).toBe("shared");
	});
});
