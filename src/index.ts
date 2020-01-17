import { filesystem } from "./plugin";

// Named exports
export * from "./config";
export { filesystem };

// Export `filesystem` as the default export
// tslint:disable: no-default-export
export default filesystem;

// CommonJS default export hack
if (typeof module === "object" && typeof module.exports === "object") {
  module.exports = Object.assign(module.exports.default, module.exports);  // tslint:disable-line: no-unsafe-any
}
