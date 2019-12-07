// tslint:disable: no-promise-as-boolean
import { ChangedFile, Context, FileChange } from "@code-engine/types";
import { IterableWriter } from "@code-engine/utils";
import * as chokidar from "chokidar";
import { Stats } from "fs";
import { join, posix } from "path";
import { createChangedFile } from "./create-file";
import { DirPathInfo, FilePathInfo, getPathInfo } from "./get-path-info";
import { NormalizedConfig } from "./normalize-config";

/**
 * Watches the filesystem and yields any changes that are detected.
 */
export function watch(config: NormalizedConfig) {
  let watcher: Watcher | undefined;

  return {
    /**
     * Starts watching the filesystem for changes.
     */
    async startWatching(context: Context) {
      let path = await getPathInfo(config, context);
      watcher = new Watcher(path, config, context);
      return watcher.iterable;
    },


    /**
     * Stops watching the filesystem for changes.
     */
    async stopWatching() {
      if (watcher) {
        let promise = watcher.dispose();
        watcher = undefined;
        await promise;
      }
    }
  };
}


/**
 * Internal class that wraps the filesystem watch functionality.
 */
class Watcher {
  private chokidar: chokidar.FSWatcher;
  private output: IterableWriter<ChangedFile>;
  private config: NormalizedConfig;
  private context: Context;
  private dir: string;
  private disposed = false;

  public get iterable() {
    return this.output.iterable;
  }

  public constructor(path: DirPathInfo | FilePathInfo, config: NormalizedConfig, context: Context) {
    this.chokidar = createChokidar(path, config);
    this.output = new IterableWriter<ChangedFile>();
    this.config = config;
    this.context = context;
    this.dir = path.dir;

    this.chokidar.on("add", this.changeDetected.bind(this, FileChange.Created));
    this.chokidar.on("change", this.changeDetected.bind(this, FileChange.Modified));
    this.chokidar.on("unlink", this.changeDetected.bind(this, FileChange.Deleted));
    this.chokidar.on("error", this.errorHandler.bind(this));
  }

  /**
   * Disposes the watcher. It cannot be used after this.
   */
  public async dispose() {
    if (!this.disposed) {
      this.disposed = true;

      // Don't await on this promise, since we don't know or care whether
      // the rest of the output stream will be read.
      // tslint:disable-next-line: no-floating-promises
      this.output.end();

      await this.chokidar.close();
    }
  }

  /**
   * A filesystem change was detected within the directory path.
   */
  private async changeDetected(change: FileChange, path: string, stats: Stats) {
    try {
      this.context.log.debug(`Change detected: ${change} ${path}`, { change, dir: this.dir, path });
      let file = createChangedFile(path, stats, change);

      if (this.config.filter(file, this.context)) {
        if (change !== FileChange.Deleted) {
          file.contents = await this.config.fs.promises.readFile(join(this.dir, path));
        }

        await this.output.write(file);
      }
    }
    catch (error) {
      await this.errorHandler(error as Error);
    }
  }

  private async errorHandler(error: Error) {
    if (!this.disposed) {
      // Re-throw the error into the iterable
      await this.output.throw(error);
    }
  }
}


/**
 * Creates a Chokidar filesystem watcher.
 */
function createChokidar(path: DirPathInfo | FilePathInfo, config: NormalizedConfig): chokidar.FSWatcher {
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

  return chokidar.watch(whatToWatch, {
    ignoreInitial: true,
    cwd: path.dir,
    disableGlobbing,
    alwaysStat: true,
    depth: config.depth,
  });
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
