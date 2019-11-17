import { Context, File } from "@code-engine/types";
import { join } from "path";
import { readdirIterator, Stats } from "readdir-enhanced";
import { createFile } from "./create-file";
import { DirPathInfo, FilePathInfo, getPathInfo } from "./get-path-info";
import { NormalizedConfig } from "./normalize-config";

/**
 * Asynchronously reads files from the filesystem and yields the ones that match the configuration critiera.
 */
export function read(config: NormalizedConfig) {
  return async (context: Context) => {
    let path = await getPathInfo(config, context);

    if ("filename" in path) {
      return readFile(path, config, context);
    }
    else {
      return readDir(path, config, context);
    }
  };
}

/**
 * Reads a single file, if it meets the filter criteria.
 */
async function readFile(path: FilePathInfo, config: NormalizedConfig, context: Context)
: Promise<File | undefined> {
  let file = createFile(path.filename, path.stats);

  if (config.filter(file, context)) {
    file.contents = await config.fs.promises.readFile(path.absolutePath);
    return file;
  }
}

/**
 * Reads all files in the directory that meet the filter criteria
 */
function readDir(path: DirPathInfo, config: NormalizedConfig, context: Context): AsyncIterable<File> {
  let files = find(path, config, context);

  return {
    [Symbol.asyncIterator]() {
      return { next: readNextFile };
    }
  };

  async function readNextFile(): Promise<IteratorResult<File>> {
    let result = await files.next();

    if (result.done) {
      return { done: true, value: undefined };
    }
    else {
      let stats = result.value;

      if (stats.isFile()) {
        let file = createFile(stats.path, stats);
        file.contents = await config.fs.promises.readFile(join(path.dir, stats.path));
        return { value: file };
      }
      else {
        return readNextFile();
      }
    }
  }
}

/**
 * Finds all files in the directory that match the filter criteria
 */
function find(path: DirPathInfo, config: NormalizedConfig, context: Context) {
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

  return readdirIterator(path.dir, {
    stats: true,
    deep: config.depth,
    fs: config.fs,
    filter,
  });
}
