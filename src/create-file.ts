import { Cloneable, File, FileMetadata } from "@code-engine/types";
import { createFile as createCodeEngineFile } from "@code-engine/utils";
import { Stats } from "fs";
import { URL } from "url";

/**
 * Creates a CodeEngine `FileInfo` object from a node `Stats` object.
 * @internal
 */
export function createFile(path: string, stats: Stats): File {
  return createCodeEngineFile({
    path,
    source: createFileUrl(path),
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    metadata: createMetadata(stats),
  });
}

/**
 * Creates a `file://` URL.
 * @internal
 */
export function createFileUrl(path: string): string {
  if (process.platform === "win32") {
    // Convert Windows path separators to URL separators,
    // otherwsie they'll get converted to %5C by encodeURI()
    path = path.replace(/\\/g, "/");
  }

  path = encodeURI(path);
  let url = new URL(`file://${path}`);
  return url.href;
}

/**
 * Copies all properties (except methods) of the `Stats` object.
 */
function createMetadata(stats: Stats): FileMetadata {
  let metadata: FileMetadata = {};

  for (let [key, value] of Object.entries(stats)) {
    if (typeof value !== "function") {
      metadata[key] = value as Cloneable;
    }
  }

  return metadata;
}
