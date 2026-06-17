import { useCallback, useEffect, useRef, type RefObject } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { DragDropEvent } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { parentPathOf } from "./treeUtils";

interface UseExternalFileDropArgs {
  active: boolean;
  projectPath: string;
  panelRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  onDrop: (sourcePaths: string[], targetDir: string) => void;
  onDropTargetChange: (path: string | null) => void;
}

export function useExternalFileDrop({
  active,
  projectPath,
  panelRef,
  scrollRef,
  onDrop,
  onDropTargetChange,
}: UseExternalFileDropArgs) {
  const lastDropRef = useRef<{ key: string; at: number } | null>(null);

  const resolveDropTarget = useCallback(
    (position: { x: number; y: number }) => {
      const panelEl = panelRef.current;
      const scrollEl = scrollRef.current;
      if (!panelEl || !scrollEl) return null;

      const panelRect = panelEl.getBoundingClientRect();
      const scrollRect = scrollEl.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      const candidates =
        scale === 1
          ? [{ x: position.x, y: position.y }]
          : [
              { x: position.x, y: position.y },
              { x: position.x / scale, y: position.y / scale },
            ];

      for (const point of candidates) {
        if (
          point.x < panelRect.left ||
          point.x > panelRect.right ||
          point.y < panelRect.top ||
          point.y > panelRect.bottom
        ) {
          continue;
        }

        if (
          point.x < scrollRect.left ||
          point.x > scrollRect.right ||
          point.y < scrollRect.top ||
          point.y > scrollRect.bottom
        ) {
          return projectPath;
        }

        const element = document.elementFromPoint(point.x, point.y);
        const row = element?.closest<HTMLElement>("[data-file-tree-path]");
        if (!row || !scrollEl.contains(row)) {
          return projectPath;
        }

        const path = row.dataset.fileTreePath;
        if (!path) return projectPath;
        return row.dataset.fileTreeIsDir === "true" ? path : parentPathOf(path);
      }

      return null;
    },
    [panelRef, projectPath, scrollRef],
  );

  const handleDragDropPayload = useCallback(
    (payload: DragDropEvent) => {
      if (payload.type === "enter" || payload.type === "over") {
        onDropTargetChange(resolveDropTarget(payload.position));
        return;
      }

      if (payload.type === "leave") {
        onDropTargetChange(null);
        return;
      }

      const targetDir = resolveDropTarget(payload.position);
      onDropTargetChange(null);
      if (!targetDir || payload.paths.length === 0) return;

      const key = `${targetDir}\n${payload.paths.join("\n")}`;
      const now = Date.now();
      const lastDrop = lastDropRef.current;
      if (lastDrop && lastDrop.key === key && now - lastDrop.at < 1000) return;
      lastDropRef.current = { key, at: now };

      onDrop(payload.paths, targetDir);
    },
    [onDrop, onDropTargetChange, resolveDropTarget],
  );

  useEffect(() => {
    if (!active) return;

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const addListener = (name: string, listenPromise: Promise<() => void>) => {
      listenPromise
        .then((cleanup) => {
          if (disposed) {
            cleanup();
          } else {
            unlisteners.push(cleanup);
          }
        })
        .catch((error) => {
          console.error(`Failed to listen for ${name} file drops`, error);
        });
    };

    addListener(
      "webview",
      getCurrentWebview().onDragDropEvent((event) => handleDragDropPayload(event.payload)),
    );
    addListener(
      "window",
      getCurrentWindow().onDragDropEvent((event) => handleDragDropPayload(event.payload)),
    );

    return () => {
      disposed = true;
      onDropTargetChange(null);
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, [active, handleDragDropPayload, onDropTargetChange]);
}
