'use strict';

require('co-mocha');
require('rx-to-async-iterator');

const Rx = require('rx');
const expect = require('chai').expect;
const nock = require('nock');
const rxFetch = require('../lib/rx-fetch');

const good = 'hello world. 你好世界。';
const bad = 'good bye cruel world. 再见残酷的世界。';

describe('rx-fetch', () => {
  it('should be defined', () => {
    expect(fetch).to.be.a('function');
  });

  it('should return an Observable which yields a single Response object', function * () {
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

  it('should not start work until the Observable has been subscribed to', function * () {
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

  it('should disallow a second subscription to the Observable', function * () {
    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    yield fetchResult.shouldGenerateOneValue();

    expect((yield fetchResult.shouldThrow()).message).to.equal('can not subscribe to rx-fetch result more than once');
  });

  it('should allow you to post with a request body', function * () {
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

  it('should catch any error and convert that to an Observable error', function * () {
    nock('http://tangledfruit.com')
      .post('/post.txt', "Yo, what's up?")
      .replyWithError('simulated network failure');

    yield rxFetch('http://tangledfruit.com/post.txt',
      {
        method: 'post',
        body: "Yo, what's up?"
      })
      .shouldThrow(/simulated network failure/);
  });

  describe('response.text()', () => {
    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    it('should return an Observable which yields the body of the response as a string', function * () {
      const textResult = yield fetchResult
        .flatMapLatest(response => response.text())
        .shouldGenerateOneValue();
      expect(textResult).to.equal(good);
    });

    it('should yield an error result if called a second time', function * () {
      const textResult = yield fetchResult
        .flatMapLatest(response => response.text())
        .shouldThrow();
      expect(textResult.message).to.equal('can not subscribe to rx-fetch result more than once');
    });
  });

  describe('response.json()', () => {
    nock('http://tangledfruit.com')
      .get('/json.txt')
      .reply(200, '{"x":["hello", "world", 42]}');

    const fetchResult = rxFetch('http://tangledfruit.com/json.txt');

    it('should return an Observable which yields the body of the response as parsed JSON', function * () {
      const jsonResult = yield fetchResult
        .flatMapLatest(response => response.json())
        .shouldGenerateOneValue();
      expect(jsonResult).to.deep.equal({x: ['hello', 'world', 42]});
    });

    it('should yield an error result if called a second time', function * () {
      const jsonResult = yield fetchResult
        .flatMapLatest(response => response.json())
        .shouldThrow();
      expect(jsonResult.message).to.equal('can not subscribe to rx-fetch result more than once');
    });
  });

  it('should still resolve with a Response object if the request fails', function * () {
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

  it('should record a simple request and response to an Rx.Subject', function * () {
    // This option is more thoroughly tested below under .recordTo.
    nock('http://tangledfruit.com')
      .get('/succeed.txt')
      .reply(200, good);

    const nockRecord = new Rx.ReplaySubject();
    yield rxFetch('http://tangledfruit.com/succeed.txt', {recordTo: nockRecord}).text().shouldGenerateOneValue();
    nockRecord.onCompleted();

    const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
    expect(nockReplay).to.deep.equal([
      "nock('http://tangledfruit.com')",
      "  .get('/succeed.txt')",
      "  .reply(200, 'hello world. 你好世界。')"]);
  });

  describe('.failOnHttpError()', () => {
    it('should return an Observable which yields a single Response object on HTTP success', function * () {
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

    it('should yield on onError notification if the request fails', function * () {
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

    it('should return an Observable which yields a single Response object on HTTP success', function * () {
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

    it('should yield on onError notification if the request fails', function * () {
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
    it('should return an Observable which yields the body of the response as a string', function * () {
      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const textResult = yield rxFetch('http://tangledfruit.com/succeed.txt').text().shouldGenerateOneValue();
      expect(textResult).to.equal(good);
    });

    it('should yield an error result if HTTP request fails', function * () {
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

    it('should return an Observable which yields the body of the response as parsed JSON', function * () {
      const jsonResult = yield rxFetch('http://tangledfruit.com/json.txt').json().shouldGenerateOneValue();
      expect(jsonResult).to.deep.equal({x: ['hello', 'world', 42]});
    });

    it('should yield an error result if called a second time', function * () {
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

  describe('.recordTo()', () => {
    it('should record a simple request and response to an Rx.Subject', function * () {
      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, good);

      const nockRecord = new Rx.ReplaySubject();
      yield rxFetch('http://tangledfruit.com/succeed.txt').recordTo(nockRecord).text().shouldGenerateOneValue();
      nockRecord.onCompleted();

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .get('/succeed.txt')",
        "  .reply(200, 'hello world. 你好世界。')"]);
    });

    it('should record a request with a non-standard HTTP verb', function * () {
      nock('http://tangledfruit.com')
        .intercept('/succeed.txt', 'mumble')
        .reply(200, good);

      const nockRecord = new Rx.ReplaySubject();
      yield rxFetch('http://tangledfruit.com/succeed.txt', {method: 'mumble'}).recordTo(nockRecord).text().shouldGenerateOneValue();
      nockRecord.onCompleted();

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .intercept('mumble', '/succeed.txt')",
        "  .reply(200, 'hello world. 你好世界。')"]);
    });

    it('should record a request with query string', function * () {
      nock('http://tangledfruit.com')
        .intercept('/succeed.txt?really=yes', 'mumble')
        .reply(200, good);

      const nockRecord = new Rx.ReplaySubject();
      yield rxFetch('http://tangledfruit.com/succeed.txt?really=yes#ok,maybe', {method: 'mumble'}).recordTo(nockRecord).text().shouldGenerateOneValue();
      nockRecord.onCompleted();

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .intercept('mumble', '/succeed.txt?really=yes')",
        "  .reply(200, 'hello world. 你好世界。')"]);
    });

    it('should escape a string in response body', function * () {
      nock('http://tangledfruit.com')
        .get('/succeed.txt')
        .reply(200, "Shouldn't we be smart about quotes?");

      const nockRecord = new Rx.ReplaySubject();
      yield rxFetch('http://tangledfruit.com/succeed.txt').recordTo(nockRecord).text().shouldGenerateOneValue();
      nockRecord.onCompleted();

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .get('/succeed.txt')",
        "  .reply(200, 'Shouldn\\'t we be smart about quotes?')"]);
    });

    it('should record post with a request body', function * () {
      nock('http://tangledfruit.com')
        .post('/post.txt', "Yo, what's up?")
        .reply(200, good);

      const nockRecord = new Rx.ReplaySubject();
      yield rxFetch('http://tangledfruit.com/post.txt',
        {
          method: 'post',
          body: "Yo, what's up?"
        }).recordTo(nockRecord).text().shouldGenerateOneValue();
      nockRecord.onCompleted();

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .post('/post.txt', 'Yo, what\\'s up?')",
        "  .reply(200, 'hello world. 你好世界。')"]);
    });

    it('should record body text even when calling .json', function * () {
      nock('http://tangledfruit.com')
        .get('/json.txt')
        .reply(200, '{"x":["hello", "world", 42]}');

      const nockRecord = new Rx.ReplaySubject();
      const fetchResult = rxFetch('http://tangledfruit.com/json.txt');

      const jsonResult = yield fetchResult
        .recordTo(nockRecord)
        .flatMapLatest(response => response.json())
        .shouldGenerateOneValue();
      expect(jsonResult).to.deep.equal({x: ['hello', 'world', 42]});
      nockRecord.onCompleted();

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .get('/json.txt')",
        "  .reply(200, '{\"x\":[\"hello\", \"world\", 42]}')"]);
    });

    it('should record a failed request', function * () {
      nock('http://tangledfruit.com')
        .get('/fail.txt')
        .reply(404, bad);

      const fetchResult = rxFetch('http://tangledfruit.com/fail.txt');

      const nockRecord = new Rx.ReplaySubject();
      const textResult = yield fetchResult
        .recordTo(nockRecord)
        .flatMapLatest(response => response.text())
        .shouldGenerateOneValue();
      nockRecord.onCompleted();

      expect(textResult).to.equal(bad);

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .get('/fail.txt')",
        "  .reply(404, 'good bye cruel world. 再见残酷的世界。')"]);
    });

    it('should record content of a failed request when .text() is used', function * () {
      nock('http://tangledfruit.com')
        .get('/fail2.txt')
        .reply(404, 'No such luck!');

      const fetchResult = rxFetch('http://tangledfruit.com/fail2.txt');

      const nockRecord = new Rx.ReplaySubject();
      const error = yield fetchResult
        .recordTo(nockRecord)
        .text()
        .shouldThrow();
      nockRecord.onCompleted();

      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.match(/^HTTP Error 404:/);
      expect(error.response.status).to.equal(404);
      expect(error.response.url).to.equal('http://tangledfruit.com/fail2.txt');

      const nockReplay = yield nockRecord.toArray().shouldGenerateOneValue();
      expect(nockReplay).to.deep.equal([
        "nock('http://tangledfruit.com')",
        "  .get('/fail2.txt')",
        "  .reply(404, 'No such luck!')"]);
    });
  });
});
