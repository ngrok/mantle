import { useCallback, useMemo, useReducer, useRef } from "react";

type UseUndoRedoReturn<T> = {
	/** Whether there are actions to undo. */
	canUndo: boolean;
	/** Whether there are actions to redo. */
	canRedo: boolean;
	/** Push a snapshot onto the undo stack. Clears the redo stack. */
	push: (snapshot: T) => void;
	/** Pop the last snapshot from the undo stack. Returns `undefined` if empty. */
	undo: (current: T) => T | undefined;
	/** Pop the last snapshot from the redo stack. Returns `undefined` if empty. */
	redo: (current: T) => T | undefined;
};

/**
 * Generic undo/redo hook that maintains two history stacks (undo and redo).
 *
 * The hook does not own your application state — instead it helps you
 * snapshot it. Call `push(snapshot)` *before* mutating state to capture
 * the current value, then call `undo(current)` or `redo(current)` to swap
 * `current` with the previous/next snapshot. Both `undo` and `redo` return
 * the snapshot to apply, or `undefined` if their stack is empty. Pushing a
 * new snapshot clears the redo stack, matching standard editor semantics.
 *
 * `push`, `undo`, and `redo` operate on the live history, so calling them
 * multiple times within a single event handler works as expected — each
 * call sees the result of the previous one.
 *
 * @typeParam T - The type of the value being snapshotted (e.g. a list of
 *   items, a serialized form value, etc.). Constrained to non-nullish
 *   values: `undefined` is reserved as the "stack is empty" sentinel and
 *   cannot itself be stored as a snapshot, and `null` snapshots would
 *   defeat the truthiness checks used at typical call sites.
 *
 * @returns An object with the current undo/redo capability flags and
 *   actions:
 *   - `canUndo`: `true` when there is at least one snapshot on the undo
 *     stack.
 *   - `canRedo`: `true` when there is at least one snapshot on the redo
 *     stack.
 *   - `push(snapshot)`: Push a snapshot onto the undo stack and clear the
 *     redo stack. Call this *before* mutating state.
 *   - `undo(current)`: Pop the latest undo snapshot and return it; returns
 *     `undefined` when the undo stack is empty. The supplied `current` is
 *     pushed onto the redo stack so you can redo back to it.
 *   - `redo(current)`: Pop the latest redo snapshot and return it; returns
 *     `undefined` when the redo stack is empty. The supplied `current` is
 *     pushed onto the undo stack.
 *
 * @example
 * // Snapshot before mutating, then wire up keyboard shortcuts
 * const [items, setItems] = useState<string[]>([]);
 * const { push, undo, redo, canUndo, canRedo } = useUndoRedo<string[]>();
 *
 * function removeItem(item: string) {
 *   push(items); // snapshot before mutation
 *   setItems((prev) => prev.filter((entry) => entry !== item));
 * }
 *
 * function handleKeyDown(event: React.KeyboardEvent) {
 *   const cmd = event.metaKey || event.ctrlKey;
 *   if (cmd && event.key === "z" && !event.shiftKey) {
 *     const previous = undo(items);
 *     if (previous) {
 *       setItems(previous);
 *     }
 *   }
 *   if (cmd && ((event.shiftKey && event.key === "z") || event.key === "y")) {
 *     const next = redo(items);
 *     if (next) {
 *       setItems(next);
 *     }
 *   }
 * }
 *
 * return (
 *   <div tabIndex={0} onKeyDown={handleKeyDown}>
 *     <button disabled={!canUndo} onClick={() => { const previous = undo(items); if (previous) setItems(previous); }}>Undo</button>
 *     <button disabled={!canRedo} onClick={() => { const next = redo(items); if (next) setItems(next); }}>Redo</button>
 *   </div>
 * );
 */
function useUndoRedo<T extends NonNullable<unknown>>(): UseUndoRedoReturn<T> {
	/**
	 * Why refs instead of reducer state: `undo`/`redo` must both mutate the
	 * history *and* return the popped snapshot. With reducer state, the
	 * callbacks close over the stacks from the last committed render, so two
	 * calls within the same event handler would both pop (and return) the
	 * same snapshot. Refs are always current; the version counter below
	 * re-renders consumers so `canUndo`/`canRedo` stay in sync.
	 */
	const undoStackRef = useRef<T[]>([]);
	const redoStackRef = useRef<T[]>([]);
	const [, bumpVersion] = useReducer((version: number) => version + 1, 0);

	const push = useCallback((snapshot: T) => {
		undoStackRef.current.push(snapshot);
		redoStackRef.current = [];
		bumpVersion();
	}, []);

	const undo = useCallback((current: T): T | undefined => {
		const previous = undoStackRef.current[undoStackRef.current.length - 1];
		if (previous === undefined) {
			return undefined;
		}
		undoStackRef.current.pop();
		redoStackRef.current.push(current);
		bumpVersion();
		return previous;
	}, []);

	const redo = useCallback((current: T): T | undefined => {
		const next = redoStackRef.current[redoStackRef.current.length - 1];
		if (next === undefined) {
			return undefined;
		}
		redoStackRef.current.pop();
		undoStackRef.current.push(current);
		bumpVersion();
		return next;
	}, []);

	const canUndo = undoStackRef.current.length > 0;
	const canRedo = redoStackRef.current.length > 0;

	return useMemo(
		() => ({
			canUndo,
			canRedo,
			push,
			undo,
			redo,
		}),
		[canUndo, canRedo, push, undo, redo],
	);
}

export {
	//,
	useUndoRedo,
};

export type {
	//,
	UseUndoRedoReturn,
};
