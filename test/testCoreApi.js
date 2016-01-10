'use strict';

require('co-mocha');
const Rx = require('rx');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const toAsyncIterator = require('../index');

//------------------------------------------------------------------------------

describe("rx-to-async-iterator", function () {

  it("should be defined as a function", function () {
    expect(toAsyncIterator).to.be.a('function');
      // WARNING: We don't test this API independently. It might go away.
  });

  it("should patch Rx.Observable to add toAsyncIterator operator", function () {
    expect(Rx.Observable.prototype.toAsyncIterator).to.be.a('function');
  });

  //----------------------------------------------------------------------------

  it("can convert a simple Observable into a generator", function* () {

    const iter = Rx.Observable.timer(200, 100).take(3).toAsyncIterator();

    expect(yield iter.next().value).to.equal(0);
    expect(yield iter.next().value).to.equal(1);
    expect(yield iter.next().value).to.equal(2);

    const lastObs = yield iter.next();
    expect(lastObs.value).to.equal(undefined);
    expect(lastObs.done).to.equal(true);

  });

});
