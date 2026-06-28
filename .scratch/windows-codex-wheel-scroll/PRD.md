Status: ready-for-agent

# PRD: Fix Windows Codex Wheel Scrolling

## Problem Statement

Windows users cannot reliably scroll the Codex Agent Task Terminal with the mouse wheel. When Codex runs its Hosted Agent TUI in alternate-screen mode with mouse reporting enabled, xterm.js captures wheel events and sends them as terminal mouse input instead of scrolling Host Scrollback. On Windows, ConPTY does not reliably pass those mouse wheel escape sequences through to the Codex process, so Codex does not scroll either. The result is a terminal surface that appears frozen to wheel input even though output exists above or below the visible viewport.

Claude tasks on Windows already behave differently and can scroll. The user-visible problem is therefore specific to Windows Codex tasks, not a generic application scrolling issue, CSS overflow issue, or Shell terminal issue.

## Solution

Windows Codex tasks should prioritize reliable Host Scrollback in Nezha's Agent Task Terminal. Codex should launch in normal-buffer mode on Windows so the terminal history belongs to xterm.js and wheel input scrolls the terminal output directly. A targeted frontend wheel fallback should also be attached only for Windows Codex Agent Task Terminals so that xterm mouse reporting cannot swallow normal-buffer scrolling, and so temporary alternate-buffer Codex views can still receive directional scroll intent.

The intended user experience is that a Windows user can run or resume a Codex task, use the mouse wheel over the Agent Task Terminal, and browse output predictably. Claude, Shell terminal, macOS, and Linux behavior should remain unchanged.

## User Stories

1. As a Windows Codex user, I want the mouse wheel to scroll task output, so that I can review earlier Codex output without using keyboard shortcuts.
2. As a Windows Codex user, I want long-running Codex tasks to keep usable terminal history, so that I can inspect output produced before the current viewport.
3. As a Windows Codex user, I want resumed Codex tasks to use the same scroll behavior as newly started tasks, so that scrolling is consistent across task lifecycle paths.
4. As a Windows Codex user, I want wheel scrolling to work even when Codex enables terminal mouse reporting, so that Codex's TUI mode does not make Nezha's terminal feel broken.
5. As a Windows Codex user, I want normal task transcript output to scroll through Host Scrollback, so that scrolling does not depend on ConPTY mouse event forwarding.
6. As a Windows Codex user, I want temporary full-screen Codex views to respond to wheel intent where possible, so that diff or approval views remain navigable.
7. As a Windows Codex user, I want approval prompts to remain usable after the scroll fix, so that fixing scroll does not block task completion.
8. As a Windows Codex user, I want diff review flows to remain usable after the scroll fix, so that I can still inspect proposed changes.
9. As a Windows Codex user, I want the terminal not to double-handle wheel input, so that one wheel gesture does not both scroll Host Scrollback and mutate Codex's internal TUI state.
10. As a Windows Claude user, I want Claude wheel behavior to remain unchanged, so that a Codex-specific fix does not regress an already working agent.
11. As a macOS Codex user, I want Codex's existing terminal behavior to remain unchanged, so that native PTY mouse handling continues to work as before.
12. As a Linux Codex user, I want Codex's existing terminal behavior to remain unchanged, so that the Windows workaround does not affect platforms without the ConPTY failure mode.
13. As a Shell terminal user, I want embedded Shell terminal scrolling to remain unchanged, so that agent-specific behavior does not leak into the general terminal.
14. As a Nezha maintainer, I want the fix guarded by explicit agent and platform conditions, so that future changes can see why it only applies to Windows Codex.
15. As a Nezha maintainer, I want the Codex launch behavior shared by run and resume paths, so that the fix cannot drift between task start modes.
16. As a Nezha maintainer, I want the frontend fallback attached through an explicit agent prop, so that terminal behavior is not inferred from output text, session metadata, or task id patterns.
17. As a Nezha maintainer, I want the normal-buffer wheel path to scroll Host Scrollback only, so that the fix avoids hidden double effects.
18. As a Nezha maintainer, I want the alternate-buffer path treated as a fallback, so that the primary guarantee remains reliable Host Scrollback rather than Codex-specific pager behavior.
19. As a Nezha maintainer, I want a clear rollback path, so that if inline Codex approval or diff UX regresses, the backend launch flag can be removed while keeping the frontend fallback.
20. As a tester, I want clear Windows manual verification steps, so that the behavior can be checked in the actual WebView/xterm/ConPTY/Codex stack.
21. As a tester, I want automated checks for the wiring and guard conditions, so that future refactors do not accidentally enable the workaround for the wrong agent or platform.
22. As a contributor, I want the PRD to use the project's terminal glossary, so that "Host Scrollback" and "Hosted Agent TUI" are not confused during implementation.

## Implementation Decisions

- Respect ADR-0001: Windows Codex tasks prioritize Host Scrollback over preserving Codex's full-screen Hosted Agent TUI behavior.
- Add the Codex no-alternate-screen launch flag only for Windows backend builds. The flag should apply to both task run and task resume because both paths use the Codex command builder.
- Keep macOS and Linux Codex launch behavior unchanged. Their PTY paths can preserve Hosted Agent TUI mouse handling without this workaround.
- Keep Claude launch behavior unchanged. Claude on Windows already has working wheel behavior and should not inherit the Codex workaround.
- Add an explicit agent boundary in the Agent Task Terminal call chain. The running task's agent should flow into the terminal wrapper and from there into the shared terminal helper that attaches any wheel fallback.
- Limit the frontend fallback to Windows Codex Agent Task Terminals. Do not apply it to Shell terminals, Claude terminals, macOS terminals, or Linux terminals.
- Use xterm.js's public custom wheel event hook for the frontend fallback. Avoid relying on DOM-level wheel listeners that compete with xterm internals.
- In the normal buffer, handle wheel input by scrolling Host Scrollback directly and suppressing xterm's default wheel handling. Do not also forward wheel input to Codex.
- In the alternate buffer, treat wheel-to-arrow-key translation as a fallback for temporary full-screen Codex views. This depends on the Hosted Agent TUI interpreting arrow keys as scroll/navigation input and is not the primary scrolling guarantee.
- Do not introduce new task storage fields, project config fields, or user settings for this fix. The behavior is a platform-specific compatibility fix, not a user preference.
- Do not introduce a new state-management mechanism. The existing props flow from running task state to terminal components is sufficient.
- If inline Codex approval or diff flows regress, first remove the Windows no-alternate-screen launch flag while keeping the frontend wheel fallback. Only remove the frontend fallback if the targeted handler itself proves harmful.
- Do not remove the Windows exception merely because upstream Codex, xterm.js, or ConPTY behavior changes. Revisit it only after Windows end-to-end testing shows full-screen Codex wheel scrolling, approval, and diff flows are stable and better than the Host Scrollback behavior.

## Testing Decisions

- Test external behavior and guard conditions, not implementation internals. The tests should prove which observable inputs cause the workaround to attach and what terminal-facing actions it performs.
- Preferred frontend test seam: the shared terminal helper that attaches the wheel fallback. This seam can be exercised with a mocked xterm terminal object and synthetic wheel events without mounting the full app.
- Frontend tests should cover that the fallback is enabled only for Windows Codex Agent Task Terminals and disabled for Claude, non-Windows platforms, and non-agent terminal usage.
- Frontend tests should cover normal-buffer wheel behavior: wheel-up and wheel-down call Host Scrollback scrolling and suppress xterm default handling.
- Frontend tests should cover alternate-buffer wheel behavior: wheel-up and wheel-down send arrow-key input to the Hosted Agent TUI path and suppress xterm default handling.
- Frontend tests should cover cleanup/disposal so a terminal unmount does not leave stale wheel handlers.
- Preferred backend test seam: the Codex command builder or the smallest command-construction seam available. The test should verify that Windows Codex includes the no-alternate-screen flag and non-Windows builds do not.
- Backend verification should ensure run and resume both use the shared Codex command-building behavior.
- Prior frontend test art exists in the terminal helper tests and platform-specific shortcut tests. Follow the same style: small Vitest unit tests around pure helpers or minimal mocked objects.
- Prior backend test art exists as Rust unit tests inside backend modules. If command construction is not currently testable, expose the smallest testable helper rather than testing through a full Tauri command.
- Static verification should include TypeScript type checking, ESLint with zero warnings, Vitest, and Cargo check.
- Manual verification is required on Windows because the bug depends on WebView, xterm.js, ConPTY, and Codex TUI behavior together. Run the Tauri app on Windows, start a Codex task that produces more output than fits in the viewport, confirm mouse wheel scrolling works, resume a Codex task and confirm the same behavior, inspect a Codex approval or diff flow, and confirm Claude and Shell terminal scrolling still behave normally.

## Out of Scope

- Reworking xterm.js terminal architecture beyond the targeted Windows Codex fallback.
- Changing Shell terminal scrolling behavior.
- Changing Claude mouse or scroll behavior.
- Adding a user-facing setting for alternate-screen behavior.
- Modifying task persistence schema or project configuration schema.
- Fixing unrelated frontend performance debt such as task persistence debouncing, SessionView virtualization, or large markdown rendering.
- Guaranteeing automated end-to-end proof of Windows ConPTY wheel behavior in CI.
- Pushing code to a remote repository.

## Further Notes

- The current local branch is `fix/windows-wheel-scroll`.
- The user's Windows-side summary reported successful static verification with type checking, Cargo check, ESLint, and Vitest, but the local branch currently only contains documentation from this planning session.
- The implementation should preserve the terminology in `CONTEXT.md`: Agent Task Terminal, Hosted Agent TUI, and Host Scrollback.
- The key accepted trade-off is reliability over full-screen Codex presentation on Windows. This is documented in ADR-0001.
