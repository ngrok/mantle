---
"@ngrok/mantle": patch
---

`IconButton` now accepts `children` only with `asChild`. Before, `<IconButton …>Copy text</IconButton>` type-checked, and the button dropped the children at runtime and rendered the `icon` alone. Now that call site is a type error. With `asChild`, the one child is still the element that renders.

`Alert.DismissIconButton`, `Dialog.CloseIconButton`, `Sheet.CloseIconButton`, `Field.HelpTrigger`, and `DataTable.RowExpandButton` take the same rule. `SplitButton.MenuTrigger` takes no `children`. The change is to types only: the runtime code and the bundle do not change.

Two valid patterns can stop compiling:

- A wrapper typed `Omit<IconButtonProps, "icon">` or `Omit<ComponentProps<typeof IconButton>, "icon">` that spreads its props into `IconButton`. `Omit` merges the two branches of the `asChild` union. Use an `Omit` that keeps each branch:

  ```ts
  type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

  type MyIconButtonProps = DistributiveOmit<IconButtonProps, "icon">;
  ```

- A dynamic `asChild={isLink}`. Render one `IconButton` for each case instead:

  ```tsx
  isLink ? (
  	<IconButton asChild {...props}>
  		<a href={href} />
  	</IconButton>
  ) : (
  	<IconButton {...props} />
  );
  ```
