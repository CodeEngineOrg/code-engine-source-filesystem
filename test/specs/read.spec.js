"use strict";

const filesystem = require("../../");
const { CodeEngine } = require("@code-engine/lib");
const sinon = require("sinon");
const { createDir, getFiles } = require("../utils");
const { assert, expect } = require("chai");
const { normalize } = require("path");

// CI environments are slow, so use a larger time buffer
const TIME_BUFFER = process.env.CI ? 150 : 50;

describe("filesystem.read()", () => {

  describe("single file", () => {
    it("should read a text file", async () => {
      let cwd = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/logo.png", contents: Buffer.from([1, 0, 1, 1, 0, 1, 0, 1, 1]) },
      ]);

      let source = filesystem({ path: "www/robots.txt" });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(1);
      expect(summary.input.fileSize).to.equal(13);  // Hello, world!

      sinon.assert.calledOnce(spy);
      expect(spy.firstCall.args[0]).to.have.property("path", "robots.txt");
      expect(spy.firstCall.args[0]).to.have.property("text", "Hello, world!");
    });

    it("should read a binary file", async () => {
      let cwd = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/logo.png", contents: Buffer.from([1, 0, 1, 1, 0, 1, 0, 1, 1]) },
      ]);

      let source = filesystem({ path: "www/img/logo.png" });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(1);
      expect(summary.input.fileSize).to.equal(9);

      sinon.assert.calledOnce(spy);
      expect(spy.firstCall.args[0]).to.have.property("path", "logo.png");
      expect(spy.firstCall.args[0].contents).to.deep.equal(Buffer.from([1, 0, 1, 1, 0, 1, 0, 1, 1]));
    });

    it("should read an empty file", async () => {
      let cwd = await createDir([
        "www/index.html",
        "www/robots.txt",
        "www/img/logo.png",
      ]);

      let source = filesystem({ path: "www/index.html" });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(1);
      expect(summary.input.fileSize).to.equal(0);

      sinon.assert.calledOnce(spy);
      expect(spy.firstCall.args[0]).to.have.property("path", "index.html");
      expect(spy.firstCall.args[0]).to.have.property("text", "");
      expect(spy.firstCall.args[0].contents).to.have.lengthOf(0);
    });

    it("should read nothing if the file doesn't match the filter criteria", async () => {
      let cwd = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let source = filesystem({
        path: "www/index.html",
        filter: false,
      });
      let engine = new CodeEngine({ cwd });
      await engine.use(source);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should throw an error if the path doesn't exist", async () => {
      let cwd = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let source = filesystem({ path: "www/homepage.html" });
      let engine = new CodeEngine({ cwd });

      try {
        await engine.use(source);
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.code).to.equal("ENOENT");
        expect(error.message).to.match(/^An error occurred in Filesystem Source while it was initializing/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*homepage.html'$/);
      }
    });
  });

  describe("directory", () => {
    it("should read all files in the directory and sub-directories", async () => {
      let cwd = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/favicon.ico", contents: Buffer.from([1, 1, 1, 1, 1]) },
        { path: "www/img/logos/logo-wide.png", contents: Buffer.from([1, 0, 1, 0, 1]) },
        { path: "www/img/logos/logo-square.png", contents: Buffer.from([0, 1, 0, 1, 0]) },
      ]);

      let source = filesystem({ path: "." });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(5);
      expect(summary.input.fileSize).to.equal(50);

      sinon.assert.callCount(spy, 5);
      let files = getFiles(spy);

      let indexHtml = files.find((file) => file.name === "index.html");
      expect(indexHtml).to.have.property("path", normalize("www/index.html"));
      expect(indexHtml).to.have.property("text", "<h1>Hello, world!</h1>");

      let robotsTxt = files.find((file) => file.name === "robots.txt");
      expect(robotsTxt).to.have.property("path", normalize("www/robots.txt"));
      expect(robotsTxt).to.have.property("text", "Hello, world!");

      let favicon = files.find((file) => file.name === "favicon.ico");
      expect(favicon).to.have.property("path", normalize("www/img/favicon.ico"));
      expect(favicon.contents).to.deep.equal(Buffer.from([1, 1, 1, 1, 1]));

      let logoWide = files.find((file) => file.name === "logo-wide.png");
      expect(logoWide).to.have.property("path", normalize("www/img/logos/logo-wide.png"));
      expect(logoWide.contents).to.deep.equal(Buffer.from([1, 0, 1, 0, 1]));

      let logoSquare = files.find((file) => file.name === "logo-square.png");
      expect(logoSquare).to.have.property("path", normalize("www/img/logos/logo-square.png"));
      expect(logoSquare.contents).to.deep.equal(Buffer.from([0, 1, 0, 1, 0]));
    });

    it("should only read files in top-level directory", async () => {
      let cwd = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/favicon.ico", contents: Buffer.from([1, 1, 1, 1, 1]) },
        { path: "www/img/logos/logo-wide.png", contents: Buffer.from([1, 0, 1, 0, 1]) },
        { path: "www/img/logos/logo-square.png", contents: Buffer.from([0, 1, 0, 1, 0]) },
      ]);

      let source = filesystem({
        path: "www",
        deep: false,
      });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(2);
      expect(summary.input.fileSize).to.equal(35);

      sinon.assert.callCount(spy, 2);
      let files = getFiles(spy);

      let indexHtml = files.find((file) => file.name === "index.html");
      expect(indexHtml).to.have.property("path", normalize("index.html"));
      expect(indexHtml).to.have.property("text", "<h1>Hello, world!</h1>");

      let robotsTxt = files.find((file) => file.name === "robots.txt");
      expect(robotsTxt).to.have.property("path", normalize("robots.txt"));
      expect(robotsTxt).to.have.property("text", "Hello, world!");
    });

    it("should read all files that match the glob pattern", async () => {
      let cwd = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/favicon.ico", contents: Buffer.from([1, 1, 1, 1, 1]) },
        { path: "www/img/logos/logo-wide.png", contents: Buffer.from([1, 0, 1, 0, 1]) },
        { path: "www/img/logos/logo-square.png", contents: Buffer.from([0, 1, 0, 1, 0]) },
      ]);

      let source = filesystem({
        path: "**/*.{html,png}",
      });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(3);
      expect(summary.input.fileSize).to.equal(32);

      sinon.assert.callCount(spy, 3);
      let files = getFiles(spy);

      let indexHtml = files.find((file) => file.name === "index.html");
      expect(indexHtml).to.have.property("path", normalize("www/index.html"));
      expect(indexHtml).to.have.property("text", "<h1>Hello, world!</h1>");

      let logoWide = files.find((file) => file.name === "logo-wide.png");
      expect(logoWide).to.have.property("path", normalize("www/img/logos/logo-wide.png"));
      expect(logoWide.contents).to.deep.equal(Buffer.from([1, 0, 1, 0, 1]));

      let logoSquare = files.find((file) => file.name === "logo-square.png");
      expect(logoSquare).to.have.property("path", normalize("www/img/logos/logo-square.png"));
      expect(logoSquare.contents).to.deep.equal(Buffer.from([0, 1, 0, 1, 0]));
    });

    it("should read all files that match any of the glob patterns", async () => {
      let cwd = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/favicon.ico", contents: Buffer.from([1, 1, 1, 1, 1]) },
        { path: "www/img/index.html", contents: "<h1>Images</h1>" },
        { path: "www/img/logos/index.html", contents: "<h1>Logo Images</h1>" },
        { path: "www/img/logos/logo-wide.png", contents: Buffer.from([1, 0, 1, 0, 1]) },
        { path: "www/img/logos/logo-square.png", contents: Buffer.from([0, 1, 0, 1, 0]) },
      ]);

      let source = filesystem({
        path: "www",
        filter: [
          "*.html",
          "*/*/*",
          "**/*.png",
          "!*/*/*wide*",
        ],
      });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(3);
      expect(summary.input.fileSize).to.equal(47);

      sinon.assert.callCount(spy, 3);
      let files = getFiles(spy);

      let indexHtml = files.find((file) => file.path === "index.html");
      expect(indexHtml).to.have.property("text", "<h1>Hello, world!</h1>");

      let imgIndexHtml = files.find((file) => file.path === normalize("img/logos/index.html"));
      expect(imgIndexHtml).to.have.property("text", "<h1>Logo Images</h1>");

      let logoSquare = files.find((file) => file.name === "logo-square.png");
      expect(logoSquare).to.have.property("path", normalize("img/logos/logo-square.png"));
      expect(logoSquare.contents).to.deep.equal(Buffer.from([0, 1, 0, 1, 0]));
    });

    it("should read all files that match custom filter criteria", async () => {
      let cwd = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/favicon.ico", contents: Buffer.from([1, 1, 1, 1, 1]) },
        { path: "www/img/logos/logo-wide.png", contents: Buffer.from([1, 0, 1, 0, 1]) },
        { path: "www/img/logos/logo-square.png", contents: Buffer.from([0, 1, 0, 1, 0]) },
      ]);

      let source = filesystem({
        path: "www",
        filter (file) {
          return file.name.includes("a") || file.name.includes("e");
        }
      });
      let spy = sinon.spy();
      let engine = new CodeEngine({ cwd });
      await engine.use(source, spy);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(4);
      expect(summary.input.fileSize).to.equal(37);

      sinon.assert.callCount(spy, 4);
      let files = getFiles(spy);

      let indexHtml = files.find((file) => file.name === "index.html");
      expect(indexHtml).to.have.property("path", normalize("index.html"));
      expect(indexHtml).to.have.property("text", "<h1>Hello, world!</h1>");

      let favicon = files.find((file) => file.name === "favicon.ico");
      expect(favicon).to.have.property("path", normalize("img/favicon.ico"));
      expect(favicon.contents).to.deep.equal(Buffer.from([1, 1, 1, 1, 1]));

      let logoWide = files.find((file) => file.name === "logo-wide.png");
      expect(logoWide).to.have.property("path", normalize("img/logos/logo-wide.png"));
      expect(logoWide.contents).to.deep.equal(Buffer.from([1, 0, 1, 0, 1]));

      let logoSquare = files.find((file) => file.name === "logo-square.png");
      expect(logoSquare).to.have.property("path", normalize("img/logos/logo-square.png"));
      expect(logoSquare.contents).to.deep.equal(Buffer.from([0, 1, 0, 1, 0]));
    });

    it("should read files simultaneously, up to the concurrency limit", async () => {
      let cwd = await createDir([
        "file-1.txt",
        "file-2.txt",
        "file-3.txt",
        "file-4.txt",
        "file-5.txt",
      ]);

      let readTimes = [];                                             // Keeps track of when each file is read

      let source = filesystem({
        path: ".",
        fs: {
          readFile (_, callback) {
            readTimes.push(Date.now());                               // Track when each file is read
            setTimeout(() => callback(null, ""), 500);                // Each file will take 500ms to read
          }
        }
      });

      let engine = new CodeEngine({ cwd, concurrency: 3 });           // We can read 3 files simultaneously
      await engine.use(source);
      let summary = await engine.run();

      // Make sure exactly 5 files were read
      expect(summary.input.fileCount).to.equal(5);
      expect(readTimes).to.have.lengthOf(5);

      // The first three files should have been read simultaneously
      expect(readTimes[0] - summary.time.start).to.be.below(TIME_BUFFER);
      expect(readTimes[1] - summary.time.start).to.be.below(TIME_BUFFER);
      expect(readTimes[2] - summary.time.start).to.be.below(TIME_BUFFER);

      // The last two files should have been read simultaneously
      expect(readTimes[3] - summary.time.start).to.be.above(500).and.below(500 + TIME_BUFFER);
      expect(readTimes[4] - summary.time.start).to.be.above(500).and.below(500 + TIME_BUFFER);

      // The total read time should have been around 1 second
      expect(summary.time.elapsed).to.be.above(1000).and.below(1000 + TIME_BUFFER);
    });

    it("should read nothing if the directory is empty", async () => {
      let cwd = await createDir();
      let engine = new CodeEngine({ cwd });
      let source = filesystem({ path: "." });
      await engine.use(source);

      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should read nothing if nothing matches the glob pattern", async () => {
      let cwd = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let source = filesystem({ path: "**/*.md" });
      let engine = new CodeEngine({ cwd });
      await engine.use(source);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should read nothing if nothing matches the filter criteria", async () => {
      let cwd = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let source = filesystem({
        path: ".",
        filter: /\.md$/
      });
      let engine = new CodeEngine({ cwd });
      await engine.use(source);
      let summary = await engine.run();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should throw an error if the path doesn't exist", async () => {
      let source = filesystem({ path: "this/path/does/not/exist" });
      let engine = new CodeEngine();

      try {
        await engine.use(source);
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.code).to.equal("ENOENT");
        expect(error.message).to.match(/^An error occurred in Filesystem Source while it was initializing/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*this[/\\]path[/\\]does[/\\]not[/\\]exist'$/);
      }
    });

    it("should throw an error if the path portion of a glob pattern doesn't exist", async () => {
      let source = filesystem({ path: "this/path/does/not/exist/**/*.txt" });
      let engine = new CodeEngine();

      try {
        await engine.use(source);
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.code).to.equal("ENOENT");
        expect(error.message).to.match(/^An error occurred in Filesystem Source while it was initializing/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*this[/\\]path[/\\]does[/\\]not[/\\]exist'$/);
      }
    });
  });

  it("should handle errors that occur in the filter function", async () => {
    let source = filesystem({
      path: await createDir(["file1.txt", "file2.txt", "file3.txt"]),
      filter () {
        throw new RangeError("Boom!");
      }
    });
    let engine = new CodeEngine();
    await engine.use(source);

    try {
      await engine.run();
      assert.fail("An error should have been thrown!");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(RangeError);
      expect(error.message).to.equal("An error occurred in Filesystem Source while reading source files. \nBoom!");
    }
  });

  it("should handle errors that occur in custom fs functions", async () => {
    let source = filesystem({
      path: await createDir(["file1.txt", "file2.txt", "file3.txt"]),
      fs: {
        stat () {
          throw new RangeError("Boom!");
        }
      },
    });
    let engine = new CodeEngine();

    try {
      await engine.use(source);
      assert.fail("An error should have been thrown!");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(RangeError);
      expect(error.message).to.equal("An error occurred in Filesystem Source while it was initializing. \nBoom!");
    }
  });

  it("should handle errors that are returnd by custom fs functions", async () => {
    let source = filesystem({
      path: await createDir(["file1.txt", "file2.txt", "file3.txt"]),
      fs: {
        stat (_, callback) {
          callback(new RangeError("Boom!"));
        }
      },
    });
    let engine = new CodeEngine();

    try {
      await engine.use(source);
      assert.fail("An error should have been thrown!");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(RangeError);
      expect(error.message).to.equal("An error occurred in Filesystem Source while it was initializing. \nBoom!");
    }
  });

  it("should handle errors that are thrown by the readFile function", async () => {
    let source = filesystem({
      path: await createDir(["file1.txt", "file2.txt", "file3.txt"]),
      fs: {
        readFile () {
          throw new RangeError("Boom!");
        }
      },
    });
    let engine = new CodeEngine();
    await engine.use(source);

    try {
      await engine.run();
      assert.fail("An error should have been thrown!");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(RangeError);
      expect(error.message).to.equal("An error occurred in Filesystem Source while reading source files. \nBoom!");
    }
  });
});
