---
"@ngrok/mantle": patch
"@ngrok/mantle-server-syntax-highlighter": patch
---

`terraform` and `tf` join the supported code block languages. `mantleCode("terraform")`, Markdown fences, and the server highlighter render HCL with Shiki's Terraform grammar, which ships in the existing `shiki` dependency.

Terraform blocks fold as bracket pairs — `resource "type" "name" { … }`, object values, and multi-line lists all get gutter toggles. Indentation normalizes to spaces, which matches `terraform fmt`.
