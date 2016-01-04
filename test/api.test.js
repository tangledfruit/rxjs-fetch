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

  it('should not start work until the Observable has been subscribed to', function (done) {

    const scope = nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    expect(scope.isDone()).to.equal(false);

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

  it('should disallow a second subscription to the Observable', function (done) {

    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    expectOneResult(fetchResult, done,
      ((result) => {
        expect(() => fetchResult.subscribe()).to.throw("can not subscribe to rx-fetch result more than once");
      }));

  });

  //----------------------------------------------------------------------------

  it('should allow you to post with a request body', function (done) {

    nock('http://tangledfruit.com')
      .post('/post.txt', "Yo, what's up?")
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/post.txt',
      {
        method: 'post',
        body: "Yo, what's up?"
      });

    expectOneResult(fetchResult, done,
      ((result) => {
        expect(result.status).to.equal(200);
        expect(result.ok).to.equal(true);
        expect(result.statusText).to.equal('OK');
        expect(typeof (result.headers)).to.equal('object');
        expect(result.url).to.equal('http://tangledfruit.com/post.txt');
      }));

  });

  //----------------------------------------------------------------------------

  describe('response.text()', function() {

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

  describe('response.json()', function() {

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

  it('should still resolve with a Response object if the request fails', function (done) {

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

  //----------------------------------------------------------------------------

  describe('.failOnHttpError()', function () {

    it('should return an Observable which yields a single Response object on HTTP success', function (done) {

      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt').failOnHttpError();

      expectOneResult(fetchResult, done,
        ((result) => {
          expect(result.status).to.equal(200);
          expect(result.ok).to.equal(true);
          expect(result.statusText).to.equal('OK');
          expect(typeof (result.headers)).to.equal('object');
          expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
        }));

    });

    //--------------------------------------------------------------------------

    it('should yield on onError notification if the request fails', function (done) {

      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const fetchResult = rxFetch('http://tangledfruit.com/fail.txt').failOnHttpError();

      expectOnlyError(fetchResult, done,
        function (error) {
          expect(error).to.be.an.instanceof(Error);
          expect(error.message).to.match(/^HTTP Error 404:/);
          expect(error.response.status).to.equal(404);
          expect(error.response.url).to.equal("http://tangledfruit.com/fail.txt");
        });

    });

  });

  //----------------------------------------------------------------------------

  describe('.failIfStatusNotIn()', function () {

    it('should fail if acceptableStatusCodes is not an array', function() {

      expect(function () {

        rxFetch('http://tangledfruit.com/succeed.txt').failIfStatusNotIn(404);

      }).to.throw('acceptableStatusCodes must be an Array');

    });

    //--------------------------------------------------------------------------

    it('should return an Observable which yields a single Response object on HTTP success', function (done) {

      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt').failIfStatusNotIn([200]);

      expectOneResult(fetchResult, done,
        ((result) => {
          expect(result.status).to.equal(200);
          expect(result.ok).to.equal(true);
          expect(result.statusText).to.equal('OK');
          expect(typeof (result.headers)).to.equal('object');
          expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
        }));

    });

    //--------------------------------------------------------------------------

    it('should yield on onError notification if the request fails', function (done) {

      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const fetchResult = rxFetch('http://tangledfruit.com/fail.txt').failIfStatusNotIn([200, 400]);

      expectOnlyError(fetchResult, done,
        function (error) {
          expect(error).to.be.an.instanceof(Error);
          expect(error.message).to.match(/^HTTP Error 404:/);
          expect(error.response.status).to.equal(404);
          expect(error.response.url).to.equal("http://tangledfruit.com/fail.txt");
        });

    });

  });

  //----------------------------------------------------------------------------

  describe('.text()', function() {

    it('should return an Observable which yields the body of the response as a string', function (done) {

      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const textResult = rxFetch('http://tangledfruit.com/succeed.txt').text();

      expectOneResult(textResult, done,
        ((textResult) => {
          expect(textResult).to.equal(good);
        }));

    });

    //--------------------------------------------------------------------------

    it('should yield an error result if HTTP request fails', function (done) {

      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const fetchResult = rxFetch('http://tangledfruit.com/fail.txt').text();

      expectOnlyError(fetchResult, done,
        function (error) {
          expect(error).to.be.an.instanceof(Error);
          expect(error.message).to.match(/^HTTP Error 404:/);
          expect(error.response.status).to.equal(404);
          expect(error.response.url).to.equal("http://tangledfruit.com/fail.txt");
        });

    });

  });

  //----------------------------------------------------------------------------

  describe('.json()', function() {

    nock('http://tangledfruit.com')
      .get('/json.txt')
      .reply(200, '{"x":["hello", "world", 42]}');

    it('should return an Observable which yields the body of the response as parsed JSON', function (done) {

      const jsonResult = rxFetch('http://tangledfruit.com/json.txt').json();

      expectOneResult(jsonResult, done,
        ((textResult) => {
          expect(textResult).to.deep.equal({"x": ["hello", "world", 42]});
        }));

    });

    //--------------------------------------------------------------------------

    it('should yield an error result if called a second time', function (done) {

      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const fetchResult = rxFetch('http://tangledfruit.com/fail.txt').json();

      expectOnlyError(fetchResult, done,
        function (error) {
          expect(error).to.be.an.instanceof(Error);
          expect(error.message).to.match(/^HTTP Error 404:/);
          expect(error.response.status).to.equal(404);
          expect(error.response.url).to.equal("http://tangledfruit.com/fail.txt");
        });

    });

  });

});
