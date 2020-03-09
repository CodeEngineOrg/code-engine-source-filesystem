"use strict";

const filesystem = require("../../");
const { host } = require("@jsdevtools/host-environment");
const { CodeEngine } = require("@code-engine/lib");
const sinon = require("sinon");
const { createDir, delay } = require("../utils");
const { expect } = require("chai");
const { promises: fs } = require("fs");
const { join, normalize } = require("path");

// CI environments are slow, so use a larger time buffer
const TIME_BUFFER = host.ci ? 500 : 200;
const WATCH_DELAY = host.ci ? 300 : 100;

describe("filesystem.watch()", () => {

  /**
   * When a file is renamed, it is seen as two changes: a delete and a create.
   * This function returns the two changes in a consistent order.
   */
  function getRenamedFiles (files) {
    expect(files).to.have.lengthOf(2);
    let [file1, file2] = files;
    if (file1.change === "deleted") {
      return [file1, file2];
    }
    else {
      return [file2, file1];
    }
  }

  it("should detect a new file", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
    ]);

    let source = filesystem({ path: "." });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Create a new file, then wait a bit for it to be processed
    await fs.writeFile(join(cwd, "file4.txt"), "Brand new file!");
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file4.txt");
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "Brand new file!");

    // Create a deeply-nested file, then wait a bit for it to be processed
    await fs.mkdir(join(cwd, "one/two/three"), { recursive: true });
    await fs.writeFile(join(cwd, "one/two/three/file5.txt"), "Deep new file");
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    changedFiles = start.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("one/two/three/file5.txt"));
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "Deep new file");
  });

  it("should detect a renamed file", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
    ]);

    let source = filesystem({ path: "." });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Rename a file, then wait a bit for it to be processed
    await fs.rename(join(cwd, "file2.txt"), join(cwd, "file4.txt"));
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let [deleted, created] = getRenamedFiles(start.firstCall.args[0].changedFiles);

    expect(deleted).to.have.property("path", "file2.txt");
    expect(deleted).to.have.property("change", "deleted");
    expect(deleted).to.have.property("text", "");

    expect(created).to.have.property("path", "file4.txt");
    expect(created).to.have.property("change", "created");
    expect(created).to.have.property("text", "Foo bar");

    // Rename a file to a deeply-nested path, then wait a bit for it to be processed
    await fs.mkdir(join(cwd, "one/two/three"), { recursive: true });
    await fs.rename(join(cwd, "file1.txt"), join(cwd, "one/two/three/file5.txt"));
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    [deleted, created] = getRenamedFiles(start.secondCall.args[0].changedFiles);

    expect(deleted).to.have.property("path", "file1.txt");
    expect(deleted).to.have.property("change", "deleted");
    expect(deleted).to.have.property("text", "");

    expect(created).to.have.property("path", normalize("one/two/three/file5.txt"));
    expect(created).to.have.property("change", "created");
    expect(created).to.have.property("text", "Hello, world!");
  });

  it("should detect changed file contents", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
      { path: "deep/sub/folder/file4.txt", contents: "I'm so deep" },
    ]);

    let source = filesystem({ path: "." });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Change one of the files, then wait a bit for it to be processed
    await fs.writeFile(join(cwd, "file2.txt"), "New contents");
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file2.txt");
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "New contents");

    // Change a deeply-nested file, then wait a bit for it to be processed
    await fs.writeFile(join(cwd, "deep/sub/folder/file4.txt"), "New deep contents");
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    changedFiles = start.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("deep/sub/folder/file4.txt"));
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "New deep contents");
  });

  it("should detect a file that was changed by another plugin", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
      { path: "deep/sub/folder/file4.txt", contents: "I'm so deep" },
    ]);

    let otherPlugin = {
      // Capture the source URL of file2.txt
      processFile (file) {
        if (file.path === "file2.txt") {
          this.file2Source = file.source;
        }
        return file;
      },

      // Trigger a file change for file2.txt
      watch (fileChanged) {
        setTimeout(() => {
          fileChanged({
            change: "modified",
            path: "file2.txt",
            source: this.file2Source
          });
        }, 100);
      }
    };

    let source = filesystem({ path: "." });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source, otherPlugin);
    await engine.run();

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(0);

    // Wait for the file change to be triggered and the watch delay to pass
    engine.watch(WATCH_DELAY);
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    changedFiles = start.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file2.txt");
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "Foo bar");
  });

  it("should detect a touched file, even with no content change", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
      { path: "deep/sub/folder/file4.txt", contents: "I'm so deep" },
    ]);

    let source = filesystem({ path: "." });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Touch one of the files, then wait a bit for it to be processed
    await fs.utimes(join(cwd, "file3.txt"), new Date(), new Date());
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file3.txt");
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "Fizz buzz");

    // Touch a deeply-nested file, then wait a bit for it to be processed
    await fs.utimes(join(cwd, "deep/sub/folder/file4.txt"), new Date(), new Date());
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    changedFiles = start.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("deep/sub/folder/file4.txt"));
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "I'm so deep");
  });

  it("should detect a deleted file", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
      { path: "deep/sub/folder/file4.txt", contents: "I'm so deep" },
    ]);

    let source = filesystem({ path: "." });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Delete one of the files, then wait a bit for it to be processed
    await fs.unlink(join(cwd, "file1.txt"));
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file1.txt");
    expect(changedFiles[0]).to.have.property("change", "deleted");
    expect(changedFiles[0]).to.have.property("text", "");

    // Delete a deeply-nested file, then wait a bit for it to be processed
    await fs.unlink(join(cwd, "deep/sub/folder/file4.txt"));
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    changedFiles = start.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("deep/sub/folder/file4.txt"));
    expect(changedFiles[0]).to.have.property("change", "deleted");
    expect(changedFiles[0]).to.have.property("text", "");
  });

  it("should only detect changes in the watched path", async () => {
    let cwd = await createDir([
      { path: "subdir/file1.txt", contents: "Hello, world!" },
      { path: "subdir/file2.txt", contents: "Foo bar" },
      { path: "subdir/file3.txt", contents: "Fizz buzz" },
    ]);

    let source = filesystem({
      // Only watching the subdir, not the root dir
      path: "subdir",
    });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Create a new file in the root dir, then wait a bit to see if it gets detected
    await fs.writeFile(join(cwd, "file4.txt"), "I started outside of the watch path");
    await delay(WATCH_DELAY + TIME_BUFFER);
    sinon.assert.notCalled(start);

    // Modify the file in the root dir, then wait a bit to see if it gets detected
    await fs.utimes(join(cwd, "file4.txt"), new Date(), new Date());
    await delay(WATCH_DELAY + TIME_BUFFER);
    sinon.assert.notCalled(start);

    // Move the file into the subdir, then wait a bit for it to be processed
    await fs.rename(join(cwd, "file4.txt"), join(cwd, "subdir", "file4.txt"));
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file4.txt");
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "I started outside of the watch path");
  });

  it("should only detect changes that match the glob pattern", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
    ]);

    let source = filesystem({
      // Only watching for HTML files
      path: "**/*.html",
    });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Create a new text file, then wait a bit to see if it gets detected
    await fs.writeFile(join(cwd, "file4.txt"), "I'm not an HTML file");
    await delay(WATCH_DELAY + TIME_BUFFER);
    sinon.assert.notCalled(start);

    // Create an HTML file, then wait a bit for it to be processed
    await fs.writeFile(join(cwd, "file5.html"), "<h1>Hello World</h1>");
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file5.html");
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "<h1>Hello World</h1>");

    // Rename a text file to an HTML file, then wait a bit for it to be processed
    await fs.mkdir(join(cwd, "one/two/three"), { recursive: true });
    await fs.rename(join(cwd, "file3.txt"), join(cwd, "one/two/three.html"));
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    changedFiles = start.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("one/two/three.html"));
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "Fizz buzz");
  });

  it("should only detect changes that match the filter criteria", async () => {
    let cwd = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
    ]);

    let source = filesystem({
      path: ".",

      // Only watching files that contain the word "watch"
      filter (file) {
        return file.name.includes("watch");
      }
    });
    let start = sinon.spy();

    let engine = new CodeEngine({ cwd });
    engine.on("start", start);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(start);

    // Create a file, then wait a bit to see if it gets detected
    await fs.writeFile(join(cwd, "file4.txt"), "I should NOT get detected");
    await delay(WATCH_DELAY + TIME_BUFFER);
    sinon.assert.notCalled(start);

    // Create a "watch" file, then wait a bit for it to be processed
    await fs.writeFile(join(cwd, "watch-me.txt"), "I SHOULD get detected");
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledOnce(start);
    let changedFiles = start.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "watch-me.txt");
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "I SHOULD get detected");

    // Rename a file to an "watch" file, then wait a bit for it to be processed
    await fs.mkdir(join(cwd, "one/two/three"), { recursive: true });
    await fs.rename(join(cwd, "file1.txt"), join(cwd, "one/two/three/file1.watch"));
    await delay(WATCH_DELAY + TIME_BUFFER);

    sinon.assert.calledTwice(start);
    changedFiles = start.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("one/two/three/file1.watch"));
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "Hello, world!");
  });

  it("should handle errors that occur in the filter function", async () => {
    let cwd = await createDir();
    let source = filesystem({
      path: ".",
      filter () {
        throw new RangeError("Boom!");
      }
    });

    let errorHandler = sinon.spy();
    let engine = new CodeEngine({ cwd });
    engine.on("error", errorHandler);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(errorHandler);

    // Create a file, which will trigger the filter function, which will throw an error
    await fs.writeFile(join(cwd, "file.txt"), "hello world");
    await delay(WATCH_DELAY + TIME_BUFFER);

    // Make sure the error was thrown and handled
    sinon.assert.calledOnce(errorHandler);
    let error = errorHandler.firstCall.args[0];
    expect(error).to.be.an.instanceOf(RangeError);
    expect(error.message).to.equal("An error occurred in Filesystem Source while watching source files for changes. \nBoom!");
  });

  it("should handle errors that occur in the readFile function", async () => {
    let cwd = await createDir();
    let source = filesystem({
      path: ".",
      fs: {
        readFile () {
          throw new RangeError("Boom!");
        }
      }
    });

    let errorHandler = sinon.spy();
    let engine = new CodeEngine({ cwd });
    engine.on("error", errorHandler);
    await engine.use(source);
    engine.watch(WATCH_DELAY);

    // Wait for Chokidar to setup its filesystem listeners
    await delay(WATCH_DELAY);

    sinon.assert.notCalled(errorHandler);

    // Create a file, which will trigger the filter function, which will throw an error
    await fs.writeFile(join(cwd, "file.txt"), "hello world");
    await delay(WATCH_DELAY + TIME_BUFFER);

    // Make sure the error was thrown and handled
    sinon.assert.calledOnce(errorHandler);
    let error = errorHandler.firstCall.args[0];
    expect(error).to.be.an.instanceOf(RangeError);
    expect(error.message).to.equal("An error occurred in Filesystem Source while watching source files for changes. \nBoom!");
  });
});
