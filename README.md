CodeEngine Filesystem Source
======================================

[![Cross-Platform Compatibility](https://engine.codes/img/badges/os-badges.svg)](https://travis-ci.com/CodeEngineOrg/code-engine-source-filesystem)
[![Build Status](https://api.travis-ci.com/CodeEngineOrg/code-engine-source-filesystem.svg?branch=master)](https://travis-ci.com/CodeEngineOrg/code-engine-source-filesystem)

[![Coverage Status](https://coveralls.io/repos/github/CodeEngineOrg/code-engine-source-filesystem/badge.svg?branch=master)](https://coveralls.io/github/CodeEngineOrg/code-engine-source-filesystem)
[![Dependencies](https://david-dm.org/CodeEngineOrg/code-engine-source-filesystem.svg)](https://david-dm.org/CodeEngineOrg/code-engine-source-filesystem)

[![npm](https://img.shields.io/npm/v/code-engine-source-filesystem.svg)](https://www.npmjs.com/package/code-engine-source-filesystem)
[![License](https://img.shields.io/npm/l/code-engine-source-filesystem.svg)](LICENSE)



This is a [CodeEngine](https://engine.codes/) plugin that reads files from the filesystem (local disk or network).

> **NOTE:** This plugin is already built-into the [CodeEngine CLI](https://github.com/CodeEngineOrg/code-engine/wiki/Command-Line-Interface), so you may not need to use it directly unless you are using CodeEngine's [programmatic API](https://github.com/CodeEngineOrg/code-engine/wiki/Programmatic-API).



Installation
-------------------------------
Install using [npm](https://docs.npmjs.com/about-npm/).

```bash
npm install code-engine-source-filesystem
```



Usage
-------------------------------
If you're using the [CodeEngine CLI](https://github.com/CodeEngineOrg/code-engine/wiki/Command-Line-Interface), then this plugin is already built-in, and you can use it simply by specifying a `source` path in your [generator](https://github.com/CodeEngineOrg/code-engine/wiki/Creating-a-Generator).

```javascript
export default {
  source: "my/source/directory",
};
```

Or you can set `source` to a [glob pattern](https://github.com/sindresorhus/globby#globbing-patterns) to match specific files.

```javascript
export default {
  source: "my/source/directory/**/*.{html,css,jpg,gif,png}",
};
```

If you need to set more advanced [options](#options), then you will need to explicitly import and use `code-engine-source-filesystem`.

```javascript
import filesystem from "code-engine-source-filesystem";

export default {
  source: filesystem({
    path: "my/source/directory",
    filter: [
      "**/*.html",
      "css/*.css",
      "img/*.{jpg,gif,png}"
    ]
  }),
};
```



Options
-------------------------------
You can set several options to customize the behavior of the `code-engine-source-filesystem` plugin. The only required option is `path`. All others are optional.

### `path`
The relative or absolute filesystem path to read. Can be any of the following:

  - A file path
  - A directory path
  - A [glob pattern](https://github.com/sindresorhus/globby#globbing-patterns)

> **NOTE:** Setting `path` to a glob pattern is actually just a shorthand for setting `path` to the directory portion of the glob pattern and setting `filter` to the glob portion. This means you cannot set `path` to a glob _and_ also set the `filter` option.


### `filter`
One or more [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns), [regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions), or filter functions that limit which files are read. By default, all files in all sub-directories are read.

The `filter` option can be set to a [glob pattern](https://github.com/sindresorhus/globby#globbing-patterns), like this:

```javascript
import filesystem from "code-engine-source-filesystem";

export default {
  source: filesystem({
    path: "my/source/directory",
    filter: "**/*.html"
  }),
};
```


It can also be set to a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). For example, here's a `filter` that matches all `.htm` and `.html` files:

```javascript
import filesystem from "code-engine-source-filesystem";

export default {
  source: filesystem({
    path: "my/source/directory",
    filter: /\.html?$/
  }),
};
```

You can also use a custom function that accepts a CodeEngine [`File` object](https://github.com/CodeEngineOrg/code-engine/wiki/Files) and returns `true` if the file should be read.  Here's a `filter` that only matches files that do not have the word "draft" in their name:

```javascript
import filesystem from "code-engine-source-filesystem";

export default {
  source: filesystem({
    path: "my/source/directory",
    filter: (file) => !file.name.includes("draft")
  }),
};
```

You can even specify multiple filters using an array. The plugin will read files that match **any** of the filter criteria. Here's a `filter` that will match HTML files, any file in the `img` directory, or any file that does not have the word "draft" in the name:

```javascript
import filesystem from "code-engine-source-filesystem";

export default {
  source: filesystem({
    path: "my/source/directory",
    filter: [
      /\.html?$/,
      "img/**/*",
      (file) => !file.name.includes("draft")
    ]
  }),
};
```

Another option is to specify separate `include` and `exclude` criteria. Each of these can be a single filter or an array of filters. For example, here's a `filter` that will apply to HTML files or files in in the `img` directory, but _only_ if they don't contain the word "draft" in the name:

```javascript
import filesystem from "code-engine-source-filesystem";

export default {
  source: filesystem({
    path: "my/source/directory",
    filter: {
      include: [
        /\.html?$/,
        "img/**/*",
      },
      exclude: (file) => file.name.includes("draft")
    }
  }),
};
```

### deep
Determines the depth of sub-directories that will be read. Can be any of the following:

  - A number that indicates the depth of sub-directories to crawl
  - `Infinity` or `true` to crawl all sub-directories
  - Zero or `false` to only read the top-level directory contents

Defaults to `true`.


### fs
This option allows you to provide your own custom implementation of the [Node.js filesystem module](https://nodejs.org/api/fs.html). Examples of packages you could substitute include:

  - [graceful-fs](https://www.npmjs.com/package/graceful-fs)
  - [virtual-fs](https://www.npmjs.com/package/virtualfs)
  - [fs-in-memory](https://www.npmjs.com/package/fs-in-memory)



Contributing
--------------------------
Contributions, enhancements, and bug-fixes are welcome!  [File an issue](https://github.com/CodeEngineOrg/code-engine-source-filesystem/issues) on GitHub and [submit a pull request](https://github.com/CodeEngineOrg/code-engine-source-filesystem/pulls).

#### Building
To build the project locally on your computer:

1. __Clone this repo__<br>
`git clone https://github.com/CodeEngineOrg/code-engine-source-filesystem.git`

2. __Install dependencies__<br>
`npm install`

3. __Build the code__<br>
`npm run build`

4. __Run the tests__<br>
`npm test`



License
--------------------------
code-engine-source-filesystem is 100% free and open-source, under the [MIT license](LICENSE). Use it however you want.



Big Thanks To
--------------------------
Thanks to these awesome companies for their support of Open Source developers ❤

[![Travis CI](https://engine.codes/img/badges/travis-ci.svg)](https://travis-ci.com)
[![SauceLabs](https://engine.codes/img/badges/sauce-labs.svg)](https://saucelabs.com)
[![Coveralls](https://engine.codes/img/badges/coveralls.svg)](https://coveralls.io)
