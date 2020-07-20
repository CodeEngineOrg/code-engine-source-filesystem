import { File, Filter, FilterFunction } from "@code-engine/types";
import { assert } from "@jsdevtools/assert";
import { createFilter, filePathFilter } from "@jsdevtools/file-path-filter";
import * as nodeFS from "fs";
import * as isGlob from "is-glob";
import { promisify } from "util";
import { FileSystemConfig, FS } from "./config";

/**
 * Validates and normalizes the configuration.
 * @internal
 */
export function normalizeConfig(config?: FileSystemConfig): NormalizedConfig {
  config = assert.type.object(config, "config");
  let path = assert.string.nonWhitespace(config.path, "path");
  let depth = validateDeep(config.deep);
  let [filter, filterCriteria] = validateFilter(config.filter);
  let fs: FSPromises = nodeFS;

  if (config.filter === undefined) {
    // Determine if the path is a glob pattern
    let glob;
    [path, glob] = splitGlob(path);

    if (glob) {
      // Only read files that match the glob pattern
      filterCriteria = glob;
      filter = filePathFilter(glob);
    }
  }

  if (config.fs) {
    fs = {
      stat: assert.type.function(config.fs.stat, "fs.stat", nodeFS.stat),
      lstat: assert.type.function(config.fs.lstat, "fs.lstat", nodeFS.lstat),
      readdir: assert.type.function(config.fs.readdir, "fs.readdir", nodeFS.readdir),
      readFile: assert.type.function(config.fs.readFile, "fs.readFile", nodeFS.readFile),
      promises: {
        stat: promisify(assert.type.function(config.fs.stat, "fs.stat", nodeFS.stat)),
        readFile: promisify(assert.type.function(config.fs.readFile, "fs.readFile", nodeFS.readFile)),
      }
    };
  }

  return { path, depth, filter, filterCriteria, fs };
}

/**
 * Validates and normalizes the `deep` option.
 */
function validateDeep(deep?: boolean | number): number {
  assert.type.oneOf(deep, [Boolean, Number, undefined], "deep option");

  switch (deep) {
    case true:
    case undefined:
      return Infinity;

    case false:
      return 0;

    default:
      return assert.number.integer.nonNegative(deep, "deep option");
  }
}

/**
 * Validates and normalizes the `filter` option.
 */
function validateFilter(filter?: Filter): [FilterFunction, FilterCriteria] {
  let filterCriteria: FilterCriteria;

  if (filter === undefined) {
    // There is no filter, so allow all files
    filterCriteria = undefined;
    filter = () => true;
  }
  else if (typeof filter === "string" || typeof filter === "boolean" || filter instanceof RegExp) {
    // This is a simple filter, so just return it as-is
    filterCriteria = filter;
    filter = filePathFilter(filterCriteria);
  }
  else {
    // This is a more complicated filter, so wrap it in a filter function that accepts a CodeEngine File object.
    filter = filterCriteria = createFilter({ map }, filter);
  }

  return [filter, filterCriteria];
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

/**
 * Filter criteria to pass to Readdir Enhanced.
 */
export type FilterCriteria = undefined | boolean | string | RegExp | FilterFunction;

/**
 * Normalized and sanitized configuration.
 * @internal
 */
export interface NormalizedConfig {
  path: string;
  depth: number;
  filter: FilterFunction;
  filterCriteria: FilterCriteria;
  fs: FSPromises;
}

/**
 * Promisified wrappers around `fs` functions.
 */
export interface FSPromises extends FS {
  promises: {
    stat(path: string): Promise<nodeFS.Stats>;
    readFile(path: nodeFS.PathLike): Promise<Buffer>;
  };
}
