'use strict';

const Rx = require('rx');
require('isomorphic-fetch');

const rxResponse = function (promiseResponse) {
  this._promiseResponse = promiseResponse;
  this.type = promiseResponse.type;
  this.status = promiseResponse.status;
  this.ok = promiseResponse.ok;
  this.statusText = promiseResponse.statusText;
  this.headers = promiseResponse.headers;
  this.url = promiseResponse.url;
  return this;
};

rxResponse.prototype.blob = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.blob());
};

rxResponse.prototype.arrayBuffer = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.arrayBuffer());
};

rxResponse.prototype.text = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.text());
};

rxResponse.prototype.formData = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.formData());
};

rxResponse.prototype.json = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.json());
};

module.exports = function (url, options) {

  return Rx.Observable.fromPromise(fetch(url, options))
    .map((promiseResponse) => new rxResponse(promiseResponse));

}
