"use strict";

const filesystem = require("../../");
const CodeEngine = require("../utils/code-engine");
const { delay, createDir } = require("../utils/utils");
const { assert, expect } = require("chai");

describe.only("filesystem.read()", () => {

  it("should read nothing if the directory is empty", async () => {
    let dir = await createDir();
    let engine = CodeEngine.create();
    await engine.use(filesystem({ path: dir }));

    let summary = await engine.build();

    expect(summary.input.fileCount).to.equal(0);
    expect(summary.output.fileCount).to.equal(0);
  });

  it("should read nothing if nothing matches the filter criteria", async () => {
    let dir = await createDir([
      "text-file.txt",
      "web-page.html",
      "image.jpg",
    ]);

    let engine = CodeEngine.create();
    await engine.use(filesystem({
      path: dir,
      filter: "*.md"
    }));

    let summary = await engine.build();

    expect(summary.input.fileCount).to.equal(0);
    expect(summary.output.fileCount).to.equal(0);
  });

});
