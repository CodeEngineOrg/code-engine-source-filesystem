"use strict";

const CodeEngine = require("@code-engine/lib");

/**
 * Dispose all CodeEngine instances after each test.
 * Otherwise, the process never exits because the worker threads are still running.
 */
afterEach("Dispose all CodeEngine instances", async () => {
  await CodeEngine.disposeAll();
});
