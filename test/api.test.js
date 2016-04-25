'use strict';

require('co-mocha');
require('rxjs-to-async-iterator');

const expect = require('chai').expect;
const nock = require('nock');
const rxFetch = require('../lib/rx-fetch');

const good = 'hello world. 你好世界。';
const bad = 'good bye cruel world. 再见残酷的世界。';

describe('rxjs-fetch', () => {
  it('should be defined', () => {
    expect(fetch).to.be.a('function');
  });

  it('should return an Observable which yields a single Response object', function *() {
    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const result = yield rxFetch('http://tangledfruit.com/succeed.txt').shouldGenerateOneValue();

    expect(result.status).to.equal(200);
    expect(result.ok).to.equal(true);
    expect(result.statusText).to.equal('OK');
    expect(typeof (result.headers)).to.equal('object');
    expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
  });

  it('should not start work until the Observable has been subscribed to', function *() {
    const scope = nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    expect(scope.isDone()).to.equal(false);

    const result = yield fetchResult.shouldGenerateOneValue();

    expect(result.status).to.equal(200);
    expect(result.ok).to.equal(true);
    expect(result.statusText).to.equal('OK');
    expect(typeof (result.headers)).to.equal('object');
    expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
  });

  it('should disallow a second subscription to the Observable', function *() {
    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    yield fetchResult.shouldGenerateOneValue();

    expect((yield fetchResult.shouldThrow()).message).to.equal('can not subscribe to rxjs-fetch result more than once');
  });

  it('should allow you to post with a request body', function *() {
    nock('http://tangledfruit.com')
      .post('/post.txt', "Yo, what's up?")
      .reply(200, good);

    const result = yield rxFetch('http://tangledfruit.com/post.txt',
      {
        method: 'post',
        body: "Yo, what's up?"
      }).shouldGenerateOneValue();

    expect(result.status).to.equal(200);
    expect(result.ok).to.equal(true);
    expect(result.statusText).to.equal('OK');
    expect(typeof (result.headers)).to.equal('object');
    expect(result.url).to.equal('http://tangledfruit.com/post.txt');
  });

  describe('response.text()', () => {
    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    it('should return an Observable which yields the body of the response as a string', function *() {
      const textResult = yield fetchResult
        .switchMap(response => response.text())
        .shouldGenerateOneValue();
      expect(textResult).to.equal(good);
    });

    it('should yield an error result if called a second time', function *() {
      const textResult = yield fetchResult
        .switchMap(response => response.text())
        .shouldThrow();
      expect(textResult.message).to.equal('can not subscribe to rxjs-fetch result more than once');
    });
  });

  describe('response.json()', () => {
    nock('http://tangledfruit.com')
      .get('/json.txt')
      .reply(200, '{"x":["hello", "world", 42]}');

    const fetchResult = rxFetch('http://tangledfruit.com/json.txt');

    it('should return an Observable which yields the body of the response as parsed JSON', function *() {
      const jsonResult = yield fetchResult
        .switchMap(response => response.json())
        .shouldGenerateOneValue();
      expect(jsonResult).to.deep.equal({x: ['hello', 'world', 42]});
    });

    it('should yield an error result if called a second time', function *() {
      const jsonResult = yield fetchResult
        .switchMap(response => response.json())
        .shouldThrow();
      expect(jsonResult.message).to.equal('can not subscribe to rxjs-fetch result more than once');
    });
  });

  it('should still resolve with a Response object if the request fails', function *() {
    nock('http://tangledfruit.com')
      .get('/fail.txt')
      .reply(404, bad);

    const result = yield rxFetch('http://tangledfruit.com/fail.txt').shouldGenerateOneValue();

    expect(result.status).to.equal(404);
    expect(result.ok).to.equal(false);
    expect(result.statusText).to.equal('Not Found');
    expect(typeof (result.headers)).to.equal('object');
    expect(result.url).to.equal('http://tangledfruit.com/fail.txt');
  });

  describe('.failOnHttpError()', () => {
    it('should return an Observable which yields a single Response object on HTTP success', function *() {
      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const result = yield rxFetch('http://tangledfruit.com/succeed.txt')
        .failOnHttpError()
        .shouldGenerateOneValue();

      expect(result.status).to.equal(200);
      expect(result.ok).to.equal(true);
      expect(result.statusText).to.equal('OK');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
    });

    it('should yield an error notification if the request fails', function *() {
      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const error = yield rxFetch('http://tangledfruit.com/fail.txt')
        .failOnHttpError()
        .shouldThrow();

      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.match(/^HTTP Error 404:/);
      expect(error.response.status).to.equal(404);
      expect(error.response.url).to.equal('http://tangledfruit.com/fail.txt');
    });
  });

  describe('.failIfStatusNotIn()', () => {
    it('should fail if acceptableStatusCodes is not an array', () => {
      expect(() => {
        rxFetch('http://tangledfruit.com/succeed.txt').failIfStatusNotIn(404);
      }).to.throw('acceptableStatusCodes must be an Array');
    });

    it('should return an Observable which yields a single Response object on HTTP success', function *() {
      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const result = yield rxFetch('http://tangledfruit.com/succeed.txt')
        .failIfStatusNotIn([200])
        .shouldGenerateOneValue();

      expect(result.status).to.equal(200);
      expect(result.ok).to.equal(true);
      expect(result.statusText).to.equal('OK');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
    });

    it('should yield an error notification if the request fails', function *() {
      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const error = yield rxFetch('http://tangledfruit.com/fail.txt')
        .failIfStatusNotIn([200, 400])
        .shouldThrow();

      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.match(/^HTTP Error 404:/);
      expect(error.response.status).to.equal(404);
      expect(error.response.url).to.equal('http://tangledfruit.com/fail.txt');
    });
  });

  describe('.text()', () => {
    it('should return an Observable which yields the body of the response as a string', function *() {
      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const textResult = yield rxFetch('http://tangledfruit.com/succeed.txt').text().shouldGenerateOneValue();
      expect(textResult).to.equal(good);
    });

    it('should yield an error result if HTTP request fails', function *() {
      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const error = yield rxFetch('http://tangledfruit.com/fail.txt').text().shouldThrow();

      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.match(/^HTTP Error 404:/);
      expect(error.response.status).to.equal(404);
      expect(error.response.url).to.equal('http://tangledfruit.com/fail.txt');
    });
  });

  describe('.json()', () => {
    nock('http://tangledfruit.com')
      .get('/json.txt')
      .reply(200, '{"x":["hello", "world", 42]}');

    it('should return an Observable which yields the body of the response as parsed JSON', function *() {
      const jsonResult = yield rxFetch('http://tangledfruit.com/json.txt').json().shouldGenerateOneValue();
      expect(jsonResult).to.deep.equal({x: ['hello', 'world', 42]});
    });

    it('should yield an error result if called a second time', function *() {
      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const error = yield rxFetch('http://tangledfruit.com/fail.txt').json().shouldThrow();

      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.match(/^HTTP Error 404:/);
      expect(error.response.status).to.equal(404);
      expect(error.response.url).to.equal('http://tangledfruit.com/fail.txt');
    });
  });
});
