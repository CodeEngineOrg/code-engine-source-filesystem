"use strict";

/** @typedef { import("sinon").SinonSpy } SinonSpy */
/** @typedef { import("sinon").SinonSpyCall } SinonSpyCall */

const tmp = require("tmp");
const { dirname, join, posix } = require("path");
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
   * Combines the specified path and glob pattern.
   */
  globify (path, glob) {
    if (process.platform === "win32") {
      path = path.replace(/\\/g, "/");
    }
    return posix.join(path, glob);
  },


  /**
   * Returns the file from each `processFile()` call.
   *
   * @param spy {SinonSpy} - A Sinon Spy for the `processFile()` method
   * @returns {Array}
   */
  getFiles (spy) {
    return spy.getCalls().map((call) => call.args[0]);
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
      contents = contents || Buffer.alloc(0);

      if (type === "dir") {
        await fs.mkdir(path, { recursive: true });
      }
      else {
        await fs.mkdir(dirname(path), { recursive: true });
        await fs.writeFile(path, contents);
      }
    }

    return dir;
  },
};
