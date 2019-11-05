import { File, FilterFunction } from "@code-engine/types";
import { validate } from "@code-engine/utils";
import { createFilter } from "file-path-filter";
import * as isGlob from "is-glob";
import { FileSystemConfig } from "./config";

/**
 * Normalized and sanitized configuration.
 * @internal
 */
export interface NormalizedConfig {
  path: string;
  filter: FilterFunction;
}

/**
 * Validates and normalizes the configuration.
 * @internal
 */
export function normalizeConfig(config?: FileSystemConfig): NormalizedConfig {
  config = validate.object(config, "config");
  let path = validate.minLength(config.path, 1, "path");
  let filter: FilterFunction;

  if (config.filter === undefined) {
    // Determine if the path is a glob pattern
    let glob;
    [path, glob] = splitGlob(path);

    if (glob) {
      // Only read files that match the glob pattern
      filter = createFilter({ map }, glob);
    }
    else {
      // Read all files in the path
      filter = () => true;
    }
  }
  else {
    filter = createFilter({ map }, config.filter);
  }

  return { path, filter };
}

/**
 * Splits a glob pattern into a directory and filter
 */
function splitGlob(path: string): [string, string | undefined] {
  // Determine where the glob pattern starts
  let segments = splitPath(path);
  let globSegment = segments.findIndex((segment) => isGlob(segment, { strict: false }));

  if (globSegment === -1) {
    // There is no glob pattern, it's just a path
    return [path, undefined];
  }
  else {
    // Split the directory path from the glob pattern
    return [
      segments.slice(0, globSegment).join("/"),
      segments.slice(globSegment).join("/")
    ];
  }
}

/**
 * Splits a file or directory path into segments.
 *
 * @example
 *  "./path/to/a/file" => ["path", "to", "a", "file"]
 */
function splitPath(path: string): string[] {
  return path.split("/").filter((segment) => segment && segment !== ".");
}

/**
 * Returns the path of the given file. Used for file filtering.
 */
function map(file: File): string {
  return file.path;
}
