import { Context } from "@code-engine/types";
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
export async function getPathInfo(config: NormalizedConfig, context: Context): Promise<DirPathInfo | FilePathInfo> {
  let absolutePath = resolve(context.cwd, config.path);
  let stats = await config.fs.promises.stat(absolutePath);
  let dir, filename;

  if (stats.isFile()) {
    dir = dirname(absolutePath);
    filename = basename(absolutePath);
  }
  else {
    dir = dirname(absolutePath);
  }

  return { absolutePath, dir, filename, stats };
}
