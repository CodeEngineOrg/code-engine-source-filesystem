"use strict";

const filesystem = require("../../");
const { createFileUrl } = require("../../lib/create-file");
const CodeEngine = require("../utils/code-engine");
const sinon = require("sinon");
const { createDir, delay, globify, getFiles } = require("../utils");
const { expect } = require("chai");
const { join } = require("path");

describe("filesystem.processFile()", () => {

  function createFileChangePlugin (changes) {
    return {
      watch () {
        return {
          async next () {
            let value = changes.shift();
            if (value) {
              return { value };
            }
            else {
              return { done: true };
            }
          }
        };
      },
    };
  }

  it("should only read files that have no contents", async () => {
    let dir = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: dir,
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: createFileUrl(join(dir, "file1.txt")), path: "file1.txt" },
      { change: "modified", source: createFileUrl(join(dir, "file2.txt")), path: "file2.txt", text: "I already have contents" },
      { change: "modified", source: createFileUrl(join(dir, "file3.txt")), path: "file3.txt", text: "" },
    ]);

    let spy = sinon.spy();
    let engine = CodeEngine.create();
    await engine.use(source, fileChanges, spy);
    engine.watch();

    // Allow time for all the file changes to be procesed
    await delay(100);

    // fs.readFile() should have only been called for the empty files
    sinon.assert.calledTwice(readFile);
    expect(readFile.firstCall.args[0].href).to.match(/\/file1.txt$/);
    expect(readFile.secondCall.args[0].href).to.match(/\/file3.txt$/);

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file2.txt")).to.have.property("text", "I already have contents");
    expect(files.find((file) => file.name === "file3.txt")).to.have.property("text", "Some contents");
  });

  it("should only read files that match the path", async () => {
    let dir = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: dir,
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: createFileUrl(join(dir, "..", "file1.txt")), path: "file1.txt" },
      { change: "modified", source: createFileUrl(join(dir, "file2.txt")), path: "file2.txt" },
      { change: "modified", source: "file://some/other/path", path: "file3.txt" },
    ]);

    let spy = sinon.spy();
    let engine = CodeEngine.create();
    await engine.use(source, fileChanges, spy);
    engine.watch();

    // Allow time for all the file changes to be procesed
    await delay(100);

    // fs.readFile() should have only been called for the file that's in our path
    sinon.assert.calledOnce(readFile);
    expect(readFile.firstCall.args[0].href).to.match(/\/file2.txt$/);

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
    expect(files.find((file) => file.name === "file2.txt")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file3.txt")).to.have.property("text", "");
  });

  it("should only read files that match the glob pattern", async () => {
    let dir = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: globify(dir, "**/*.html"),
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: createFileUrl(join(dir, "file1.txt")), path: "file1.txt" },
      { change: "modified", source: createFileUrl(join(dir, "file2.html")), path: "file2.html" },
      { change: "modified", source: createFileUrl(join(dir, "file3.jpg")), path: "file3.jpg" },
    ]);

    let spy = sinon.spy();
    let engine = CodeEngine.create();
    await engine.use(source, fileChanges, spy);
    engine.watch();

    // Allow time for all the file changes to be procesed
    await delay(100);

    // fs.readFile() should have only been called for the HTML file
    sinon.assert.calledOnce(readFile);
    expect(readFile.firstCall.args[0].href).to.match(/\/file2.html$/);

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
    expect(files.find((file) => file.name === "file2.html")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file3.jpg")).to.have.property("text", "");
  });

  it("should only read files that match the filter criteria", async () => {
    let dir = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: dir,
      filter (file) {
        return [".html", ".jpg"].includes(file.extension);
      },
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: createFileUrl(join(dir, "file1.txt")), path: "file1.txt" },
      { change: "modified", source: createFileUrl(join(dir, "file2.html")), path: "file2.html" },
      { change: "modified", source: createFileUrl(join(dir, "file3.jpg")), path: "file3.jpg" },
    ]);

    let spy = sinon.spy();
    let engine = CodeEngine.create();
    await engine.use(source, fileChanges, spy);
    engine.watch();

    // Allow time for all the file changes to be procesed
    await delay(100);

    // fs.readFile() should have only been called for the HTML and JPG files
    sinon.assert.calledTwice(readFile);
    expect(readFile.firstCall.args[0].href).to.match(/\/file2.html$/);
    expect(readFile.secondCall.args[0].href).to.match(/\/file3.jpg$/);

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
    expect(files.find((file) => file.name === "file2.html")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file3.jpg")).to.have.property("text", "Some contents");
  });

});
