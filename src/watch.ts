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

  public get iterable() {
    return this.output.iterable;
  }

  public constructor(path: DirPathInfo | FilePathInfo, config: NormalizedConfig, context: Context) {
    this.chokidar = createChokidar(path, config);
    this.output = new IterableWriter<ChangedFile>();
    this.config = config;
    this.context = context;
    this.dir = path.dir;

    this.chokidar.on("add", this.newFile.bind(this));
    this.chokidar.on("change", this.fileChanged.bind(this));
    this.chokidar.on("unlink", this.fileDeleted.bind(this));
    this.chokidar.on("addDir", this.newSubDirectory.bind(this));
    this.chokidar.on("unlinkDir", this.subDirectoryDeleted.bind(this));
    this.chokidar.on("error", this.error.bind(this));
  }

  /**
   * Disposes the watcher. It cannot be used after this.
   */
  public async dispose() {
    await Promise.all([
      this.chokidar.close(),
      this.output.end(),
    ]);
  }

  /**
   * A new file was created in the directory path.
   */
  private async newFile(path: string, stats: Stats) {
    let file = createChangedFile(path, stats, FileChange.Created);

    if (this.config.filter(file, this.context)) {
      file.contents = await this.config.fs.promises.readFile(join(this.dir, path));
      await this.output.write(file);
    }
  }

  /**
   * A file in the directory path was modified.
   */
  private async fileChanged(path: string, stats: Stats) {
    return;
  }

  /**
   * A file in the directory path was deleted.
   */
  private async fileDeleted(path: string, stats: Stats) {
    return;
  }

  /**
   * A new sub-directory has been created in the directory path.
   */
  private async newSubDirectory(path: string, stats: Stats) {
    return;
  }

  /**
   * A sub-directory in the directory path has beeen deleted.
   */
  private async subDirectoryDeleted(path: string, stats: Stats) {
    return;
  }

  private async error(error: Error) {
    // Re-throw the error into the iterable
    await this.output.throw(error);
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
