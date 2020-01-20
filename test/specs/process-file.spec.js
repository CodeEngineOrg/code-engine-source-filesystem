"use strict";

const filesystem = require("../../");
const { pathToFileURL } = require("url");
const { CodeEngine } = require("@code-engine/lib");
const sinon = require("sinon");
const { createDir, delay, getFiles } = require("../utils");
const { expect } = require("chai");
const { join } = require("path");

// CI environments are slow, so use a larger time buffer
const TIME_BUFFER = process.env.CI ? 100 : 50;
const WATCH_DELAY = process.env.CI ? 300 : 100;

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
    let cwd = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: ".",
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: pathToFileURL(join(cwd, "file1.txt")), path: "file1.txt" },
      { change: "modified", source: pathToFileURL(join(cwd, "file2.txt")), path: "file2.txt", text: "I already have contents" },
      { change: "modified", source: pathToFileURL(join(cwd, "file3.txt")), path: "file3.txt", text: "" },
    ]);

    let spy = sinon.spy();
    let engine = new CodeEngine({ cwd });
    await engine.use(source, fileChanges, spy);
    engine.watch(WATCH_DELAY);

    // Allow time for all the file changes to be procesed
    await delay(WATCH_DELAY + TIME_BUFFER);

    // fs.readFile() should have only been called for the empty files
    sinon.assert.calledTwice(readFile);
    expect(readFile.firstCall.args[0]).to.equal(join(cwd, "file1.txt"));
    expect(readFile.secondCall.args[0]).to.equal(join(cwd, "file3.txt"));

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file2.txt")).to.have.property("text", "I already have contents");
    expect(files.find((file) => file.name === "file3.txt")).to.have.property("text", "Some contents");
  });

  it("should only read files that match the path", async () => {
    let cwd = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: ".",
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: pathToFileURL(join(cwd, "..", "file1.txt")), path: "file1.txt" },
      { change: "modified", source: pathToFileURL(join(cwd, "file2.txt")), path: "file2.txt" },
      { change: "modified", source: "file://some/other/path", path: "file3.txt" },
    ]);

    let spy = sinon.spy();
    let engine = new CodeEngine({ cwd });
    await engine.use(source, fileChanges, spy);
    engine.watch(WATCH_DELAY);

    // Allow time for all the file changes to be procesed
    await delay(WATCH_DELAY + TIME_BUFFER);

    // fs.readFile() should have only been called for the file that's in our path
    sinon.assert.calledOnce(readFile);
    expect(readFile.firstCall.args[0]).to.equal(join(cwd, "file2.txt"));

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
    expect(files.find((file) => file.name === "file2.txt")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file3.txt")).to.have.property("text", "");
  });

  it("should only read files that match the glob pattern", async () => {
    let cwd = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: "**/*.html",
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: pathToFileURL(join(cwd, "file1.txt")), path: "file1.txt" },
      { change: "modified", source: pathToFileURL(join(cwd, "file2.html")), path: "file2.html" },
      { change: "modified", source: pathToFileURL(join(cwd, "file3.jpg")), path: "file3.jpg" },
    ]);

    let spy = sinon.spy();
    let engine = new CodeEngine({ cwd });
    await engine.use(source, fileChanges, spy);
    engine.watch(WATCH_DELAY);

    // Allow time for all the file changes to be procesed
    await delay(WATCH_DELAY + TIME_BUFFER);

    // fs.readFile() should have only been called for the HTML file
    sinon.assert.calledOnce(readFile);
    expect(readFile.firstCall.args[0]).to.equal(join(cwd, "file2.html"));

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
    expect(files.find((file) => file.name === "file2.html")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file3.jpg")).to.have.property("text", "");
  });

  it("should only read files that match the filter criteria", async () => {
    let cwd = await createDir();
    let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

    let source = filesystem({
      path: ".",
      filter (file) {
        return [".html", ".jpg"].includes(file.extension);
      },
      fs: { readFile },
    });

    let fileChanges = createFileChangePlugin([
      { change: "modified", source: pathToFileURL(join(cwd, "file1.txt")), path: "file1.txt" },
      { change: "modified", source: pathToFileURL(join(cwd, "file2.html")), path: "file2.html" },
      { change: "modified", source: pathToFileURL(join(cwd, "file3.jpg")), path: "file3.jpg" },
    ]);

    let spy = sinon.spy();
    let engine = new CodeEngine({ cwd });
    await engine.use(source, fileChanges, spy);
    engine.watch(WATCH_DELAY);

    // Allow time for all the file changes to be procesed
    await delay(WATCH_DELAY + TIME_BUFFER);

    // fs.readFile() should have only been called for the HTML and JPG files
    sinon.assert.calledTwice(readFile);
    expect(readFile.firstCall.args[0]).to.equal(join(cwd, "file2.html"));
    expect(readFile.secondCall.args[0]).to.equal(join(cwd, "file3.jpg"));

    // Verify that the file contents were written
    let files = getFiles(spy);
    expect(files).to.have.lengthOf(3);

    expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
    expect(files.find((file) => file.name === "file2.html")).to.have.property("text", "Some contents");
    expect(files.find((file) => file.name === "file3.jpg")).to.have.property("text", "Some contents");
  });

});
