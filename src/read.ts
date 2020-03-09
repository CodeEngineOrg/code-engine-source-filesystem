import { File, Run } from "@code-engine/types";
import { readdirIterator, Stats } from "@jsdevtools/readdir-enhanced";
import { join } from "path";
import { createFile } from "./create-file";
import { DirPathInfo, FilePathInfo } from "./get-path-info";
import { NormalizedConfig } from "./normalize-config";

/**
 * Reads a single file, if it meets the filter criteria.
 */
export async function readFile(path: FilePathInfo, config: NormalizedConfig, run: Run): Promise<File | undefined> {
  let file = createFile(path.filename, path.absolutePath, path.stats);

  if (config.filter(file, run)) {
    file.contents = await config.fs.promises.readFile(path.absolutePath);
    return file;
  }
}

/**
 * Reads files from the filesystem and yields the ones that match the configuration critiera.
 */
export function readDir(path: DirPathInfo, config: NormalizedConfig, run: Run): AsyncIterable<File> {
  let files = find(path, config, run);

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
        let absolutePath = join(path.dir, stats.path);
        let file = createFile(stats.path, absolutePath, stats);
        file.contents = await config.fs.promises.readFile(absolutePath);
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
function find(path: DirPathInfo, config: NormalizedConfig, run: Run) {
  let filter;

  if (typeof config.filterCriteria === "function") {
    let codeEngineFileFilter = config.filterCriteria;

    filter = (stats: Stats) => {
      let absolutePath = join(path.dir, stats.path);
      let file = createFile(stats.path, absolutePath, stats);
      return codeEngineFileFilter(file, run) as boolean;
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
