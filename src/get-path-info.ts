import { CodeEngine } from "@code-engine/types";
import { Stats } from "fs";
import { basename, dirname, resolve } from "path";
import { NormalizedConfig } from "./normalize-config";

/**
 * Information about a file or directory path.
 */
export interface PathInfo {
  absolutePath: string;
  stats: Stats;
}

/**
 * Information about a directory path.
 */
export interface DirPathInfo extends PathInfo {
  dir: string;
}

/**
 * Information about a file path.
 */
export interface FilePathInfo extends PathInfo {
  dir: string;
  filename: string;
}

/**
 * Returns detailed information about the config path.
 */
export async function getPathInfo(engine: CodeEngine, config: NormalizedConfig): Promise<DirPathInfo | FilePathInfo> {
  let absolutePath = resolve(engine.cwd, config.path);
  let stats = await config.fs.promises.stat(absolutePath);

  if (stats.isFile()) {
    return {
      stats,
      absolutePath,
      dir: dirname(absolutePath),
      filename: basename(absolutePath),
    };
  }
  else {
    return {
      stats,
      absolutePath,
      dir: absolutePath,
    };
  }
}
