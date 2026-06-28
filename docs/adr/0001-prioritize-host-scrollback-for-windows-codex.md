# Prioritize Host Scrollback for Windows Codex

On Windows, Codex mouse-wheel input inside the Agent Task Terminal depends on a terminal input path that is unreliable through ConPTY when the Hosted Agent TUI uses full-screen mouse handling. We decided that Windows Codex tasks should prioritize reliable Host Scrollback over preserving Codex's full-screen TUI scrolling behavior, aligning the user-visible outcome with Claude tasks on Windows.

**Consequences**

This makes Windows Codex output reliably scrollable from Nezha's terminal surface, but Codex approval and diff flows may appear inline rather than as a fully controlled alternate-screen experience.

The scope is deliberately limited to Windows Codex Agent Task Terminals. Claude on Windows already has working wheel behavior, and macOS/Linux PTYs can preserve the Hosted Agent TUI's mouse handling without this fallback.

Automated tests can verify the command wiring and frontend guard conditions, but the end-to-end behavior remains a Windows manual regression item because it depends on WebView, xterm.js, ConPTY, and Codex TUI behavior together.

If inline Codex approval or diff flows regress, the first rollback should remove the Windows `--no-alt-screen` launch flag while keeping the frontend wheel fallback. That preserves the option to restore Codex's full-screen TUI before removing the targeted wheel handling.

The alternate-buffer wheel-to-arrow translation is a fallback, not the primary scrolling mechanism. The primary path is to keep Windows Codex in the normal buffer so Nezha's Host Scrollback owns wheel scrolling.

When the terminal is in the normal buffer, wheel events should scroll Host Scrollback only and should not also be forwarded to Codex. Forwarding is reserved for the alternate-buffer fallback, where the wheel is translated into arrow-key input for the Hosted Agent TUI.

The frontend fallback should receive the task's agent explicitly through the Agent Task Terminal call chain. It should not infer Codex behavior from task IDs, session metadata, terminal output, or platform state alone.

The Codex launch flag should be guarded by the Rust Windows compilation target. Frontend wheel handling still uses runtime platform detection because it executes inside the WebView.

This exception should be removed only after Windows end-to-end testing shows that Codex full-screen wheel scrolling, approval, and diff flows are all stable and better than the inline Host Scrollback behavior. Upstream improvements alone are not enough to remove the guard.
