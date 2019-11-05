import { Filter } from "@code-engine/types";

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
}
