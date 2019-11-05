import { File, FilterFunction } from "@code-engine/types";
import { validate } from "@code-engine/utils";
import { createFilter } from "file-path-filter";
import { promises as fsPromises } from "fs";
import * as isGlob from "is-glob";
import { FileSystemConfig, FS } from "./config";

/**
 * Normalized and sanitized configuration.
 * @internal
 */
export interface NormalizedConfig {
  path: string;
  filter: FilterFunction;
  fs: FS;
}

/**
 * Validates and normalizes the configuration.
 * @internal
 */
export function normalizeConfig(config?: FileSystemConfig): NormalizedConfig {
  config = validate.object(config, "config");
  let path = validate.minLength(config.path, 1, "path");
  let filter: FilterFunction;
  let fs: FS = fsPromises;

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

  if (config.fs) {
    fs = {
      stat: validate.function(config.fs.stat, "fs.stat", fsPromises.stat),
      readFile: validate.function(config.fs.readFile, "fs.readFile", fsPromises.readFile),
    };
  }

  return { path, filter, fs };
}

/**
 * Splits a glob pattern into a directory and filter
 */
function splitGlob(path: string): [string, string | undefined] {
  // Determine where the glob pattern starts
  let segments = path.split("/");
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
 * Returns the path of the given file. Used for file filtering.
 */
function map(file: File): string {
  return file.path;
}
