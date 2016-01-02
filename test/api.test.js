'use strict';

const Rx = require('rx');
const expect = require('chai').expect;
const nock = require('nock');
const rxFetch = require('../lib/rx-fetch');

const good = 'hello world. 你好世界。';
const bad = 'good bye cruel world. 再见残酷的世界。';

//------------------------------------------------------------------------------

const expectOneResult = function (observable, done, match) {

  var didSendData = false;
  var failure;

  observable.subscribe(

    function (value) {
      try {
        if (didSendData && !failure)
          failure = new Error("Unexpected second result: ", value);
        else
          match(value);
      }
      catch (err) {
        failure = err;
      }
    },

    function (err) {
      done(err);
    },

    function () {
      done(failure);
    });

};

//------------------------------------------------------------------------------

const expectOnlyError = function (observable, done, match) {

  var didSendData = false;
  var failure;

  observable.subscribe(

    function (value) {
      if (!failure)
        failure = new Error("onNext was called with value: ", value);
    },

    function (err) {
      if (!failure) {
        try {
          if (match)
            match(err);
        }
        catch (err) {
          failure = err;
        }
      }
      done(failure);
    },

    function () {
      done(new Error("onCompleted was called"));
    });

};

//------------------------------------------------------------------------------

describe('rx-fetch', function () {

  it('should be defined', function () {

    expect(fetch).to.be.a('function');

  });

  //----------------------------------------------------------------------------

  it('should return an Observable which yields a single Response object', function (done) {

    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    expectOneResult(fetchResult, done,
      ((result) => {
        expect(result.status).to.equal(200);
        expect(result.ok).to.equal(true);
        expect(result.statusText).to.equal('OK');
        expect(typeof (result.headers)).to.equal('object');
        expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
      }));

  });

  //----------------------------------------------------------------------------

  describe('.text()', function() {

    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    it('should return an Observable which yields the body of the response as a string', function (done) {

      const textResult = fetchResult.flatMapLatest((response) => response.text());

      expectOneResult(textResult, done,
        ((textResult) => {
          expect(textResult).to.equal(good);
        }));

    });

    it('should yield an error result if called a second time', function (done) {

      const textResult = fetchResult.flatMapLatest((response) => response.text());
      expectOnlyError(textResult, done);

    });

  });

  //----------------------------------------------------------------------------

  describe('.json()', function() {

    nock('http://tangledfruit.com')
      .get('/json.txt')
      .reply(200, '{"x":["hello", "world", 42]}');

    const fetchResult = rxFetch('http://tangledfruit.com/json.txt');

    it('should return an Observable which yields the body of the response as parsed JSON', function (done) {

      const jsonResult = fetchResult.flatMapLatest((response) => response.json());

      expectOneResult(jsonResult, done,
        ((textResult) => {
          expect(textResult).to.deep.equal({"x": ["hello", "world", 42]});
        }));

    });

    it('should yield an error result if called a second time', function (done) {

      const jsonResult = fetchResult.flatMapLatest((response) => response.json());
      expectOnlyError(jsonResult, done);

    });

  });

  //----------------------------------------------------------------------------

  it('should resolve with a Response object if the request fails', function (done) {

    nock('http://tangledfruit.com')
      .get('/fail.txt')
      .reply(404, bad);

    const fetchResult = rxFetch('http://tangledfruit.com/fail.txt');

    expectOneResult(fetchResult, done,
      ((result) => {
        expect(result.status).to.equal(404);
        expect(result.ok).to.equal(false);
        expect(result.statusText).to.equal('Not Found');
        expect(typeof (result.headers)).to.equal('object');
        expect(result.url).to.equal('http://tangledfruit.com/fail.txt');
      }));

  });

});
