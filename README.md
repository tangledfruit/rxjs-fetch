# rx-fetch [![Build Status](https://travis-ci.org/tangledfruit/rx-fetch.svg?branch=master)](https://travis-ci.org/tangledfruit/rx-fetch) [![Coverage Status](https://coveralls.io/repos/tangledfruit/rx-fetch/badge.svg?branch=master&service=github)](https://coveralls.io/github/tangledfruit/rx-fetch?branch=master) [![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

RxJS-flavored version of HTTP fetch API for node.js.

**IMPORTANT:** This library only supports RxJS 4.x.

**Looking for RxJS 5.0+ support?** Try  [rxjs-fetch](https://github.com/tangledfruit/rxjs-fetch). (Same name but replace 'rx' with 'rxjs'.)

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
    response => {
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
    err => {
      console.log(err);
      // Should only happen if unable to reach server.
      // Server error responses (status code >= 400)
      // are not automatically mapped to errors.
    });

```

There are some shortcut methods available on the Observable object that is returned from `rxFetch`:

```js
rxFetch('http://tangledfruit.com/mumble.txt').failOnHttpError()
  // -> This Observable will yield an onError notification using the HttpError
  // object described below if the HTTP status code is >= 400.
```

```js
rxFetch('http://tangledfruit.com/mumble.txt').failIfStatusNotIn([200, 404])
  // -> This Observable will yield an onError notification using the HttpError
  // object described below if the HTTP status code is anything other than the
  // codes listed (in this case, 200 and 404).
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

```js
const recording = new Rx.ReplaySubject(); // can be any Subject
rxFetch('http://tangledfruit.com/mumble.txt').recordTo(recording).json()
  // -> Same as above, but it will capture the request and response and
  // send it to the Subject in a syntax that can then be used to write unit
  // tests using Nock. (See rx-fetch's own unit tests for an example.)
  // You can also invoke this by adding recordTo: subject in the options
  // object on the .get method.
```
### HTTP Error object

The `.failOnHttpError` and `.failIfStatusNotIn` methods will send an `onError`
notification with an `HttpError` object. This is the standard `Error` Object,
but it has an extra member `response` from which you can access other properties
as described earlier.

The message for the error will be "HTTP Error (status code): (server message)".
For example, "HTTP Error 404: Not Found".


## License

MIT
