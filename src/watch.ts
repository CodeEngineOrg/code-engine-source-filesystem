// tslint:disable: no-promise-as-boolean
import { ChangedFile, Context } from "@code-engine/types";
import { IterableWriter } from "@code-engine/utils";
import * as chokidar from "chokidar";
import { posix } from "path";
import { DirPathInfo, FilePathInfo, getPathInfo } from "./get-path-info";
import { NormalizedConfig } from "./normalize-config";

/**
 * Watches the filesystem and yields any changes that are detected.
 */
export function watch(config: NormalizedConfig) {
  let watcher: chokidar.FSWatcher | undefined;
  let writer: IterableWriter<ChangedFile> | undefined;

  return {
    /**
     * Starts watching the filesystem for changes.
     */
    async startWatching(context: Context) {
      writer = new IterableWriter<ChangedFile>();
      let path = await getPathInfo(config, context);
      watcher = createWatcher(path, config);

      watcher.on("xxxxxx", (file) => writer && writer.write(file));

      // Propagate errors from Chokidar
      watcher.on("error", (error) => writer && writer.throw(error));

      return writer.iterable;
    },


    /**
     * Stops watching the filesystem for changes.
     */
    async stopWatching() {
      let promises = [];

      if (watcher) {
        promises.push(watcher.close());
        watcher = undefined;
      }
      if (writer) {
        promises.push(writer.end());
        writer = undefined;
      }

      await Promise.all(promises);
    }
  };
}

/**
 * Creates a Chokidar filesystem watcher.
 */
function createWatcher(path: DirPathInfo | FilePathInfo, config: NormalizedConfig): chokidar.FSWatcher {
  let whatToWatch, disableGlobbing;

  if (typeof config.filterCriteria === "string") {
    // The filter criteria is a glob pattern, so pass it along to Chokidar.
    whatToWatch = globify(path.dir, config.filterCriteria);
    disableGlobbing = false;
  }
  else {
    whatToWatch = path.dir;
    disableGlobbing = true;
  }

  let watcher = chokidar.watch(whatToWatch, {
    ignoreInitial: true,
    cwd: path.dir,
    disableGlobbing,
    alwaysStat: true,
    depth: config.depth,
  });

  return watcher;
}

/**
 * Combines the specified directory path and glob pattern.
 */
function globify(dir: string, glob: string): string {
  if (process.platform === "win32") {
    dir = dir.replace(/\\/g, "/");
  }

  return posix.join(dir, glob);
}
