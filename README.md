# rx-fetch [![Build Status](https://travis-ci.org/tangledfruit/rx-fetch.svg?branch=master)](https://travis-ci.org/tangledfruit/rx-fetch)

RxJS-flavored version of HTTP fetch API for node.js

Built on top of [isomorphic-fetch](https://github.com/matthew-andrews/isomorphic-fetch).

## Warnings

- This adds `fetch` as a global so that its API is consistent between client and server.
- You must bring your own ES6 Promise compatible polyfill, I suggest [es6-promise](https://github.com/jakearchibald/es6-promise).

## Installation

### NPM

```sh
npm install --save rx-fetch
```

## Usage

```js
const rxFetch = require('rx-fetch');

rxFetch('//offline-news-api.herokuapp.com/stories')
  .subscribe(
    function (response) {
      if (response.status >= 400) {
        throw new Error("Bad response from server");
      }
      return response.text();
    },
    function (err) {
      console.log("Something went wrong: ", err);
    });
```

## License

MIT
