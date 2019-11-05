"use strict";

const filesystem = require("../../");
const CodeEngine = require("../utils/code-engine");
const { createDir, globify } = require("../utils/utils");
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

  it("should read nothing if nothing matches the glob pattern", async () => {
    let dir = await createDir([
      "text-file.txt",
      "web-page.html",
      "image.jpg",
    ]);

    let engine = CodeEngine.create();
    await engine.use(filesystem({ path: globify(dir, "*.md") }));

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
      filter: /\.md$/
    }));

    let summary = await engine.build();

    expect(summary.input.fileCount).to.equal(0);
    expect(summary.output.fileCount).to.equal(0);
  });

  it("should throw an error if the path doesn't exist", async () => {
    let engine = CodeEngine.create();
    await engine.use(filesystem({ path: "this/path/does/not/exist" }));

    try {
      await engine.build();
      assert.fail("An error should have been thrown!");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.match(/^An error occurred in Filesystem Source while reading source files/);
      expect(error.message).to.match(/ENOENT: no such file or directory, stat/);
    }
  });

  it("should throw an error if the path portion of a glob pattern doesn't exist", async () => {
    let engine = CodeEngine.create();
    await engine.use(filesystem({ path: "this/path/does/not/exist/**/*.txt" }));

    try {
      await engine.build();
      assert.fail("An error should have been thrown!");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.match(/^An error occurred in Filesystem Source while reading source files/);
      expect(error.message).to.match(/ENOENT: no such file or directory, stat/);
    }
  });

});
