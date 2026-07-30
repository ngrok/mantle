# Mantle Compound Component Named Exports

## Status

- [x] Proposed
- [x] Accepted
- [x] Implemented 2025-08-06
- [ ] Superseded

## Decision Drivers

- Developer experience complaints about verbose imports
- Component naming inconsistency across the library
- Inspiration from successful patterns (Radix UI, Chakra UI)
- Need for better component discoverability
- Reduction of import statement complexity
- Tree-shaking and bundle size optimization (at the component boundary only)

## Key Trade-offs and Design Philosophy

### Developer Experience vs. Tree Shaking

This migration trades off some "tree shakeability" in the academic sense only. In reality, if you import something like `Dialog`, chances are you use most, if not all of the sub-composite components as well.

**🔑 Key Thought**: The potential bytes saved of individual component exports are so minimal relative to the benefits to developer experience of compound component exports.

We still get tree shaking between mantle component boundaries, but we "lose" isolated component module (file) tree shaking.

### What is Tree Shaking?

**Tree shaking** is a non-standard optimization technique that allows a bundler (like `vite` or `webpack`) to remove unused code from your compiled JS bundle to minimize what you need to ship to the browser.

## Overview

This document outlines the complete migration plan for converting Mantle compound components from individual named exports to namespace-based exports. The goal is to improve developer experience by allowing usage like `<Dialog.Root>` instead of importing many individual components.

### What is a Compound Component?

A **compound component** is a design pattern where a single logical component consists of multiple sub-components that compose together to create a cohesive user interface. Examples include:

- `Dialog` with `Dialog.Root`, `Dialog.Content`, `Dialog.Header`, `Dialog.Title`, etc.
- `Table` with `Table.Root`, `Table.Header`, `Table.Body`, `Table.Row`, `Table.Cell`, etc.
- `DropdownMenu` with `DropdownMenu.Root`, `DropdownMenu.Trigger`, `DropdownMenu.Content`, `DropdownMenu.Item`, etc.

These components work together and share state or context through React patterns like Context API or compound component composition.

The goal is to improve developer experience by allowing usage like `<Dialog.Root>` so that all sub-components of the Dialog are discoverable (with IntelliSense and examples!) directly off of the imported component! This is in contrast to how it currently works with importing many individual components (e.g. `Dialog`, `DialogContent`, `DialogBody`, etc.) which aren't very discoverable! That pattern forces you to know how to compose and what the sub-components are called before you use them: not very developer friendly!

## Background

### Current State

```tsx
// Current pattern
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@ngrok/mantle/dialog";

<Dialog>
	<DialogTrigger>Open</DialogTrigger>
	<DialogContent>
		<DialogTitle>Title</DialogTitle>
	</DialogContent>
</Dialog>;
```

### Target State

```tsx
// New pattern
import { Dialog } from "@ngrok/mantle/dialog";

<Dialog>
	<Dialog.Trigger>Open</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Title>Title</Dialog.Title>
	</Dialog.Content>
</Dialog>;
```

## Alternatives Considered

### Option 1: Keep Current Pattern

- **Pros**: No migration needed, familiar to current users, no breaking changes
- **Cons**: Verbose imports, naming inconsistency, poor developer experience

### Option 2: Dual Export (both patterns)

```tsx
export { Dialog, DialogContent }; // Keep both old and new
```

- **Pros**: Backward compatible, gradual migration possible
- **Cons**: Confusing API, increases bundle size, maintenance burden

### Option 3: createNamespacedComponent Helper (uses Object.assign internally)

```tsx
const Dialog = createNamespacedComponent(Root, { Content, Trigger });
// Usage: <Dialog><Dialog.Content /></Dialog>
```

- **Pros**: Best developer experience, callable root + namespace, type-safe, clean API
- **Cons**: Requires migration, custom implementation to maintain, doesn't work in react production builds

### **CHOSEN: Option 4: POJO (Plain Old JavaScript Object) Namespace**

```tsx
const Dialog = { Root, Content, Trigger };
// Usage: <Dialog.Root><Dialog.Content /></Dialog.Root>
```

- **Pros**: Simple, predictable, widely adopted pattern, no helper function needed
- **Cons**: Export is not a directly callable react component, requires `.Root` everywhere

## Decision Outcome

We will migrate 17 Mantle components to use a simple POJO namespace pattern where the main export is a plain old JavaScript object with root and sub-component properties. This follows the pattern already implemented in ProgressBar.

## Migration Scope

### Total Components: 22

- **Pure Namespace Pattern**: 18 components (including 1 already migrated)
- **Mixed Pattern**: 3 components (namespace + named exports)

### Already Migrated Components

- **`progress-bar`** - Already uses the POJO namespace pattern (ProgressBar.Root, ProgressBar.Indicator)

### Excluded Components (DO NOT MIGRATE)

- **`button`** - Many components import it; migration would break tree-shaking
- **`icon-button`** - Part of button package
- **`dialog/primitive`** - `sheet` and `alert-dialog` use it as a primitive
- **`icon`** - Widely used utility component, would break tree-shaking
- **`separator`** - Simple utility component, migration not needed
- **`input`** - Complex component with multiple patterns, defer migration

## Component Migration Lists

### Pure Namespace Pattern (17 components to migrate)

1. **`alert-dialog`** - 11 exports
   - `AlertDialog` → `AlertDialog` (root component)
   - `AlertDialogAction` → `AlertDialog.Action`
   - `AlertDialogBody` → `AlertDialog.Body`
   - `AlertDialogCancel` → `AlertDialog.Cancel`
   - `AlertDialogClose` → `AlertDialog.Close`
   - `AlertDialogContent` → `AlertDialog.Content`
   - `AlertDialogDescription` → `AlertDialog.Description`
   - `AlertDialogFooter` → `AlertDialog.Footer`
   - `AlertDialogHeader` → `AlertDialog.Header`
   - `AlertDialogIcon` → `AlertDialog.Icon`
   - `AlertDialogTitle` → `AlertDialog.Title`
   - `AlertDialogTrigger` → `AlertDialog.Trigger`

2. **`sheet`** - 13 exports
   - `Sheet` → `Sheet` (root component)
   - `SheetActions` → `Sheet.Actions`
   - `SheetBody` → `Sheet.Body`
   - `SheetClose` → `Sheet.Close`
   - `SheetCloseIconButton` → `Sheet.CloseIconButton`
   - `SheetContent` → `Sheet.Content`
   - `SheetDescription` → `Sheet.Description`
   - `SheetFooter` → `Sheet.Footer`
   - `SheetHeader` → `Sheet.Header`
   - `SheetTitle` → `Sheet.Title`
   - `SheetTitleGroup` → `Sheet.TitleGroup`
   - `SheetTrigger` → `Sheet.Trigger`

3. **`dialog`** - 11 exports
   - `Dialog` → `Dialog` (root component)
   - `DialogBody` → `Dialog.Body`
   - `DialogClose` → `Dialog.Close`
   - `DialogCloseIconButton` → `Dialog.CloseIconButton`
   - `DialogContent` → `Dialog.Content`
   - `DialogDescription` → `Dialog.Description`
   - `DialogFooter` → `Dialog.Footer`
   - `DialogHeader` → `Dialog.Header`
   - `DialogOverlay` → `Dialog.Overlay`
   - `DialogPortal` → `Dialog.Portal`
   - `DialogTitle` → `Dialog.Title`
   - `DialogTrigger` → `Dialog.Trigger`

4. **`dropdown-menu`** - 16 exports
   - `DropdownMenu` → `DropdownMenu` (root component)
   - `DropdownMenuCheckboxItem` → `DropdownMenu.CheckboxItem`
   - `DropdownMenuContent` → `DropdownMenu.Content`
   - `DropdownMenuGroup` → `DropdownMenu.Group`
   - `DropdownMenuItem` → `DropdownMenu.Item`
   - `DropdownMenuLabel` → `DropdownMenu.Label`
   - `DropdownMenuPortal` → `DropdownMenu.Portal`
   - `DropdownMenuRadioGroup` → `DropdownMenu.RadioGroup`
   - `DropdownMenuRadioItem` → `DropdownMenu.RadioItem`
   - `DropdownMenuSeparator` → `DropdownMenu.Separator`
   - `DropdownMenuShortcut` → `DropdownMenu.Shortcut`
   - `DropdownMenuSub` → `DropdownMenu.Sub`
   - `DropdownMenuSubContent` → `DropdownMenu.SubContent`
   - `DropdownMenuSubTrigger` → `DropdownMenu.SubTrigger`
   - `DropdownMenuTrigger` → `DropdownMenu.Trigger`

5. **`table`** - 9 exports
   - `Table` → `Table` (root component)
   - `TableBody` → `Table.Body`
   - `TableCaption` → `Table.Caption`
   - `TableCell` → `Table.Cell`
   - `TableFoot` → `Table.Foot`
   - `TableHead` → `Table.Head`
   - `TableHeader` → `Table.Header`
   - `TableRoot` → `Table.Root` (note: TableRoot becomes Table.Root property)
   - `TableRow` → `Table.Row`

6. **`accordion`** - 6 exports
   - `Accordion` → `Accordion` (root component)
   - `AccordionContent` → `Accordion.Content`
   - `AccordionHeading` → `Accordion.Heading`
   - `AccordionItem` → `Accordion.Item`
   - `AccordionTrigger` → `Accordion.Trigger`
   - `AccordionTriggerIcon` → `Accordion.TriggerIcon`

7. **`tabs`** - 5 exports
   - `Tabs` → `Tabs` (root component)
   - `TabsContent` → `Tabs.Content`
   - `TabsList` → `Tabs.List`
   - `TabsTrigger` → `Tabs.Trigger`
   - `TabBadge` → `Tabs.Badge`

8. **`select`** - 8 exports
   - `Select` → `Select` (root component)
   - `SelectContent` → `Select.Content`
   - `SelectGroup` → `Select.Group`
   - `SelectItem` → `Select.Item`
   - `SelectLabel` → `Select.Label`
   - `SelectSeparator` → `Select.Separator`
   - `SelectTrigger` → `Select.Trigger`
   - `SelectValue` → `Select.Value`

9. **`combobox`** - 9 exports
   - `Combobox` → `Combobox` (root component)
   - `ComboboxContent` → `Combobox.Content`
   - `ComboboxGroup` → `Combobox.Group`
   - `ComboboxGroupLabel` → `Combobox.GroupLabel`
   - `ComboboxInput` → `Combobox.Input`
   - `ComboboxItem` → `Combobox.Item`
   - `ComboboxItemValue` → `Combobox.ItemValue`
   - `ComboboxSeparator` → `Combobox.Separator`

10. **`code-block`** - 8 exports
    - `CodeBlock` → `CodeBlock` (root component)
    - `CodeBlockBody` → `CodeBlock.Body`
    - `CodeBlockCode` → `CodeBlock.Code`
    - `CodeBlockCopyButton` → `CodeBlock.CopyButton`
    - `CodeBlockExpanderButton` → `CodeBlock.ExpanderButton`
    - `CodeBlockHeader` → `CodeBlock.Header`
    - `CodeBlockIcon` → `CodeBlock.Icon`
    - `CodeBlockTitle` → `CodeBlock.Title`

11. **`alert`** - 6 exports
    - `Alert` → `Alert` (root component)
    - `AlertContent` → `Alert.Content`
    - `AlertDescription` → `Alert.Description`
    - `AlertDismissIconButton` → `Alert.DismissIconButton`
    - `AlertIcon` → `Alert.Icon`
    - `AlertTitle` → `Alert.Title`

12. **`card`** - 5 exports
    - `Card` → `Card` (root component)
    - `CardBody` → `Card.Body`
    - `CardFooter` → `Card.Footer`
    - `CardHeader` → `Card.Header`
    - `CardTitle` → `Card.Title`

13. **`radio-group`** - 11 exports
    - `RadioGroup` → `RadioGroup` (root component)
    - `RadioButton` → `RadioGroup.Button`
    - `RadioButtonGroup` → `RadioGroup.ButtonGroup`
    - `RadioCard` → `RadioGroup.Card`
    - `RadioGroupList` → `RadioGroup.List`
    - `RadioIndicator` → `RadioGroup.Indicator`
    - `RadioInputSandbox` → `RadioGroup.InputSandbox`
    - `RadioItem` → `RadioGroup.Item`
    - `RadioItemContent` → `RadioGroup.ItemContent`
    - `RadioListItem` → `RadioGroup.ListItem`

14. **`popover`** - 5 exports
    - `Popover` → `Popover` (root component)
    - `PopoverAnchor` → `Popover.Anchor`
    - `PopoverClose` → `Popover.Close`
    - `PopoverContent` → `Popover.Content`
    - `PopoverTrigger` → `Popover.Trigger`

15. **`hover-card`** - 4 exports
    - `HoverCard` → `HoverCard` (root component)
    - `HoverCardContent` → `HoverCard.Content`
    - `HoverCardPortal` → `HoverCard.Portal`
    - `HoverCardTrigger` → `HoverCard.Trigger`

16. **`tooltip`** - 3 exports (1 named export)

- `Tooltip` → `Tooltip` (root component)
- `TooltipContent` → `Tooltip.Content`
- `TooltipTrigger` → `Tooltip.Trigger`
- `TooltipProvider` → `TooltipProvider` (remains as named export)

17. **`media-object`** - 3 exports
    - `MediaObject` → `MediaObject` (root component)
    - `MediaObjectContent` → `MediaObject.Content`
    - `MediaObjectMedia` → `MediaObject.Media`

18. **`progress-donut`** - 2 exports
    - `ProgressDonut` → `ProgressDonut` (root component)
    - `ProgressDonutIndicator` → `ProgressDonut.Indicator`

### Mixed Pattern (3 components)

These components have both namespace objects AND named exports:

1. **`pagination`**
   - **Namespace**: `CursorPagination` (root component), `CursorPagination.Buttons`, `CursorPagination.PageSizeSelect`, `CursorPagination.PageSizeValue`
   - **Named Exports**: `getOffsetPaginatedSlice`, `useOffsetPagination`

2. **`data-table`**
   - **Namespace**: `DataTable` (root component), `DataTable.ActionCell`, `DataTable.Body`, `DataTable.EmptyRow`, `DataTable.Head`, `DataTable.Header`, `DataTable.HeaderSortButton`, `DataTable.Row`, `DataTable.Rows`
   - **Named Exports**: `export * from "@tanstack/react-table"`

3. **`toast`**
   - **Namespace**: `Toast` (root component), `Toast.Action`, `Toast.Icon`, `Toast.Message`
   - **Named Exports**: `makeToast`, `Toaster` (provider component)

## Implementation Details

### Using Enhanced POJO Pattern with Inline JSDoc

The migration uses a Plain Old JavaScript Object pattern with **inline JSDoc documentation** for each property, which is what IDEs read for IntelliSense. This addresses the issue where JSDoc comments on individual components don't carry over to the namespace object properties.

#### Enhanced Pattern Example:

````tsx
// Enhanced implementation with inline JSDoc
const Dialog = {
	/**
	 * The root component of the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/dialog#api-dialog-root
	 *
	 * @example
	 * ```tsx
	 * <Dialog.Root>
	 *   <Dialog.Trigger>Open</Dialog.Trigger>
	 *   <Dialog.Content>
	 *     <Dialog.Title>Title</Dialog.Title>
	 *   </Dialog.Content>
	 * </Dialog.Root>
	 * ```
	 */
	Root,
	/**
	 * The content container of the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/dialog#api-dialog-content
	 *
	 * @example
	 * ```tsx
	 * <Dialog.Content>
	 *   <Dialog.Header>
	 *     <Dialog.Title>Dialog Title</Dialog.Title>
	 *   </Dialog.Header>
	 *   <Dialog.Body>Content goes here</Dialog.Body>
	 * </Dialog.Content>
	 * ```
	 */
	Content,
	/**
	 * The header section of the dialog.
	 */
	Header,
	/**
	 * The body section of the dialog.
	 */
	Body,
	/**
	 * The footer section of the dialog.
	 */
	Footer,
	// ... other components
} as const;
````

### Why Enhanced Documentation is Required

Without inline JSDoc comments, developers lose the helpful documentation, examples, and links when using the namespace pattern. This enhanced approach makes sure that:

1. **Full JSDoc documentation** appears in IDE tooltips
2. **Usage examples** are available for each sub-component
3. **Links to documentation** are preserved
4. **Type information** remains intact
5. **Developer experience** is not degraded from the individual export pattern

### Provider Components Exception

Certain components serve as providers or have different architectural roles and should remain as individual named exports:

- **`TooltipProvider`** - Context provider component, not part of tooltip composition
- **`Toaster`** - Global toast container, separate from individual toast instances
- **Utility functions** - Like `makeToast`, these remain as named exports

The migration excludes these components from the namespace pattern because they serve foundational/provider roles rather than forming part of the compound component structure.

### Migration Pattern

For each component, follow these steps:

#### Step 1: Rename Internal Components

```tsx
// Before
const Dialog = forwardRef<...>(...);
const DialogContent = forwardRef<...>(...);
const DialogHeader = forwardRef<...>(...);

// After
const Root = forwardRef<...>(...);
const Content = forwardRef<...>(...);
const Header = forwardRef<...>(...);
```

#### Step 2: Update Display Names

```tsx
// Before
Dialog.displayName = "Dialog";
DialogContent.displayName = "DialogContent";

// After
Root.displayName = "Dialog"; // Keep original display name for debugging
Content.displayName = "DialogContent"; // Keep original display name for debugging
```

#### Step 3: Create Enhanced POJO Namespace Object with Inline JSDoc

````tsx
const Dialog = {
	/**
	 * The root component of the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/dialog#api-dialog-root
	 *
	 * @example
	 * ```tsx
	 * <Dialog.Root>
	 *   <Dialog.Trigger>Open</Dialog.Trigger>
	 *   <Dialog.Content>
	 *     <Dialog.Title>Title</Dialog.Title>
	 *   </Dialog.Content>
	 * </Dialog.Root>
	 * ```
	 */
	Root,
	/**
	 * The content container of the dialog.
	 *
	 * @see https://mantle.ngrok.com/components/dialog#api-dialog-content
	 */
	Content,
	/**
	 * The header section of the dialog.
	 */
	Header,
	// ... other components with inline JSDoc
} as const;
````

**Important**: Each property in the namespace object must include full JSDoc documentation to preserve the developer experience from individual exports.

#### Step 4: Update Exports

```tsx
// Before
export {
	Dialog,
	DialogContent,
	DialogHeader,
	// ... other individual exports
};

// After
export {
	Dialog, // Export the namespace object
};
```

## Migration Phases

### Phase 1A: Component Migration (First Batch - 5 components)

**Components**: `alert-dialog`, `sheet`, `dropdown-menu`, `table`, `progress-donut`

**Timeline**: 1-2 weeks

**Steps**:

1. Update each component file following the migration pattern
2. Test component functionality
3. Run validation commands (see Validation Commands section)
4. Verify tree-shaking works correctly

### Phase 1B: WWW Docs Updates for Phase 1A

**Timeline**: 1 week

**Steps**:

1. Update React imports in `apps/www/app/routes/components.*.tsx`
2. Update JSX usage from individual components to namespace
3. Update code block examples (strings in markdown)
4. Update documentation prose
5. Test all examples work correctly

### Phase 2A: Component Migration (Second Batch - 4 components)

**Components**: `accordion`, `tabs`, `select`, `combobox`

**Timeline**: 1-2 weeks

**Steps**: Same as Phase 1A

### Phase 2B: WWW Docs Updates for Phase 2A

**Timeline**: 1 week

**Steps**: Same as Phase 1B

### Phase 3A: Component Migration (Third Batch - 4 components)

**Components**: `code-block`, `alert`, `card`, `radio-group`

**Timeline**: 1-2 weeks

**Steps**: Same as Phase 1A

### Phase 3B: WWW Docs Updates for Phase 3A

**Timeline**: 1 week

**Steps**: Same as Phase 1B

### Phase 4A: Component Migration (Fourth Batch - 4 components)

**Components**: `popover`, `hover-card`, `tooltip`, `media-object`

**Timeline**: 1-2 weeks

**Steps**: Same as Phase 1A

### Phase 4B: WWW Docs Updates for Phase 4A

**Timeline**: 1 week

**Steps**: Same as Phase 1B

### Phase 5A: Mixed Pattern Components (Final Batch - 3 components)

**Components**: `pagination`, `data-table`, `toast`

**Timeline**: 1-2 weeks

**Special Considerations**:

- Maintain both namespace AND named exports
- Update import statements carefully
- Test utility functions still work

### Phase 5B: WWW Docs Updates for Phase 5A

**Timeline**: 1 week

**Steps**: Same as Phase 1B, but include mixed pattern examples

## Detailed Implementation Examples

### Example 1: Pure Namespace Pattern (Alert)

#### Before:

```tsx
// packages/mantle/src/components/alert/alert.tsx
const Alert = forwardRef<...>(...);
const AlertContent = forwardRef<...>(...);
const AlertIcon = forwardRef<...>(...);

export {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  AlertDismissIconButton,
};
```

#### After:

````tsx
// packages/mantle/src/components/alert/alert.tsx
const Root = forwardRef<...>(...);
const Content = forwardRef<...>(...);
const Icon = forwardRef<...>(...);
const Title = forwardRef<...>(...);
const Description = forwardRef<...>(...);
const DismissIconButton = forwardRef<...>(...);

// Keep original display names for debugging
Root.displayName = "Alert";
Content.displayName = "AlertContent";
Icon.displayName = "AlertIcon";
Title.displayName = "AlertTitle";
Description.displayName = "AlertDescription";
DismissIconButton.displayName = "AlertDismissIconButton";

const Alert = {
  /**
   * The root container of the alert component.
   *
   * @see https://mantle.ngrok.com/components/alert#api-alert-root
   *
   * @example
   * ```tsx
   * <Alert.Root>
   *   <Alert.Icon />
   *   <Alert.Content>
   *     <Alert.Title>Alert Title</Alert.Title>
   *     <Alert.Description>Alert description</Alert.Description>
   *   </Alert.Content>
   * </Alert.Root>
   * ```
   */
  Root,
  /**
   * The content container of the alert.
   *
   * @see https://mantle.ngrok.com/components/alert#api-alert-content
   */
  Content,
  /**
   * The description text of the alert.
   *
   * @see https://mantle.ngrok.com/components/alert#api-alert-description
   */
  Description,
  /**
   * A button to dismiss the alert.
   *
   * @see https://mantle.ngrok.com/components/alert#api-alert-dismiss-icon-button
   */
  DismissIconButton,
  /**
   * The icon for the alert.
   *
   * @see https://mantle.ngrok.com/components/alert#api-alert-icon
   */
  Icon,
  /**
   * The title of the alert.
   *
   * @see https://mantle.ngrok.com/components/alert#api-alert-title
   */
  Title,
} as const;

export {
  Alert,
};
````

### Example 2: Mixed Pattern (Toast)

#### Before:

```tsx
// packages/mantle/src/components/toast/toast.tsx
const Toast = forwardRef<...>(...);
const ToastAction = forwardRef<...>(...);
const ToastIcon = forwardRef<...>(...);
const ToastMessage = forwardRef<...>(...);
const Toaster = forwardRef<...>(...);

function makeToast(children: ReactNode, options?: MakeToastOptions) {
  // ... implementation
}

export {
  makeToast,
  Toast,
  ToastAction,
  Toaster,
  ToastIcon,
  ToastMessage,
};
```

#### After:

````tsx
// packages/mantle/src/components/toast/toast.tsx
const Root = forwardRef<...>(...);
const Action = forwardRef<...>(...);
const Icon = forwardRef<...>(...);
const Message = forwardRef<...>(...);
const Toaster = forwardRef<...>(...);

function makeToast(children: ReactNode, options?: MakeToastOptions) {
  // ... implementation
}

// Keep original display names
Root.displayName = "Toast";
Action.displayName = "ToastAction";
Icon.displayName = "ToastIcon";
Message.displayName = "ToastMessage";
Toaster.displayName = "Toaster";

const Toast = {
  /**
   * The root container of the toast component.
   *
   * @see https://mantle.ngrok.com/components/toast#api-toast-root
   *
   * @example
   * ```tsx
   * <Toast.Root>
   *   <Toast.Icon />
   *   <Toast.Message>Toast message</Toast.Message>
   *   <Toast.Action>Action</Toast.Action>
   * </Toast.Root>
   * ```
   */
  Root,
  /**
   * An action button for the toast.
   *
   * @see https://mantle.ngrok.com/components/toast#api-toast-action
   */
  Action,
  /**
   * The icon for the toast.
   *
   * @see https://mantle.ngrok.com/components/toast#api-toast-icon
   */
  Icon,
  /**
   * The message content of the toast.
   *
   * @see https://mantle.ngrok.com/components/toast#api-toast-message
   */
  Message,
} as const;

export {
  makeToast, // Keep as named export
  Toaster,   // Provider component - keep as named export
  Toast,     // Namespace object
};
````

## WWW Documentation Updates

### File Locations

Update the following files in `apps/www/app/routes/`:

- `components.alert.tsx`
- `components.alert-dialog.tsx`
- `components.sheet.tsx`
- `components.dropdown-menu.tsx`
- `components.table.tsx`
- `components.accordion.tsx`
- `components.tabs.tsx`
- `components.select.tsx`
- `components.combobox.tsx`
- `components.code-block.tsx`
- `components.card.tsx`
- `components.radio-group.tsx`
- `components.popover.tsx`
- `components.hover-card.tsx`
- `components.tooltip.tsx`
- `components.media-object.tsx`
- `components.pagination.tsx`
- `components.data-table.tsx`
- `components.toast.tsx`

### Update Pattern

#### 1. Import Statements

```tsx
// Before
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from "@ngrok/mantle/alert";

// After
import { Alert } from "@ngrok/mantle/alert";
```

#### 2. JSX Usage

```tsx
// Before
<Alert>
  <AlertIcon />
  <AlertContent>
    <AlertTitle>Title</AlertTitle>
    <AlertDescription>Description</AlertDescription>
  </AlertContent>
</Alert>

// After
<Alert>
  <Alert.Icon />
  <Alert.Content>
    <Alert.Title>Title</Alert.Title>
    <Alert.Description>Description</Alert.Description>
  </Alert.Content>
</Alert>
```

#### 3. Code Block Examples

```tsx
// Before - in markdown strings
const exampleCode = `
import { Alert, AlertContent, AlertTitle } from "@ngrok/mantle/alert";

<Alert>
  <AlertContent>
    <AlertTitle>Example</AlertTitle>
  </AlertContent>
</Alert>
`;

// After - in markdown strings
const exampleCode = `
import { Alert } from "@ngrok/mantle/alert";

<Alert>
  <Alert.Content>
    <Alert.Title>Example</Alert.Title>
  </Alert.Content>
</Alert>
`;
```

## Validation Commands

Use these commands to validate your changes after each component migration:

### 1. Lint and Format

```bash
pnpm -w fmt-lint
```

### 2. Type Checking

```bash
pnpm -w typecheck
```

### 3. Build

```bash
pnpm -w build
```

### 4. Start WWW Dev Server

```bash
pnpm -w start
```

Then open http://localhost:3333 in your browser to test the components visually.

### 5. Automated Testing (Optional)

You can use Playwright or similar tools to test against the live dev server at http://localhost:3333.

## Testing Requirements

### Unit Tests

- [ ] All component functionality works as before
- [ ] Props are properly forwarded
- [ ] Refs work correctly
- [ ] Display names are preserved
- [ ] TypeScript types are correct
- [ ] JSDoc documentation appears in IDE tooltips for namespace properties
- [ ] IntelliSense shows autocomplete with documentation

### Integration Tests

- [ ] Components compose correctly
- [ ] Event handlers work
- [ ] Styling is preserved
- [ ] Accessibility is maintained

### Build Tests

- [ ] All validation commands succeed (see Validation Commands section)
- [ ] Bundle size hasn't increased significantly

### Tree-Shaking Tests

- [ ] Importing single components doesn't pull in namespace
- [ ] Cross-component imports still work
- [ ] Bundle analyzer shows proper tree-shaking

### WWW Site Tests

- [ ] All component examples render correctly
- [ ] Interactive examples work
- [ ] Code examples are syntactically correct
- [ ] Hot reload works during development

## Quality Assurance Checklist

### Before Migration

- [x] Identify all cross-component dependencies
- [x] Run full test suite
- [x] Document current bundle sizes
- [x] Verify all examples work

### During Migration

- [x] Test each component individually
- [x] Run all validation commands
- [x] Check React DevTools component names
- [x] Test Hot Module Replacement

### After Migration

- [x] Run full test suite
- [x] Compare bundle sizes
- [x] Test all www examples at http://localhost:3333
- [x] Verify tree-shaking works
- [x] Check component display names in React DevTools

## Troubleshooting Guide

### Common Issues

#### TypeScript Errors

**Problem**: TypeScript can't find component properties
**Solution**: Check that the POJO namespace object uses `as const`

#### Component Not Rendering

**Problem**: Component returns blank/error
**Solution**: Verify that the file defines `Root` and includes it in the POJO namespace object

#### Tree-Shaking Issues

**Problem**: Bundle size increased unexpectedly
**Solution**: Check for circular imports or accidental namespace imports

#### Hot Reload Not Working

**Problem**: Changes don't reflect during development
**Solution**: Verify the namespace object sets `displayName` correctly

#### Cross-Component Imports Broken

**Problem**: Other components can't import sub-components
**Solution**: Check whether the migration should exclude the component (like button, icon-button)

### Rollback Plan

If issues arise, you can quickly roll a component back:

1. Restore original exports in the component file
2. Restore individual component names
3. Update corresponding www documentation
4. Run tests to verify rollback

## Success Criteria

### Component Level

- [x] All component functionality preserved
- [x] TypeScript types work correctly
- [x] Display names preserved for debugging
- [x] Tree-shaking works properly

### Developer Experience

- [x] Namespace pattern works as expected
- [x] IDE autocomplete works with full JSDoc documentation
- [x] JSDoc examples and links appear in tooltips
- [x] Error messages are clear
- [x] Hot reload works correctly
- [x] IntelliSense experience matches or exceeds individual exports

### Documentation

- [x] All examples updated
- [x] Code blocks syntactically correct
- [x] Interactive examples work
- [x] Migration guide available

### Performance

- [x] Bundle size not significantly increased
- [x] Tree-shaking works correctly
- [x] No runtime performance regression
- [x] Build times not significantly increased

## Timeline Summary

| Phase | Components | Duration  | Description                |
| ----- | ---------- | --------- | -------------------------- |
| 1A    | 5          | 1-2 weeks | High priority components   |
| 1B    | -          | 1 week    | WWW docs update            |
| 2A    | 4          | 1-2 weeks | Medium priority components |
| 2B    | -          | 1 week    | WWW docs update            |
| 3A    | 4          | 1-2 weeks | Lower priority components  |
| 3B    | -          | 1 week    | WWW docs update            |
| 4A    | 4          | 1-2 weeks | Final standard components  |
| 4B    | -          | 1 week    | WWW docs update            |
| 5A    | 3          | 1-2 weeks | Mixed pattern components   |
| 5B    | -          | 1 week    | WWW docs update            |

**Total Estimated Timeline**: 10-15 weeks

## Getting Started

1. **Read this entire document** - Make sure you understand the migration pattern
2. **Review the ProgressBar implementation** - See how the simple POJO pattern works
3. **Start with Phase 1A** - Begin with `alert-dialog` component
4. **Test thoroughly** - Use the validation commands after each change
5. **Update documentation** - Don't forget the WWW site updates
6. **Ask questions** - If anything is unclear, ask before proceeding

## Notes for Junior Engineers

- **Take your time** - This is a large migration, accuracy is more important than speed
- **Test everything** - Run all validation commands after each change
- **Follow the enhanced pattern** - Use the inline JSDoc examples in this document, don't deviate
- **Document all properties** - Every property in the namespace object needs full JSDoc
- **Test IntelliSense** - Verify that JSDoc documentation appears in IDE tooltips
- **Copy existing JSDoc** - Use the original component JSDoc as a starting point for inline docs
- **Document changes** - Keep notes of any issues or deviations
- **Ask for help** - If you're stuck, ask for assistance
- **Check your work** - Run all validation commands before considering a phase complete

## Consequences

### Positive

- Improved developer experience with cleaner imports
- Better component discoverability through namespace exploration
- Consistent naming patterns across the entire library
- Reduced cognitive load for new developers learning the API
- Better IDE autocomplete and IntelliSense support
- Alignment with industry standards (similar to Radix UI)

### Negative

- Large migration effort across codebase and documentation
- Breaking change requiring major version bump
- Temporary disruption during migration phases
- Custom helper function to maintain long-term
- Potential confusion during transition period
- Learning curve for existing users familiar with current pattern

### Neutral

- Documentation requires updates
- WWW site examples need migration
- Bundle size impact should be minimal due to tree-shaking
- React DevTools component names preserved via displayName

Good luck with the migration! 🚀
