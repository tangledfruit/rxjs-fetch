# rx-fetch [![Build Status](https://travis-ci.org/tangledfruit/rx-fetch.svg?branch=master)](https://travis-ci.org/tangledfruit/rx-fetch) [![Coverage Status](https://coveralls.io/repos/tangledfruit/rx-fetch/badge.svg?branch=master&service=github)](https://coveralls.io/github/tangledfruit/rx-fetch?branch=master)

RxJS-flavored version of HTTP fetch API for node.js.

Built on top of [isomorphic-fetch](https://github.com/matthew-andrews/isomorphic-fetch).


## Warnings

- This adds `fetch` as a global so that its API is consistent between client and server.
- You must bring your own ES6 Promise compatible polyfill. I suggest [es6-promise](https://github.com/jakearchibald/es6-promise).

## Installation

### NPM

```sh
npm install --save rx-fetch
```

## Usage

```js
const rxFetch = require('rx-fetch');

rxFetch('http://tangledfruit.com/mumble.txt')
  .subscribe(
    function (response) {

      /*
        Occurs exactly once. "response" is an Object with the following properties:

          - status (Number): HTTP status code
          - ok (Boolean): true if status < 400
          - statusText (String): HTTP status string
          - headers (Object): Maps HTTP headers in the response to string values
          - url (String): URL that was requested.

        "response" has the following methods:

          - text: Returns another Observable which resolves with the response body
            as a String when available.

          - json: Returns another Observable which resolves with the response body
            parsed as JSON (i.e. an Object or Array) when available.

          It is an error to call more than one of these methods or to call any
          of these methods more than once.
      */

    },
    function (err) {
      // Should only happen if unable to reach server.
      // Server error responses (status code >= 400)
      // are not automatically mapped to errors.
    });
```

There are some shortcut methods available on the Observable object that is returned from `rxFetch`:

```js
rxFetch('http://tangledfruit.com/mumble.txt').failOnHttpError()
  // -> This Observable will yield an onError notification if the HTTP status
  // code is >= 400.
```

```js
rxFetch('http://tangledfruit.com/mumble.txt').text()
  // -> This Observable will yield an onNext notification containing only the
  // body text of the HTTP response. The HTTP headers and status are discarded.
  // This call implies .failOnHttpError().
```

```js
rxFetch('http://tangledfruit.com/mumble.txt').json()
  // -> This Observable will yield an onNext notification containing only the
  // body of the HTTP response parsed as JSON. The HTTP headers and status are
  // discarded. This call implies .failOnHttpError().
```


## License

MIT
