import { ChangedFile, CodeEngine, FileChange } from "@code-engine/types";
import { IterableWriter } from "@code-engine/utils";
import * as chokidar from "chokidar";
import { Stats } from "fs";
import { join, posix } from "path";
import { createChangedFile } from "./create-file";
import { DirPathInfo, FilePathInfo } from "./get-path-info";
import { NormalizedConfig } from "./normalize-config";

/**
 * Internal class that wraps the filesystem watch functionality.
 */
export class Watcher {
  private chokidar: chokidar.FSWatcher;
  private output: IterableWriter<ChangedFile>;
  private config: NormalizedConfig;
  private engine: CodeEngine;
  private dir: string;
  private disposed = false;

  public get iterable() {
    return this.output.iterable;
  }

  public constructor(engine: CodeEngine, path: DirPathInfo | FilePathInfo, config: NormalizedConfig) {
    this.chokidar = createChokidar(path, config);
    this.output = new IterableWriter<ChangedFile>();
    this.config = config;
    this.dir = path.dir;
    this.engine = engine;

    this.chokidar.on("add", this.changeDetected.bind(this, FileChange.Created));          // eslint-disable-line @typescript-eslint/no-misused-promises
    this.chokidar.on("change", this.changeDetected.bind(this, FileChange.Modified));      // eslint-disable-line @typescript-eslint/no-misused-promises
    this.chokidar.on("unlink", this.changeDetected.bind(this, FileChange.Deleted));       // eslint-disable-line @typescript-eslint/no-misused-promises
    this.chokidar.on("error", this.errorHandler.bind(this));                              // eslint-disable-line @typescript-eslint/no-misused-promises
  }

  /**
   * Disposes the watcher. It cannot be used after this.
   */
  public async dispose() {
    if (!this.disposed) {
      this.disposed = true;

      // Don't await on this promise, since we don't know or care whether
      // the rest of the output stream will be read.
      this.output.end();  // eslint-disable-line @typescript-eslint/no-floating-promises

      await this.chokidar.close();
    }
  }

  /**
   * A filesystem change was detected within the directory path.
   */
  private async changeDetected(change: FileChange, path: string, stats: Stats) {
    try {
      this.engine.log.debug(`Change detected: ${change} ${path}`, { change, dir: this.dir, path });
      let absolutePath = join(this.dir, path);
      let file = createChangedFile(path, absolutePath, stats, change);

      if (this.config.filter(file, this.engine)) {
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
