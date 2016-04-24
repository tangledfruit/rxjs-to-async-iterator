'use strict';

const Rx = require('rxjs');

const doneSentinel = {};

/**
 * Accepts an RxJS Observable object and converts it to an ES6 generator
 * function yielding the same results.
 */

const toAsyncIterator = module.exports = function *(observable) {
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

  observable.subscribe(
    value => produce({err: null, value: value}),
    err => produce({err: err, value: null}),
    () => produce({err: null, value: doneSentinel}));

  // TO DO: What should we do with subscriptionHandle?
  // IOW, how to detect if client loses interest?

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

  while (!isDone) {
    yield consumeViaCallback();
  }
};

toAsyncIterator.prototype.nextValue = function *() {
  let item = yield this.next();
  if (item.value === doneSentinel) {
    throw new Error('Expected next notification, got complete instead');
  }
  return item.value;
};

toAsyncIterator.prototype.shouldComplete = function *() {
  let item = yield this.next();
  if (item.value !== doneSentinel) {
    throw new Error('Expected complete notification, got next(' + item.value + ') instead');
  }
};

toAsyncIterator.prototype.shouldThrow = function *() {
  let item;

  try {
    item = yield this.next();
  } catch (err) {
    return err;
  }

  if (item.value === doneSentinel) {
    throw new Error('Expected error notification, got complete instead');
  } else {
    throw new Error('Expected error notification, got next(' + item.value + ') instead');
  }
};

Rx.Observable.prototype.shouldBeEmpty = function *() {
  yield this.toAsyncIterator().shouldComplete();
};

Rx.Observable.prototype.shouldGenerateOneValue = function *() {
  let iterator = this.toAsyncIterator();
  let value = yield iterator.nextValue();
  yield iterator.shouldComplete();
  return value;
};

Rx.Observable.prototype.shouldThrow = function *() {
  let err = yield this.toAsyncIterator().shouldThrow();
  return err;
};

/**
 * Define a toAsyncIterator operator on Rx.Observable.
 */

Rx.Observable.prototype.toAsyncIterator = function () {
  return toAsyncIterator(this);
};
