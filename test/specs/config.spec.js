"use strict";

const filesystem = require("../../");
const { CodeEngine } = require("@code-engine/lib");
const sinon = require("sinon");
const { createDir, globify, getFilePaths } = require("../utils");
const { assert, expect } = require("chai");
const { normalize } = require("path");

describe("Config", () => {
  let dir;

  it("should throw an error if called with no arguments", async () => {
    try {
      filesystem();
      assert.fail("An error should have been thrown");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(TypeError);
      expect(error.message).to.equal("Invalid config: undefined. A value is required.");
    }
  });

  it("should throw an error if called with an invalid argument", async () => {
    try {
      filesystem("hello, world");
      assert.fail("An error should have been thrown");
    }
    catch (error) {
      expect(error).to.be.an.instanceOf(TypeError);
      expect(error.message).to.equal('Invalid config: "hello, world". Expected an object.');
    }
  });

  describe("path", () => {

    it("should throw an error if not specified", async () => {
      try {
        filesystem({});
        assert.fail("An error should have been thrown");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.equal("Invalid path: undefined. A value is required.");
      }
    });

    it("should throw an error if set to an invalid value", async () => {
      try {
        filesystem({ path: true });
        assert.fail("An error should have been thrown");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.equal("Invalid path: true. Expected a string.");
      }
    });

    it("should throw an error if set to an empty string", async () => {
      try {
        filesystem({ path: "" });
        assert.fail("An error should have been thrown");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(RangeError);
        expect(error.message).to.equal('Invalid path: "". It cannot be empty.');
      }
    });

    it("should throw an error if set to a whitespace string", async () => {
      try {
        filesystem({ path: "\r \n \t" });
        assert.fail("An error should have been thrown");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.message).to.equal('Invalid path: "\r \n \t". It cannot be all whitespace.');
      }
    });

  });

  describe("deep", () => {
    before(async () => {
      dir = await createDir([
        "top-level.txt",
        "also-top-level.txt",
        "one/level-deep.txt",
        "also/one-level-deep.txt",
        "two/levels/deep.txt",
        "also/two/levels-deep.txt",
        "three/levels/deep/file.txt",
        "also/three/levels/deep.txt",
      ]);
    });

    it("should crawl all sub-directories by default", async () => {
      let source = filesystem({
        path: dir,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(8);

      expect(filePaths).to.have.same.members([
        "top-level.txt",
        "also-top-level.txt",
        normalize("one/level-deep.txt"),
        normalize("also/one-level-deep.txt"),
        normalize("two/levels/deep.txt"),
        normalize("also/two/levels-deep.txt"),
        normalize("three/levels/deep/file.txt"),
        normalize("also/three/levels/deep.txt"),
      ]);
    });

    it("should crawl all sub-directories if deep is true", async () => {
      let source = filesystem({
        path: dir,
        deep: true,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(8);

      expect(filePaths).to.have.same.members([
        "top-level.txt",
        "also-top-level.txt",
        normalize("one/level-deep.txt"),
        normalize("also/one-level-deep.txt"),
        normalize("two/levels/deep.txt"),
        normalize("also/two/levels-deep.txt"),
        normalize("three/levels/deep/file.txt"),
        normalize("also/three/levels/deep.txt"),
      ]);
    });

    it("should only read the top-level directory if deep is false", async () => {
      let source = filesystem({
        path: dir,
        deep: false,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(2);

      expect(filePaths).to.have.same.members([
        "top-level.txt",
        "also-top-level.txt",
      ]);
    });

    it("should only read the top-level directory if deep is zero", async () => {
      let source = filesystem({
        path: dir,
        deep: 0,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(2);

      expect(filePaths).to.have.same.members([
        "top-level.txt",
        "also-top-level.txt",
      ]);
    });

    it("should only crawl sub-directories one level deep", async () => {
      let source = filesystem({
        path: dir,
        deep: 1,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(4);

      expect(filePaths).to.have.same.members([
        "top-level.txt",
        "also-top-level.txt",
        normalize("one/level-deep.txt"),
        normalize("also/one-level-deep.txt"),
      ]);
    });

    it("should only crawl sub-directories two levels deep", async () => {
      let source = filesystem({
        path: dir,
        deep: 2,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(6);

      expect(filePaths).to.have.same.members([
        "top-level.txt",
        "also-top-level.txt",
        normalize("one/level-deep.txt"),
        normalize("also/one-level-deep.txt"),
        normalize("two/levels/deep.txt"),
        normalize("also/two/levels-deep.txt"),
      ]);
    });
  });

  describe("filter", () => {
    before(async () => {
      dir = await createDir([
        "www/index.html",
        "www/about.html",
        "www/robots.txt",
        "www/favicon.ico",

        "www/products/product1.html",
        "www/products/product1/img/front.png",
        "www/products/product1/img/back.png",

        "www/products/product2.html",
        "www/products/product2/img/front.png",
        "www/products/product2/img/back.png",

        "www/products/product3.html",
        "www/products/product3/img/front.png",
        "www/products/product3/img/back.png",

        "www/img/logo.png",
        "www/img/logos/social/facebook.png",
        "www/img/logos/social/twitter.png",
      ]);
    });

    it("should read all files that match the glob", async () => {
      let source = filesystem({
        path: dir,
        filter: "**/*.html",
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(5);

      expect(filePaths).to.have.same.members([
        normalize("www/index.html"),
        normalize("www/about.html"),
        normalize("www/products/product1.html"),
        normalize("www/products/product2.html"),
        normalize("www/products/product3.html"),
      ]);
    });

    it("should read all files that match any of the glob patterns", async () => {
      let source = filesystem({
        path: dir,
        filter: [
          "*/*.{txt,ico}",
          "*/*/*.html",
          "**/*.png",
          "!*/*/*/*/*back*",
        ],
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(11);

      expect(filePaths).to.have.same.members([
        normalize("www/robots.txt"),
        normalize("www/favicon.ico"),
        normalize("www/products/product1.html"),
        normalize("www/products/product1/img/front.png"),
        normalize("www/products/product2.html"),
        normalize("www/products/product2/img/front.png"),
        normalize("www/products/product3.html"),
        normalize("www/products/product3/img/front.png"),
        normalize("www/img/logo.png"),
        normalize("www/img/logos/social/facebook.png"),
        normalize("www/img/logos/social/twitter.png"),
      ]);
    });

    it("should read all files that match any of the glob patterns", async () => {
      let source = filesystem({
        path: dir,
        filter: [
          "*/*.{txt,ico}",
          "*/*/*.html",
          "**/*.png",
          "!*/*/*/*/*back*",
        ],
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(11);

      expect(filePaths).to.have.same.members([
        normalize("www/robots.txt"),
        normalize("www/favicon.ico"),
        normalize("www/products/product1.html"),
        normalize("www/products/product1/img/front.png"),
        normalize("www/products/product2.html"),
        normalize("www/products/product2/img/front.png"),
        normalize("www/products/product3.html"),
        normalize("www/products/product3/img/front.png"),
        normalize("www/img/logo.png"),
        normalize("www/img/logos/social/facebook.png"),
        normalize("www/img/logos/social/twitter.png"),
      ]);
    });

    it("should read all files that match custom filter criteria", async () => {
      let source = filesystem({
        path: dir,
        filter (file) {
          return file.name.includes("a") || file.name.includes("e");
        }
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(8);

      expect(filePaths).to.have.same.members([
        normalize("www/index.html"),
        normalize("www/about.html"),
        normalize("www/favicon.ico"),
        normalize("www/products/product1/img/back.png"),
        normalize("www/products/product2/img/back.png"),
        normalize("www/products/product3/img/back.png"),
        normalize("www/img/logos/social/facebook.png"),
        normalize("www/img/logos/social/twitter.png"),
      ]);
    });

    it("should not allow a glob pattern in the path if a filter is also set", async () => {
      let source = filesystem({
        path: globify(dir, "**/*.txt"),
        filter: "**/*.html",
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();

      try {
        await engine.use(source, spy);
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.code).to.equal("ENOENT");
        expect(error.message).to.match(/^An error occurred in Filesystem Source while it was initializing/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*\*\*[/\\]\*\.txt'$/);
      }
    });

    it("should not allow a glob pattern in the path, even if the filter is set to false", async () => {
      let source = filesystem({
        path: globify(dir, "**/*.txt"),
        filter: false,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();

      try {
        await engine.use(source, spy);
        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(Error);
        expect(error.code).to.equal("ENOENT");
        expect(error.message).to.match(/^An error occurred in Filesystem Source while it was initializing/);
        expect(error.message).to.match(/ENOENT: no such file or directory, stat .*\*\*[/\\]\*\.txt'$/);
      }
    });
  });

  describe("fs", () => {

    it("should use custom filesystem functions", async () => {
      let myCustomFS = {
        readdir (_, callback) {
          setTimeout(() => callback(null, ["file-one.txt", "file-two.txt"]), 100);
        },

        stat (path, callback) {
          setTimeout(() => callback(null, {
            isDirectory () {
              return !path.endsWith(".txt");
            },
            isFile () {
              return path.endsWith(".txt");
            },
            isSymbolicLink () {
              return false;
            }
          }), 100);
        },

        lstat (path, callback) {
          myCustomFS.stat(path, callback);
        },

        readFile (path, callback) {
          setTimeout(() => callback(null, "Hello, world!"), 500);
        }
      };

      let source = filesystem({
        path: "/this/path/does/not/exist",
        fs: myCustomFS,
      });

      let engine = new CodeEngine();
      let spy = sinon.spy();
      await engine.use(source, spy);
      let summary = await engine.run();
      let filePaths = getFilePaths(spy);

      expect(summary.input.fileCount).to.equal(2);
      expect(summary.input.fileSize).to.equal(26);

      expect(filePaths).to.have.same.members([
        "file-one.txt",
        "file-two.txt",
      ]);
    });

    it("should throw an error if fs.stat is not a function", async () => {
      try {
        filesystem({
          path: "/this/path/does/not/exist",
          fs: {
            stat: true,
          },
        });

        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.equal("Invalid fs.stat: true. Expected a function.");
      }
    });

    it("should throw an error if fs.lstat is not a function", async () => {
      try {
        filesystem({
          path: "/this/path/does/not/exist",
          fs: {
            lstat: 12345,
          },
        });

        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.equal("Invalid fs.lstat: 12345. Expected a function.");
      }
    });

    it("should throw an error if fs.readdir is not a function", async () => {
      try {
        filesystem({
          path: "/this/path/does/not/exist",
          fs: {
            readdir: [1, 2, 3],
          },
        });

        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.equal("Invalid fs.readdir: [1,2,3]. Expected a function.");
      }
    });

    it("should throw an error if fs.readFile is not a function", async () => {
      try {
        filesystem({
          path: "/this/path/does/not/exist",
          fs: {
            readFile: "readFile",
          },
        });

        assert.fail("An error should have been thrown!");
      }
      catch (error) {
        expect(error).to.be.an.instanceOf(TypeError);
        expect(error.message).to.equal('Invalid fs.readFile: "readFile". Expected a function.');
      }
    });

  });

});
