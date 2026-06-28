# Nezha Context

Nezha manages AI coding agents as project-scoped desktop tasks. This glossary names the user-visible terminal and agent concepts that recur across frontend and Tauri code.

## Language

**Agent Task Terminal**:
The terminal surface Nezha presents for a running AI coding task, including the hosted agent's output and the user's input stream.
_Avoid_: Codex panel, Claude panel, task console

**Hosted Agent TUI**:
The terminal user interface owned by the AI agent process running inside an Agent Task Terminal.
_Avoid_: terminal screen, agent page

**Host Scrollback**:
The terminal history owned by Nezha's Agent Task Terminal, separate from any viewport or transcript navigation owned by the Hosted Agent TUI.
_Avoid_: browser scroll, page scroll, transcript scroll
