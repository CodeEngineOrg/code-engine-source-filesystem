"use strict";

const filesystem = require("../../");
const CodeEngine = require("../utils/code-engine");
const sinon = require("sinon");
const { createDir, delay } = require("../utils");
const { expect } = require("chai");
const { promises: fs } = require("fs");
const { join, normalize } = require("path");

// CI environments are slow, so use a larger time buffer
const TIME_BUFFER = process.env.CI ? 300 : 100;
const watchDelay = process.env.CI ? 300 : 100;

describe("filesystem.watch()", () => {

  it("should detect a new file", async () => {
    let dir = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
    ]);

    let source = filesystem({ path: dir });
    let buildStarting = sinon.spy();

    let engine = CodeEngine.create({ watchDelay });
    engine.on("buildStarting", buildStarting);
    await engine.use(source);
    engine.watch();

    // Wait for Chokidar to setup its filesystem listeners
    await delay(watchDelay);

    sinon.assert.notCalled(buildStarting);

    // Create a new file, then wait a bit for it to be processed
    await fs.writeFile(join(dir, "file4.txt"), "Brand new file!");
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledOnce(buildStarting);
    let changedFiles = buildStarting.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file4.txt");
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "Brand new file!");

    // Create a deeply-nested file, then wait a bit for it to be processed
    await fs.mkdir(join(dir, "one/two/three"), { recursive: true });
    await fs.writeFile(join(dir, "one/two/three/file5.txt"), "Deep new file");
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledTwice(buildStarting);
    changedFiles = buildStarting.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("one/two/three/file5.txt"));
    expect(changedFiles[0]).to.have.property("change", "created");
    expect(changedFiles[0]).to.have.property("text", "Deep new file");
  });

  it("should detect changed file contents", async () => {
    let dir = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
      { path: "deep/sub/folder/file4.txt", contents: "I'm so deep" },
    ]);

    let source = filesystem({ path: dir });
    let buildStarting = sinon.spy();

    let engine = CodeEngine.create({ watchDelay });
    engine.on("buildStarting", buildStarting);
    await engine.use(source);
    engine.watch();

    // Wait for Chokidar to setup its filesystem listeners
    await delay(watchDelay);

    sinon.assert.notCalled(buildStarting);

    // Change one of the files, then wait a bit for it to be processed
    await fs.writeFile(join(dir, "file2.txt"), "New contents");
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledOnce(buildStarting);
    let changedFiles = buildStarting.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file2.txt");
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "New contents");

    // Change a deeply-nested file, then wait a bit for it to be processed
    await fs.writeFile(join(dir, "deep/sub/folder/file4.txt"), "New deep contents");
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledTwice(buildStarting);
    changedFiles = buildStarting.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("deep/sub/folder/file4.txt"));
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "New deep contents");
  });

  it("should detect a touched file, even with no content change", async () => {
    let dir = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
      { path: "deep/sub/folder/file4.txt", contents: "I'm so deep" },
    ]);

    let source = filesystem({ path: dir });
    let buildStarting = sinon.spy();

    let engine = CodeEngine.create({ watchDelay });
    engine.on("buildStarting", buildStarting);
    await engine.use(source);
    engine.watch();

    // Wait for Chokidar to setup its filesystem listeners
    await delay(watchDelay);

    sinon.assert.notCalled(buildStarting);

    // Touch one of the files, then wait a bit for it to be processed
    await fs.utimes(join(dir, "file3.txt"), new Date(), new Date());
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledOnce(buildStarting);
    let changedFiles = buildStarting.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file3.txt");
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "Fizz buzz");

    // Touch a deeply-nested file, then wait a bit for it to be processed
    await fs.utimes(join(dir, "deep/sub/folder/file4.txt"), new Date(), new Date());
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledTwice(buildStarting);
    changedFiles = buildStarting.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("deep/sub/folder/file4.txt"));
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "I'm so deep");
  });

  it.skip("should detect a deleted file", async () => {
    let dir = await createDir([
      { path: "file1.txt", contents: "Hello, world!" },
      { path: "file2.txt", contents: "Foo bar" },
      { path: "file3.txt", contents: "Fizz buzz" },
      { path: "deep/sub/folder/file4.txt", contents: "I'm so deep" },
    ]);

    let source = filesystem({ path: dir });
    let buildStarting = sinon.spy();

    let engine = CodeEngine.create({ watchDelay });
    engine.on("buildStarting", buildStarting);
    await engine.use(source);
    engine.watch();

    // Wait for Chokidar to setup its filesystem listeners
    await delay(watchDelay);

    sinon.assert.notCalled(buildStarting);

    // Delete one of the files, then wait a bit for it to be processed
    await fs.unlink(join(dir, "file1.txt"));
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledOnce(buildStarting);
    let changedFiles = buildStarting.firstCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", "file1.txt");
    expect(changedFiles[0]).to.have.property("change", "deleted");
    expect(changedFiles[0]).to.have.property("text", "");

    // Touch a deeply-nested file, then wait a bit for it to be processed
    await fs.utimes(join(dir, "deep/sub/folder/file4.txt"), new Date(), new Date());
    await delay(watchDelay + TIME_BUFFER);

    sinon.assert.calledTwice(buildStarting);
    changedFiles = buildStarting.secondCall.args[0].changedFiles;
    expect(changedFiles).to.have.lengthOf(1);
    expect(changedFiles[0]).to.have.property("path", normalize("deep/sub/folder/file4.txt"));
    expect(changedFiles[0]).to.have.property("change", "modified");
    expect(changedFiles[0]).to.have.property("text", "I'm so deep");
  });

  // it("should only read files that match the path", async () => {
  //   let dir = await createDir();
  //   let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

  //   let source = filesystem({
  //     path: dir,
  //     fs: { readFile },
  //   });

  //   let fileChanges = createFileChangePlugin([
  //     { change: "modified", source: createFileUrl(join(dir, "..", "file1.txt")), path: "file1.txt" },
  //     { change: "modified", source: createFileUrl(join(dir, "file2.txt")), path: "file2.txt" },
  //     { change: "modified", source: "file://some/other/path", path: "file3.txt" },
  //   ]);

  //   let spy = sinon.spy();
  //   let engine = CodeEngine.create();
  //   await engine.use(source, fileChanges, spy);
  //   engine.watch();

  //   // Allow time for all the file changes to be procesed
  //   await delay(100);

  //   // fs.readFile() should have only been called for the file that's in our path
  //   sinon.assert.calledOnce(readFile);
  //   expect(readFile.firstCall.args[0].href).to.match(/\/file2.txt$/);

  //   // Verify that the file contents were written
  //   let files = getFiles(spy);
  //   expect(files).to.have.lengthOf(3);

  //   expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
  //   expect(files.find((file) => file.name === "file2.txt")).to.have.property("text", "Some contents");
  //   expect(files.find((file) => file.name === "file3.txt")).to.have.property("text", "");
  // });

  // it("should only read files that match the glob pattern", async () => {
  //   let dir = await createDir();
  //   let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

  //   let source = filesystem({
  //     path: globify(dir, "**/*.html"),
  //     fs: { readFile },
  //   });

  //   let fileChanges = createFileChangePlugin([
  //     { change: "modified", source: createFileUrl(join(dir, "file1.txt")), path: "file1.txt" },
  //     { change: "modified", source: createFileUrl(join(dir, "file2.html")), path: "file2.html" },
  //     { change: "modified", source: createFileUrl(join(dir, "file3.jpg")), path: "file3.jpg" },
  //   ]);

  //   let spy = sinon.spy();
  //   let engine = CodeEngine.create();
  //   await engine.use(source, fileChanges, spy);
  //   engine.watch();

  //   // Allow time for all the file changes to be procesed
  //   await delay(100);

  //   // fs.readFile() should have only been called for the HTML file
  //   sinon.assert.calledOnce(readFile);
  //   expect(readFile.firstCall.args[0].href).to.match(/\/file2.html$/);

  //   // Verify that the file contents were written
  //   let files = getFiles(spy);
  //   expect(files).to.have.lengthOf(3);

  //   expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
  //   expect(files.find((file) => file.name === "file2.html")).to.have.property("text", "Some contents");
  //   expect(files.find((file) => file.name === "file3.jpg")).to.have.property("text", "");
  // });

  // it("should only read files that match the filter criteria", async () => {
  //   let dir = await createDir();
  //   let readFile = sinon.spy((file, callback) => callback(null, "Some contents"));

  //   let source = filesystem({
  //     path: dir,
  //     filter (file) {
  //       return [".html", ".jpg"].includes(file.extension);
  //     },
  //     fs: { readFile },
  //   });

  //   let fileChanges = createFileChangePlugin([
  //     { change: "modified", source: createFileUrl(join(dir, "file1.txt")), path: "file1.txt" },
  //     { change: "modified", source: createFileUrl(join(dir, "file2.html")), path: "file2.html" },
  //     { change: "modified", source: createFileUrl(join(dir, "file3.jpg")), path: "file3.jpg" },
  //   ]);

  //   let spy = sinon.spy();
  //   let engine = CodeEngine.create();
  //   await engine.use(source, fileChanges, spy);
  //   engine.watch();

  //   // Allow time for all the file changes to be procesed
  //   await delay(100);

  //   // fs.readFile() should have only been called for the HTML and JPG files
  //   sinon.assert.calledTwice(readFile);
  //   expect(readFile.firstCall.args[0].href).to.match(/\/file2.html$/);
  //   expect(readFile.secondCall.args[0].href).to.match(/\/file3.jpg$/);

  //   // Verify that the file contents were written
  //   let files = getFiles(spy);
  //   expect(files).to.have.lengthOf(3);

  //   expect(files.find((file) => file.name === "file1.txt")).to.have.property("text", "");
  //   expect(files.find((file) => file.name === "file2.html")).to.have.property("text", "Some contents");
  //   expect(files.find((file) => file.name === "file3.jpg")).to.have.property("text", "Some contents");
  // });



  //
  //
  //
  // TODO: TEST FOR A CUSTOM FILTER FUNCTION THROWING AN ERROR. MAKE SURE THE ERROR IS CAUGHT BY CHOKIDAR'S ERROR EVENT
  //
  //
  //
});
