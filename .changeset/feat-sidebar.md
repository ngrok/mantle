---
"@ngrok/mantle": minor
---

Add a new `Sidebar` component for multi-product dashboard navigation. Composes routing-agnostic layout primitives (`Sidebar.Root`, `Sidebar.Rail`, `Sidebar.Header`, `Sidebar.Body`, `Sidebar.Footer`, `Sidebar.Section`, `Sidebar.SectionTitle`, `Sidebar.Group`, `Sidebar.Item`, `Sidebar.RailItem`, `Sidebar.Separator`) with avatars (`Sidebar.AccountAvatar` for workspaces, `Sidebar.UserAvatar` for users) and switcher composites for accounts (`Sidebar.AccountSwitcherTrigger`, `Sidebar.SwitchAccountsRadioGroup`) and products (`Sidebar.ProductSwitcherTrigger`, `Sidebar.ProductSwitcherRadioGroup`). Active state is consumer-controlled via the `active` prop and `data-active` / `aria-current="page"`; compose with any router via `asChild`.
