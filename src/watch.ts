import { ChangedFile, Context } from "@code-engine/types";
import { NormalizedConfig } from "./normalize-config";

/**
 * Watches the filesystem and yields any changes that are detected.
 */
export function watch(config: NormalizedConfig) {
  return async function*(context: Context): AsyncGenerator<ChangedFile> {
    return;
  };
}
