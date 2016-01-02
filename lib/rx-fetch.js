'use strict';

const Rx = require('rx');
require('isomorphic-fetch');

Rx.config.longStackSupport = true;

module.exports = function (url, options) {

  return Rx.Observable.fromPromise(fetch(url, options))
    .flatMapLatest((response) => {

      return Rx.Observable.fromPromise(response.text())
        .map((body) => {

          return {
            url: response.url,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            text: body,
            size: response.size, // ???
            ok: response.ok,
            timeout: response.timeout
          };

        });

    });

}
