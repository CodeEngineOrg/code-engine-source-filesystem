"use strict";

const commonJSExport = require("../../");
const { default: defaultExport, filesystem: namedExport } = require("../../");
const { expect } = require("chai");

describe("code-engine-source-filesystem exports", () => {

  it("should export the filesystem function as the default CommonJS export", () => {
    expect(commonJSExport).to.be.a("function");
    expect(commonJSExport.name).to.equal("filesystem");
  });

  it("should export the filesystem function as the default ESM export", () => {
    expect(defaultExport).to.be.a("function");
    expect(defaultExport.name).to.equal("filesystem");
    expect(defaultExport).to.equal(commonJSExport);
  });

  it("should export the filesystem function as a named export", () => {
    expect(namedExport).to.be.a("function");
    expect(namedExport.name).to.equal("filesystem");
    expect(namedExport).to.equal(commonJSExport);
  });

  it("should not export anything else", () => {
    expect(commonJSExport).to.have.keys(
      "default",
      "filesystem",
    );
  });

});
