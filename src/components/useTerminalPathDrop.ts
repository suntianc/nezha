import { useCallback, useEffect, useRef, type RefObject } from "react";
import { getCurrentWebview, type DragDropEvent } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  FILE_TREE_POINTER_DRAG_EVENT,
  formatTerminalDroppedPaths,
  readFileTreeDropPaths,
  type FileTreePointerDragDetail,
} from "./new-task/pathDrop";
import { APP_PLATFORM } from "../platform";

export function useTerminalPathDrop({
  containerRef,
  projectPath,
  isActive,
  onInsertText,
}: {
  containerRef: RefObject<HTMLElement | null>;
  projectPath: string;
  isActive: boolean;
  onInsertText: (text: string) => void;
}) {
  const lastExternalDropRef = useRef<{ key: string; at: number } | null>(null);

  const toCssPoint = useCallback(
    (position: { x: number; y: number }, source: "css" | "physical") => {
      if (source === "css") return position;
      const scale = window.devicePixelRatio || 1;
      return {
        x: position.x / scale,
        y: position.y / scale,
      };
    },
    [],
  );

  const isDropInsideContainer = useCallback(
    (position: { x: number; y: number }) => {
      const container = containerRef.current;
      if (!container) return false;

      const rect = container.getBoundingClientRect();
      if (
        position.x < rect.left ||
        position.x > rect.right ||
        position.y < rect.top ||
        position.y > rect.bottom
      ) {
        return false;
      }

      const element = document.elementFromPoint(position.x, position.y);
      if (element && !container.contains(element)) return false;
      return true;
    },
    [containerRef],
  );

  const sendDroppedPaths = useCallback(
    (paths: string[], source: "external" | "file-tree") => {
      const text = formatTerminalDroppedPaths(paths, projectPath, source, APP_PLATFORM);
      if (!text) return;
      onInsertText(`${text} `);
    },
    [onInsertText, projectPath],
  );

  useEffect(() => {
    if (!isActive) return;

    function handleFileTreePointerDrag(event: Event) {
      const { detail } = event as CustomEvent<FileTreePointerDragDetail>;
      if (
        detail.type !== "drop" ||
        detail.paths.length === 0 ||
        !isDropInsideContainer(toCssPoint({ x: detail.x, y: detail.y }, "css"))
      ) {
        return;
      }
      sendDroppedPaths(detail.paths, "file-tree");
    }

    function handleWindowDragOver(event: DragEvent) {
      if (!event.dataTransfer) return;
      const paths = readFileTreeDropPaths(event.dataTransfer);
      if (
        paths.length === 0 ||
        !isDropInsideContainer(toCssPoint({ x: event.clientX, y: event.clientY }, "css"))
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    }

    function handleWindowDrop(event: DragEvent) {
      if (!event.dataTransfer) return;
      const paths = readFileTreeDropPaths(event.dataTransfer);
      if (
        paths.length === 0 ||
        !isDropInsideContainer(toCssPoint({ x: event.clientX, y: event.clientY }, "css"))
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      sendDroppedPaths(paths, "file-tree");
    }

    window.addEventListener(FILE_TREE_POINTER_DRAG_EVENT, handleFileTreePointerDrag);
    window.addEventListener("dragover", handleWindowDragOver, true);
    window.addEventListener("drop", handleWindowDrop, true);
    return () => {
      window.removeEventListener(FILE_TREE_POINTER_DRAG_EVENT, handleFileTreePointerDrag);
      window.removeEventListener("dragover", handleWindowDragOver, true);
      window.removeEventListener("drop", handleWindowDrop, true);
    };
  }, [isActive, isDropInsideContainer, sendDroppedPaths, toCssPoint]);

  useEffect(() => {
    if (!isActive) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;

    function handleDragDropPayload(payload: DragDropEvent) {
      if (payload.type === "leave") return;
      const inside = isDropInsideContainer(toCssPoint(payload.position, "physical"));
      if (payload.type === "enter" || payload.type === "over") return;
      if (!inside || payload.paths.length === 0) return;

      const key = payload.paths.join("\n");
      const now = Date.now();
      const lastDrop = lastExternalDropRef.current;
      if (lastDrop && lastDrop.key === key && now - lastDrop.at < 750) return;
      lastExternalDropRef.current = { key, at: now };
      sendDroppedPaths(payload.paths, "external");
    }

    const addListener = (listenPromise: Promise<() => void>) => {
      listenPromise
        .then((cleanup) => {
          if (disposed) {
            cleanup();
          } else if (unlisten) {
            const previous = unlisten;
            unlisten = () => {
              previous();
              cleanup();
            };
          } else {
            unlisten = cleanup;
          }
        })
        .catch(console.error);
    };

    const handler = (event: { payload: DragDropEvent }) => {
      if (!disposed) handleDragDropPayload(event.payload);
    };
    addListener(getCurrentWebview().onDragDropEvent(handler));
    addListener(getCurrentWindow().onDragDropEvent(handler));

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [isActive, isDropInsideContainer, sendDroppedPaths, toCssPoint]);
}
