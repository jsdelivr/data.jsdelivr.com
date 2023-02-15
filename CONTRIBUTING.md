# Contributing Guide

Hi! We're really excited that you're interested in contributing to data.jsdelivr.com! Before submitting your contribution, please read through the following guide.

## Overview

-   Bug fixes and changes discussed in the existing issues are always welcome.
-   For new ideas, please open an issue to discuss them before sending a PR.
-   Make sure your PR passes `npm test` and has [appropriate commit messages](https://github.com/jsdelivr/data.jsdelivr.com/commits/master).

## Repo Setup

To get started, you need to have Node.js 16, MariaDB 10.5, and Redis installed and configured.

The default configuration file is `config/default.js`. To change any of the default values, either:
- create a file `config/local.js` with the necessary changes; the options set in this file will be merged with `config/default.js` so `config/local.js` should only contain options that you actually changed,
- use environment variables.

Run the following commands:

```bash
npm install # install dependencies
npm run migrate # setup the database
npm start # start the app
```

Configuration for IntelliJ based IDEs is also available in this repository. If you use one, it is a good idea to add https://github.com/MartinKolarik/idea-config as a [read-only settings repository](https://www.jetbrains.com/help/idea/sharing-your-ide-settings.html#share-more-settings-through-read-only-repo). It contains code style and inspection profiles used by this project.

## Testing

-   JS code style: `npm run lint`
-   Integration tests: `npm run mocha`
-   All combined: `npm test`

Most IDEs have plugins integrating the used linter (eslint), including support for automated fixes on save.
