import type { AppPlatform } from "../../platform";

export const NEZHA_FILE_PATHS_MIME = "application/x-nezha-file-paths";
export const FILE_TREE_POINTER_DRAG_EVENT = "nezha:file-tree-pointer-drag";

type DropPathSource = "external" | "file-tree";
export interface FileTreePointerDragDetail {
  type: "start" | "move" | "drop" | "cancel";
  paths: string[];
  x: number;
  y: number;
}

export function dispatchFileTreePointerDrag(detail: FileTreePointerDragDetail) {
  window.dispatchEvent(new CustomEvent<FileTreePointerDragDetail>(FILE_TREE_POINTER_DRAG_EVENT, {
    detail,
  }));
}

function quotePosixPathIfNeededForPrompt(path: string): string {
  if (!/[\s'"$`\\]/.test(path)) return path;
  return `'${path.replace(/'/g, "'\\''")}'`;
}

function quotePosixShellPath(path: string): string {
  return `'${path.replace(/'/g, "'\\''")}'`;
}

function quoteWindowsPathIfNeeded(path: string): string {
  if (!/[\s'"&(){}[\]^=;!,`~]/.test(path)) return path;
  return `"${path.replace(/"/g, '""')}"`;
}

export function formatDroppedPath(path: string, _projectPath: string, _source: DropPathSource): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return quotePosixPathIfNeededForPrompt(trimmed);
}

export function formatDroppedPaths(
  paths: string[],
  projectPath: string,
  source: DropPathSource,
): string {
  return paths
    .map((path) => formatDroppedPath(path, projectPath, source))
    .filter(Boolean)
    .join(" ");
}

export function formatTerminalDroppedPath(
  path: string,
  _projectPath: string,
  _source: DropPathSource,
  platform: AppPlatform = "other",
): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return platform === "windows" ? quoteWindowsPathIfNeeded(trimmed) : quotePosixShellPath(trimmed);
}

export function formatTerminalDroppedPaths(
  paths: string[],
  projectPath: string,
  source: DropPathSource,
  platform: AppPlatform = "other",
): string {
  return paths
    .map((path) => formatTerminalDroppedPath(path, projectPath, source, platform))
    .filter(Boolean)
    .join(" ");
}

export function readFileTreeDropPaths(dataTransfer: DataTransfer): string[] {
  const raw = dataTransfer.getData(NEZHA_FILE_PATHS_MIME);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
