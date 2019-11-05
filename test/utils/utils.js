"use strict";

const tmp = require("tmp");
const { join } = require("path");
const { promises: fs } = require("fs");

// Gracefully cleanup temp files
tmp.setGracefulCleanup();

module.exports = {
  /**
   * Returns a promise that resolves after the specified amount of time.
   *
   * @param timeout {number} - The number of milliseconds to delay
   * @param [result] {any} - The promise result
   */
  async delay (timeout, result) {
    await new Promise((resolve) => setTimeout(() => resolve(result), timeout));
  },


  /**
   * Creates a temp directory with the given contents.
   *
   * @param entries {object[]}
   * An array of directory contents. Each entry is an object with the following properties:
   *  - `type`: "dir" or "file". Defaults to "file".
   *  - `path`: The relative path of the entry.
   *  - `contents`: The contents of the file, as a string or buffer
   *
   * @returns {string} - The directory path
   */
  async createDir (entries = []) {
    // Create a temp directory
    let dir = await new Promise((resolve, reject) =>
      tmp.dir({ prefix: "code-engine-", unsafeCleanup: true }, (e, p) => e ? reject(e) : resolve(p)));

    for (let entry of entries) {
      entry = typeof entry === "string" ? { path: entry } : entry;
      let { type, path, contents } = entry;
      path = join(dir, path);

      if (type === "dir") {
        await fs.mkdir(path, { recursive: true });
      }
      else {
        await fs.writeFile(path, contents);
      }
    }

    return dir;
  },
};
