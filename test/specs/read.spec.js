"use strict";

const filesystem = require("../../");
const CodeEngine = require("../utils/code-engine");
const sinon = require("sinon");
const { createDir, globify, getFiles } = require("../utils/utils");
const { assert, expect } = require("chai");
const { join, normalize } = require("path");

describe("filesystem.read()", () => {

  describe("single file", () => {
    it("should read a text file", async () => {
      let dir = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/logo.png", contents: Buffer.from([1, 0, 1, 1, 0, 1, 0, 1, 1]) },
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({ path: join(dir, "www/robots.txt") });
      let spy = sinon.spy();
      await engine.use(source, spy);

      let summary = await engine.build();

      expect(summary.input.fileCount).to.equal(1);
      expect(summary.input.fileSize).to.equal(13);  // Hello, world!

      sinon.assert.calledOnce(spy);
      expect(spy.firstCall.args[0]).to.have.property("path", "robots.txt");
      expect(spy.firstCall.args[0]).to.have.property("text", "Hello, world!");
    });

    it("should read a binary file", async () => {
      let dir = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/logo.png", contents: Buffer.from([1, 0, 1, 1, 0, 1, 0, 1, 1]) },
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({ path: join(dir, "www/img/logo.png") });
      let spy = sinon.spy();
      await engine.use(source, spy);

      let summary = await engine.build();

      expect(summary.input.fileCount).to.equal(1);
      expect(summary.input.fileSize).to.equal(9);

      sinon.assert.calledOnce(spy);
      expect(spy.firstCall.args[0]).to.have.property("path", "logo.png");
      expect(spy.firstCall.args[0].contents).to.deep.equal(Buffer.from([1, 0, 1, 1, 0, 1, 0, 1, 1]));
    });

    it("should read an empty file", async () => {
      let dir = await createDir([
        "www/index.html",
        "www/robots.txt",
        "www/img/logo.png",
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({ path: join(dir, "www/index.html") });
      let spy = sinon.spy();
      await engine.use(source, spy);

      let summary = await engine.build();

      expect(summary.input.fileCount).to.equal(1);
      expect(summary.input.fileSize).to.equal(0);

      sinon.assert.calledOnce(spy);
      expect(spy.firstCall.args[0]).to.have.property("path", "index.html");
      expect(spy.firstCall.args[0]).to.have.property("text", "");
      expect(spy.firstCall.args[0].contents).to.have.lengthOf(0);
    });

    it("should read nothing if the file doesn't match the filter criteria", async () => {
      let dir = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({
        path: join(dir, "www/index.html"),
        filter: false,
      });
      await engine.use(source);

      let summary = await engine.build();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should throw an error if the path doesn't exist", async () => {
      let dir = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({ path: join(dir, "www/homepage.html") });
      await engine.use(source);

      try {
        await engine.build();
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.match(/^An error occurred in Filesystem Source while reading source files/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*homepage.html'$/);
      }
    });
  });

  describe("directory", () => {
    it("should read all files in the directory and sub-directories", async () => {
      let dir = await createDir([
        { path: "www/index.html", contents: "<h1>Hello, world!</h1>" },
        { path: "www/robots.txt", contents: "Hello, world!" },
        { path: "www/img/favicon.ico", contents: Buffer.from([1, 1, 1, 1, 1]) },
        { path: "www/img/logos/logo-wide.png", contents: Buffer.from([1, 0, 1, 0, 1]) },
        { path: "www/img/logos/logo-square.png", contents: Buffer.from([0, 1, 0, 1, 0]) },
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({ path: dir });
      let spy = sinon.spy();
      await engine.use(source, spy);

      let summary = await engine.build();

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

    it("should read nothing if the directory is empty", async () => {
      let dir = await createDir();
      let engine = CodeEngine.create();
      let source = filesystem({ path: dir });
      await engine.use(source);

      let summary = await engine.build();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should read nothing if nothing matches the glob pattern", async () => {
      let dir = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({ path: globify(dir, "**/*.md") });
      await engine.use(source);

      let summary = await engine.build();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should read nothing if nothing matches the filter criteria", async () => {
      let dir = await createDir([
        "www/robots.txt",
        "www/index.html",
        "www/img/logo.png",
      ]);

      let engine = CodeEngine.create();
      let source = filesystem({
        path: dir,
        filter: /\.md$/
      });
      await engine.use(source);

      let summary = await engine.build();

      expect(summary.input.fileCount).to.equal(0);
      expect(summary.input.fileSize).to.equal(0);
    });

    it("should throw an error if the path doesn't exist", async () => {
      let engine = CodeEngine.create();
      let source = filesystem({ path: "this/path/does/not/exist" });
      await engine.use(source);

      try {
        await engine.build();
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.match(/^An error occurred in Filesystem Source while reading source files/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*this[/\\]path[/\\]does[/\\]not[/\\]exist'$/);
      }
    });

    it("should throw an error if the path portion of a glob pattern doesn't exist", async () => {
      let engine = CodeEngine.create();
      let source = filesystem({ path: "this/path/does/not/exist/**/*.txt" });
      await engine.use(source);

      try {
        await engine.build();
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.match(/^An error occurred in Filesystem Source while reading source files/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*this[/\\]path[/\\]does[/\\]not[/\\]exist'$/);
      }
    });
  });
});
