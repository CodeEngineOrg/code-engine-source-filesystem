import { Context, File, FileProcessor } from "@code-engine/types";
import { URL } from "url";
import { createFileUrl } from "./create-file";
import { NormalizedConfig } from "./normalize-config";

/**
 * Populates the contents of filesystem files, regardless of whether they were created by this plugin's
 * `read()` or `watch()` methods, or by another plugin.
 */
export function processFile(config: NormalizedConfig): FileProcessor {
  let source = createFileUrl(config.path);

  return async (file: File, context: Context): Promise<File> => {
    if (file.size === 0 && file.source.startsWith(source)) {
      let url = new URL(file.source);
      file.contents = await config.fs.readFile(url);
    }

    return file;
  };
}
