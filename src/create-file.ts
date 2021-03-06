import { ChangedFile, ChangedFileInfo, Cloneable, File, FileChange, FileInfo, FileMetadata } from "@code-engine/types";
import { createChangedFile as createCodeEngineChangedFile, createFile as createCodeEngineFile } from "@code-engine/utils";
import { Stats } from "fs";
import { pathToFileURL } from "url";

/**
 * Creates a CodeEngine `File` object from a node `Stats` object.
 * @internal
 */
export function createFile(relativePath: string, absolutePath: string, stats: Stats): File {
  let info = createFileInfo(relativePath, absolutePath, stats);
  return createCodeEngineFile(info);
}

/**
 * Creates a CodeEngine `ChangedFile` object from a node `Stats` object.
 * @internal
 */
export function createChangedFile(relativePath: string, absolutePath: string, stats: Stats | undefined, change: FileChange): ChangedFile {
  let info = createFileInfo(relativePath, absolutePath, stats) as ChangedFileInfo;
  info.change = change;
  return createCodeEngineChangedFile(info);
}

/**
 * Creates a CodeEngine `FileInfo` object from a node `Stats` object.
 * @internal
 */
function createFileInfo(relativePath: string, absolutePath: string, stats?: Stats): FileInfo {
  let info: FileInfo = {
    path: relativePath,
    source: pathToFileURL(absolutePath),
  };

  if (stats) {
    info.createdAt = stats.birthtime;
    info.modifiedAt = stats.mtime;
    info.metadata = createMetadata(stats);
  }

  return info;
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
