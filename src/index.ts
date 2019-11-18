import { Plugin } from "@code-engine/types";
import { FileSystemConfig } from "./config";
import { normalizeConfig } from "./normalize-config";
import { processFile } from "./process-file";
import { read } from "./read";
import { watch } from "./watch";

/**
 * A CodeEngine plugin that reads files from the filesystem.
 */
function filesystem(conf?: FileSystemConfig): Plugin {
  let config = normalizeConfig(conf);
  let { startWatching, stopWatching } = watch(config);

  return {
    name: "Filesystem Source",
    filter: config.filter,
    read: read(config),
    watch: startWatching,
    dispose: stopWatching,
    processFile: processFile(config),
  };
}

// Named exports
export * from "./config";
export { filesystem };

// Export `filesystem` as the default export
// tslint:disable: no-default-export
export default filesystem;

// CommonJS default export hack
if (typeof module === "object" && typeof module.exports === "object") {
  module.exports = Object.assign(module.exports.default, module.exports);  // tslint:disable-line: no-unsafe-any
}
