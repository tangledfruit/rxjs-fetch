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

const mapResponseToText = function (response) {

	if (response.status >= 400)
    throw new Error("Bad server response");

	return response.text();

}

//------------------------------------------------------------------------------

describe('rx-fetch', function () {

	before(function () {

		nock('http://tangledfruit.com')
			.get('/succeed.txt')
			.reply(200, good);

		nock('http://tangledfruit.com')
			.get('/fail.txt')
			.reply(404, bad);

	});

	//----------------------------------------------------------------------------

	it('should be defined', function () {

		expect(fetch).to.be.a('function');

	});

	//----------------------------------------------------------------------------

	it('should facilitate the making of requests', function (done) {

		const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt')
      .flatMapLatest(mapResponseToText);

		expectOneResult(fetchResult, done,
			((result) => {
				expect(result).to.equal(good);
			}));

	});

	//----------------------------------------------------------------------------

	it('should do the right thing with bad requests', function (done) {

		const fetchResult = rxFetch('http://tangledfruit.com/fail.txt')
      .flatMapLatest(mapResponseToText);

		expectOnlyError(fetchResult, done,
			((err) => {
				expect(err.toString()).to.equal("Error: Bad server response");
			}));

	});

});
