import { Context, File } from "@code-engine/types";
import { Stats as FSStats } from "fs";
import { basename, join, resolve } from "path";
import { readdirIterator, Stats } from "readdir-enhanced";
import { createFile } from "./create-file";
import { NormalizedConfig } from "./normalize-config";

/**
 * Asynchronously reads files from the filesystem and yields the ones that match the configuration critiera.
 */
export function read(config: NormalizedConfig) {
  return async (context: Context) => {
    let path = resolve(context.cwd, config.path);
    let stats = await config.fs.promises.stat(path);

    if (stats.isFile()) {
      return readFile(config, stats, context);
    }
    else {
      return readDir(config, context);
    }
  };
}

/**
 * Reads a single file, if it meets the filter criteria.
 */
async function readFile(config: NormalizedConfig, stats: FSStats, context: Context)
: Promise<File | undefined> {
  let file = createFile(basename(config.path), stats);

  if (config.filter(file, context)) {
    file.contents = await config.fs.promises.readFile(config.path);
    return file;
  }
}

/**
 * Reads all files in the directory that meet the filter criteria
 */
function readDir(config: NormalizedConfig, context: Context): AsyncIterableIterator<File> {
  let dir = config.path;
  let files = find(dir, config, context);

  return {
    [Symbol.asyncIterator]() {
      return this;
    },

    async next() {
      let result = await files.next();
      if (result.done) {
        return { done: true, value: undefined };
      }
      else {
        let stats = result.value;
        let file = createFile(stats.path, stats);
        file.contents = await config.fs.promises.readFile(join(dir, stats.path));
        return { value: file };
      }
    }
  };
}

/**
 * Finds all files in the directory that match the filter criteria
 */
function find(dir: string, config: NormalizedConfig, context: Context) {
  let filter;

  if (typeof config.filterCriteria === "function") {
    let codeEngineFileFilter = config.filterCriteria;

    filter = (stats: Stats) => {
      let file = createFile(stats.path, stats);
      return codeEngineFileFilter(file, context) as boolean;
    };
  }
  else {
    filter = config.filterCriteria;
  }

  return readdirIterator(dir, {
    stats: true,
    deep: config.deep,
    fs: config.fs,
    filter,
  });
}
