'use strict';

const Rx = require('rx');
require('isomorphic-fetch');


const rxResponse = function (promiseResponse) {
  this._promiseResponse = promiseResponse;
  this.status = promiseResponse.status;
  this.ok = promiseResponse.ok;
  this.statusText = promiseResponse.statusText;
  this.headers = promiseResponse.headers;
  this.url = promiseResponse.url;
  return this;
};


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


rxResponse.prototype.text = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.text());
};


rxResponse.prototype.json = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.json());
};


module.exports = (url, options) => {

  // At first glance, Rx.Observable.fromPromise would seem like the correct way
  // to implement this, *but* calling fetch(...) causes work to start on the
  // call right away, making this effectively a hot observable. In order to
  // preserve the semantics of this being a cold observable, we defer invocation
  // until subscription time.

  // See https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/creating.md#cold-vs-hot-observables
  // for a definition of the "hot" and "cold" terms.

  var didSubscribe = false;

  let result = Rx.Observable.defer(() => {

    if (didSubscribe) {
      throw new Error("can not subscribe to rx-fetch result more than once");
    }

    didSubscribe = true;

    const subject = new Rx.AsyncSubject();

    fetch(url, options).then(
      promiseResponse => {
        subject.onNext(new rxResponse(promiseResponse));
        subject.onCompleted();
      },
      subject.onError.bind(subject));

    return subject;

  });

  const throwHttpError = response => {
    var err = new Error("HTTP Error " + response.status + ": " + response.statusText);
    err.response = response;
    throw err;
  };

  result.failOnHttpError = () => {
    return result.map(response => {
      if (!response.ok)
        throwHttpError(response);
      return response;
    });
  };

  result.failIfStatusNotIn = acceptableStatusCodes => {

    if (!Array.isArray(acceptableStatusCodes))
      throw new Error("acceptableStatusCodes must be an Array");

    return result.map(response => {
      if (acceptableStatusCodes.indexOf(response.status) === -1)
        throwHttpError(response);
      return response;
    });

  };

  result.text = () => {
    return result.failOnHttpError()
      .flatMapLatest(response => response.text());
  };

  result.json = () => {
    return result.failOnHttpError()
      .flatMapLatest(response => response.json());
  };

  return result;

};
