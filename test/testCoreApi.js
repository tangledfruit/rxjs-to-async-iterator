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

  //----------------------------------------------------------------------------

  it("can convert a simple Observable into a generator", function* () {

    const obs = Rx.Observable.timer(200, 100).take(3);

    const oai = toAsyncIterator(obs);

    expect(yield oai.next().value).to.equal(0);
    expect(yield oai.next().value).to.equal(1);
    expect(yield oai.next().value).to.equal(2);

    const lastObs = yield oai.next();
    expect(lastObs.value).to.equal(undefined);
    expect(lastObs.done).to.equal(true);

  });

});
