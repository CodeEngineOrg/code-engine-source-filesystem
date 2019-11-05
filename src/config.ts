import { Filter } from "@code-engine/types";
import { PathLike, Stats } from "fs";

/**
 * Configuration for the fileystem source plugin.
 */
export interface FileSystemConfig {
  /**
   * The relative or absolute filesystem path to read. Can be any of the following:
   *
   *  - A file or directory path
   *  - A glob pattern
   *  -
   */
  path: string;

  /**
   * Glob patterns, regular expressions, or filter functions that limit which files are read.
   *
   * Defaults to all files - including subdirectories and thier files
   */
  filter?: Filter;

  /**
   * Custom filesystem functions to call instead of Node's `fs.promises` API.
   *
   * @see https://nodejs.org/api/fs.html#fs_fs_promises_api
   */
  fs?: Partial<FS>;
}

/**
 * Custom filesystem functions to call instead of Node's `fs.promises` API.
 *
 * @see https://nodejs.org/api/fs.html#fs_fs_promises_api
 */
export interface FS {
  /**
   * Returns information about a filesystem path.
   */
  stat(path: PathLike): Promise<Stats>;

  /**
   * Reads the entire contents of a file.
   */
  readFile(path: PathLike): Promise<Buffer>;
}
