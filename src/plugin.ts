import { ChangedFile, File, Plugin, Run } from "@code-engine/types";
import { fileURLToPath, pathToFileURL } from "url";
import { FileSystemConfig } from "./config";
import { DirPathInfo, FilePathInfo, getPathInfo } from "./get-path-info";
import { normalizeConfig } from "./normalize-config";
import { readDir, readFile } from "./read";
import { Watcher } from "./watcher";

/**
 * A CodeEngine plugin that reads files from the filesystem.
 */
export function filesystem(options?: FileSystemConfig): Plugin {
  let config = normalizeConfig(options);
  let path: DirPathInfo | FilePathInfo;
  let source: string;
  let watcher: Watcher | undefined;

  return {
    name: "Filesystem Source",

    filter: config.filter,

    /**
     * One-time initialization
     */
    async initialize() {
      // Resolve the full source path based on CodeEngine's CWD
      path = await getPathInfo(this.engine, config);

      // The file:// URL of the source path
      source = pathToFileURL(path.absolutePath).href;
    },

    /**
     * Read file(s) from the filesystem
     */
    async read(run: Run) {
      if ("filename" in path) {
        return readFile(path, config, run);
      }
      else {
        return readDir(path, config, run);
      }
    },

    /**
     * Re-read files that were marked as changed by other plugins.
     */
    async processFile(file: File, run: Run) {
      // If the file has no contents, and it has changed, and it's within our source path,
      // then re-read its contents from disk
      if (file.size === 0 && (file as ChangedFile).change && file.source.startsWith(source)) {
        let absolutePath = fileURLToPath(file.source);
        file.contents = await config.fs.promises.readFile(absolutePath);
      }

      return file;
    },

    /**
     * Watches the filesystem and yields any changes that are detected.
     */
    async watch() {
      watcher = watcher || new Watcher(this.engine, path, config);
      return watcher.iterable;
    },


    /**
     * Stops watching the filesystem for changes.
     */
    async dispose() {
      if (watcher) {
        let promise = watcher.dispose();
        watcher = undefined;
        await promise;
      }
    }
  };
}
