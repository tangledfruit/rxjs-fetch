'use strict';

const Rx = require('rx');
require('isomorphic-fetch');

//------------------------------------------------------------------------------

const rxResponse = function (promiseResponse) {
  this._promiseResponse = promiseResponse;
  this.status = promiseResponse.status;
  this.ok = promiseResponse.ok;
  this.statusText = promiseResponse.statusText;
  this.headers = promiseResponse.headers;
  this.url = promiseResponse.url;
  return this;
};

//------------------------------------------------------------------------------

/* Disabled for now as I'm not sure what the use case is.
   Send me a PR with test coverage if you need these. :-)
rxResponse.prototype.blob = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.blob());
};

rxResponse.prototype.arrayBuffer = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.arrayBuffer());
};

rxResponse.prototype.formData = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.formData());
};
*/

//------------------------------------------------------------------------------

rxResponse.prototype.text = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.text());
};

//------------------------------------------------------------------------------

rxResponse.prototype.json = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.json());
};

//------------------------------------------------------------------------------

module.exports = function (url, options) {

  const result = Rx.Observable.fromPromise(fetch(url, options))
    .map((promiseResponse) => new rxResponse(promiseResponse));

  const throwHttpError = function (response) {
    var err = new Error("HTTP Error " + response.status + ": " + response.statusText);
    err.response = response;
    throw err;
  };

  result.failOnHttpError = function () {
    return result.map((response) => {
      if (!response.ok)
        throwHttpError(response);
      return response;
    });
  };

  result.failIfStatusNotIn = function (acceptableStatusCodes) {

    if (!Array.isArray(acceptableStatusCodes))
      throw new Error("acceptableStatusCodes must be an Array");

    return result.map((response) => {
      if (acceptableStatusCodes.indexOf(response.status) === -1)
        throwHttpError(response);
      return response;
    });

  };

  result.text = function () {
    return result.failOnHttpError()
      .flatMapLatest((response) => response.text());
  };

  result.json = function () {
    return result.failOnHttpError()
      .flatMapLatest((response) => response.json());
  };

  return result;

};
