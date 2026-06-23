import { describe, expect, test } from "vitest";
import {
  formatDroppedPath,
  formatDroppedPaths,
  formatTerminalDroppedPath,
  formatTerminalDroppedPaths,
  readFileTreeDropPaths,
} from "../components/new-task/pathDrop";

describe("path drop helpers", () => {
  test("keeps file tree paths absolute", () => {
    expect(formatDroppedPath("/repo/src/App.tsx", "/repo", "file-tree")).toBe(
      "/repo/src/App.tsx",
    );
  });

  test("keeps external paths absolute", () => {
    expect(formatDroppedPath("/repo/src/App.tsx", "/repo", "external")).toBe("/repo/src/App.tsx");
  });

  test("keeps file tree paths outside the current project absolute", () => {
    expect(formatDroppedPath("/other/file.txt", "/repo", "file-tree")).toBe("/other/file.txt");
  });

  test("quotes paths that need shell-safe spacing", () => {
    expect(formatDroppedPath("/repo/My Documents/file's.txt", "/repo", "external")).toBe(
      "'/repo/My Documents/file'\\''s.txt'",
    );
    expect(formatDroppedPath("/repo/My Documents/file.txt", "/repo", "file-tree")).toBe(
      "'/repo/My Documents/file.txt'",
    );
  });

  test("joins multiple paths with spaces", () => {
    expect(
      formatDroppedPaths(["/repo/src/App.tsx", "/repo/package.json"], "/repo", "file-tree"),
    ).toBe("/repo/src/App.tsx /repo/package.json");
  });

  test("formats file tree paths for terminals as absolute paths", () => {
    expect(formatTerminalDroppedPath("/repo/src/App.tsx", "/repo", "file-tree")).toBe(
      "'/repo/src/App.tsx'",
    );
  });

  test("formats external terminal paths as absolute shell-safe paths", () => {
    expect(
      formatTerminalDroppedPaths(
        ["/repo/My Documents/file.txt", "/tmp/data.json"],
        "/repo",
        "external",
      ),
    ).toBe("'/repo/My Documents/file.txt' '/tmp/data.json'");
  });

  test("quotes POSIX terminal paths containing shell metacharacters", () => {
    expect(
      formatTerminalDroppedPaths(
        ["/repo/src/app/[id]/page.tsx", "/repo/foo&bar.txt", "/repo/a(b).txt"],
        "/repo",
        "file-tree",
      ),
    ).toBe("'/repo/src/app/[id]/page.tsx' '/repo/foo&bar.txt' '/repo/a(b).txt'");
  });

  test("formats Windows terminal paths with Windows-compatible quoting", () => {
    expect(
      formatTerminalDroppedPath("C:\\tmp\\Bob's file.txt", "C:\\repo", "external", "windows"),
    ).toBe("\"C:\\tmp\\Bob's file.txt\"");
    expect(formatTerminalDroppedPath("C:\\tmp\\plain.txt", "C:\\repo", "external", "windows")).toBe(
      "C:\\tmp\\plain.txt",
    );
  });

  test("ignores drops without the file tree MIME payload", () => {
    const transfer = {
      getData: () => "",
    } as unknown as DataTransfer;
    expect(readFileTreeDropPaths(transfer)).toEqual([]);
  });
});
