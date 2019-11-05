import { Context, File, FilterFunction } from "@code-engine/types";
import { promises as fs } from "fs";
import { resolve } from "path";
import { readdirIterator, Stats } from "readdir-enhanced";
import { createFile } from "./create-file";
import { NormalizedConfig } from "./normalize-config";

/**
 * Asynchronously reads files from the filesystem and yields the ones that match the configuration critiera.
 */
export function read(config: NormalizedConfig) {
  return async function*(context: Context): AsyncGenerator<File> {
    let path = resolve(context.cwd, config.path);
    let stats = await fs.stat(path);

    if (stats.isFile()) {
      // We're reading a file, not a directory
      let file = createFile(path, stats);
      if (config.filter(file, context)) {
        yield file;
      }
    }
    else {
      for await (let stat of find(path, config.filter, context)) {
        let file = createFile(stat.path, stat);
        yield file;
      }
    }
  };
}

/**
 * Find all files in the directory that match the filter criteria
 */
function find(path: string, filter: FilterFunction, context: Context) {
  return readdirIterator(path, {
    stats: true,
    deep: true,
    filter(stat: Stats) {
      let file = createFile(stat.path, stat);
      return filter(file, context);
    },
  });
}
