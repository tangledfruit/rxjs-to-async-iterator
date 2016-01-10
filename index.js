'use strict';

const Rx = require('rx');

//------------------------------------------------------------------------------
/**
 * Accepts an RxJS Observable object and converts it to an ES6 generator
 * function yielding the same results.
 */

const toAsyncIterator = module.exports = function* (observable) {

  // TO DO: Error validation.

  const doneSentinel = {};

  let pendingCallback;
  let pendingValues = [];
    // TO DO: Look for a more efficient queue implementation.

  const callTheCallback = function (callback, pendingValue) {
//console.log("cbcb received err = ", pendingValue.err, "  value = ", pendingValue.value);
    callback(pendingValue.err, pendingValue.value);
  };

  const produce = function (pendingValue) {

//console.log("produce received err = ", pendingValue.err, "  value = ", pendingValue.value,
//  pendingCallback ? " HAS PENDING CALLBACK" : "");

    if (pendingCallback) {
      const cb = pendingCallback;
      pendingCallback = null;
      callTheCallback(cb, pendingValue);
    } else {
      pendingValues.push(pendingValue);
    }

  };

  const subscriptionHandle = observable.subscribe(
    (value) => produce({err: null, value: value}),
    (err) => produce({err: err, value: null}),
    () => produce({err: null, value: doneSentinel}));

  // TO DO: What do we do with subscriptionHandle?
  // IOW, how to detect if client loses interest?

  let isDone = false;

  const consume = function (item) {

//console.log( "consume processing err = ", item.err, "  value = ", item.value );
    if (item.err) {
      throw item.err;
    } else if (item.value === doneSentinel) {
      isDone = true;
    } else {
      return item.value;
    }

  };

  const waitThenConsume = function () {

    if (pendingCallback) {
      throw new Error("waitThenConsume called when callback already present");
    }

    return function (cb) {
      pendingCallback = cb;
    };

  };

  while (!isDone) {

    // Consume any queued items while we have them.

    while (!isDone) {
      let item = pendingValues.shift();
      if (item === undefined) {
        break;
      } else {
        const nextValue = consume(item);
        if (!isDone) {
          yield nextValue;
        }
      }
    }

    // No more queued items; wait for next item.

    if (!isDone) {
      yield waitThenConsume();
    }

  }

};

//------------------------------------------------------------------------------
/**
 * Define a toAsyncIterator operator on Rx.Observable.
 */

Rx.Observable.prototype.toAsyncIterator = function () {

  return toAsyncIterator(this);
  
};
