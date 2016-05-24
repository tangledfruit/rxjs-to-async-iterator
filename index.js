'use strict';

const Rx = require('rxjs');

const doneSentinel = {};

/**
 * Accepts an RxJS Observable object and converts it to an ES6 generator
 * function yielding the same results.
 */

class AsyncIterator {
  constructor (observable) {
    this._observable = observable;
  }

  * iter () {
    let isDone = false;

    let pendingCallback;
    let pendingValues = [];
      // TO DO: Look for a more efficient queue implementation.

    const callTheCallback = (callback, pendingValue) => {
      if (pendingValue.value === doneSentinel) {
        isDone = true;
      }
      callback(pendingValue.err, pendingValue.value);
    };

    const produce = pendingValue => {
      if (pendingCallback) {
        const cb = pendingCallback;
        pendingCallback = null;
        callTheCallback(cb, pendingValue);
      } else {
        pendingValues.push(pendingValue);
      }
    };

    this._subscribeHandle = this._observable.subscribe(
      value => produce({err: null, value: value}),
      err => produce({err: err, value: null}),
      () => produce({err: null, value: doneSentinel}));

    const consumeViaCallback = () => {
      return cb => {
        let item = pendingValues.shift();
        if (item === undefined) {
          pendingCallback = cb;
        } else {
          callTheCallback(cb, item);
        }
      };
    };

    while (!isDone) { // eslint-disable-line no-unmodified-loop-condition
                      // isDone gets modified in callTheCallback, above.
      yield consumeViaCallback();
    }
  }

  makeIter () {
    let result = this.iter();

    result.nextValue = function * () {
      let item = yield this._iter.next();
      if (item.value === doneSentinel) {
        throw new Error('Expected next notification, got complete instead');
      }
      return item.value;
    }.bind(this);

    result.shouldComplete = function * () {
      let item = yield this._iter.next();
      if (item.value !== doneSentinel) {
        throw new Error('Expected complete notification, got next(' + item.value + ') instead');
      }
    }.bind(this);

    result.shouldThrow = function * () {
      let item;

      try {
        item = yield this._iter.next();
      } catch (err) {
        return err;
      }

      if (item.value === doneSentinel) {
        throw new Error('Expected error notification, got complete instead');
      } else {
        throw new Error('Expected error notification, got next(' + item.value + ') instead');
      }
    }.bind(this);

    result.unsubscribe = function () {
      if (this._subscribeHandle === undefined) {
        throw new Error('toAsyncIterator: unsubscribing before first yield not allowed');
      }

      // Quietly ignore second unsubscribe attempt.

      if (this._subscribeHandle) {
        this._subscribeHandle.unsubscribe();
        this._subscribeHandle = false;
      }
    }.bind(this);

    this._iter = result;
    return result;
  }
}

Rx.Observable.prototype.shouldBeEmpty = function * () {
  yield this.toAsyncIterator().shouldComplete();
};

Rx.Observable.prototype.shouldGenerateOneValue = function * () {
  let iterator = this.toAsyncIterator();
  let value = yield iterator.nextValue();
  yield iterator.shouldComplete();
  return value;
};

Rx.Observable.prototype.shouldThrow = function * () {
  let err = yield this.toAsyncIterator().shouldThrow();
  return err;
};

/**
 * Define a toAsyncIterator operator on Rx.Observable.
 */

Rx.Observable.prototype.toAsyncIterator = function () {
  const iter = new AsyncIterator(this);
  return iter.makeIter();
};
