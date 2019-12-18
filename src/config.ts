import { Filter } from "@code-engine/types";
import { PathLike, Stats } from "fs";

/**
 * Configuration for the fileystem source plugin.
 */
export interface FileSystemConfig {
  /**
   * The relative or absolute filesystem path to read. Can be any of the following:
   *
   *  - A file path
   *  - A directory path
   *  - A glob pattern
   *
   */
  path: string;

  /**
   * Determines the depth of sub-directories that will be read. Can be any of the following:
   *
   *  - A number that indicates the depth of sub-directories to crawl
   *  - `Infinity` or `true` to crawl all sub-directories
   *  - Zero or `false` to only read the top-level directory contents
   *
   * Defaults to `true`.
   */
  deep?: boolean | number;

  /**
   * Glob patterns, regular expressions, or filter functions that limit which files are read.
   *
   * Defaults to all files - including subdirectories and thier files
   */
  filter?: Filter;

  /**
   * Custom filesystem functions to call instead of Node's `fs` API.
   *
   * @see https://nodejs.org/api/fs.html
   */
  fs?: Partial<FS>;
}

/**
 * Custom filesystem functions to call instead of Node's `fs` API.
 *
 * @see https://nodejs.org/api/fs.html
 */
export interface FS {
  /**
   * Returns filesystem information about a directory entry.
   */
  stat(path: string, callback: Callback<Stats>): void;

  /**
   * Returns filesystem information about a symlink.
   */
  lstat(path: string, callback: Callback<Stats>): void;

  /**
   * Returns the names of files in a directory.
   */
  readdir(path: string, callback: Callback<string[]>): void;

  /**
   * Reads the entire contents of a file.
   */
  readFile(path: PathLike, callback: Callback<Buffer>): void;
}

/**
 * An error-first callback function.
 */
export declare type Callback<T> = (err: Error | null, result: T) => void;
