import { ChangedFile, Context, File, FileProcessor } from "@code-engine/types";
import { resolve } from "path";
import { pathToFileURL, URL } from "url";
import { NormalizedConfig } from "./normalize-config";

/**
 * If another plugin (other than the Filesystem Source plugin) creates filesystem files within this
 * plugin's source path, then this plugin will automatically read the file contents from disk and
 * populate the `file.contents` property. This is mostly intended to allow other plugins' `watch()`
 * methods to trigger change events for this plugin's files.
 *
 * For example, assume that there's another plugin that adds layout support for HTML files. The
 * layout plugin would watch for changes to layout templates (which might be handlebars, nunjucks,
 * etc.), but NOT to the HTML files. Instead, the HTML files are read and watched by the Filesystem
 * Source plugin.  So whenever a layout template changes, the layout plugin will need to trigger
 * change events for the template _as well as_ all HTML files, since they need to be re-built to
 * include the new template changes. But the layout plugin isn't responsible for reading the
 * _contents_ of the HTML files. That's the Filesystem Source plugin's responsibility. And that's
 * what this `processFile()` method does.
 */
export function processFile(config: NormalizedConfig): FileProcessor {
  let source: string | undefined;

  return async (file: File, context: Context): Promise<File> => {
    if (!source) {
      source = pathToFileURL(resolve(context.cwd, config.path)).href;
    }

    if (file.size === 0 && (file as ChangedFile).change && file.source.startsWith(source)) {
      let url = new URL(file.source);
      file.contents = await config.fs.promises.readFile(url);
    }

    return file;
  };
}
