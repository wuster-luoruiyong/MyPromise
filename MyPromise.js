/*
Promise 构造函数接收一个函数作为参数，这个函数被称为执行器（executor）。
这个执行器函数会立即被调用，并且它接收两个参数：
resolve：一个函数，用于将 Promise 的状态从 pending（等待）变为 fulfilled（已完成），并传递结果值。
reject：一个函数，用于将 Promise 的状态从 pending 变为 rejected（已拒绝），并传递错误原因
*/

// 定义三种状态
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function MyPromise(fn) {
  let self = this; // 保存this
  self.value = null; // 成功时的值
  self.error = null; // 失败时的原因
  self.status = PENDING; // promise状态
  self.onFulfilledCallbacks = []; // 成功时的回调
  self.onRejectedCallbacks = []; // 失败时的回调

  // resolve时执行成功回调
  function resolve(value) {
    if (value instanceof MyPromise) {
      return value.then(resolve, reject);
    }
    // 利用setTimeout特性将具体执行放到then之后
    // pending时执行
    if (self.status === PENDING) {
      setTimeout(() => {
        self.status = FULFILLED;
        self.value = value;
        self.onFulfilledCallbacks.forEach((callback) => callback(value));
      });
    }
  }

  // reject时执行失败回调
  function reject(error) {
    // 利用setTimeout特性将具体执行放到then之后
    // pending时执行
    if (self.status === PENDING) {
      setTimeout(() => {
        self.status = REJECTED;
        self.error = error;
        self.onRejectedCallbacks.forEach((callback) => callback(error));
      });
    }
  }

  try {
    fn(resolve, reject);
  } catch (e) {
    reject(e);
  }
}

// then方法接收两个参数，一个是成功时的回调，一个是失败时的回调，保存执行状态
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  const self = this;
  //防止使用者不传成功或失败回调函数，所以成功失败回调都给了默认回调函数
  onFulfilled =
    typeof onFulfilled === "function" ? onFulfilled : (value) => value;
  onRejected =
    typeof onRejected === "function"
      ? onRejected
      : (error) => {
          throw error;
        };
  // pending绑定回调函数
  if (this.status === PENDING) {
    // 返回一个promise，用于链式调用，并且将处理好的回调加入对应的处理队列
    const bridgePromise = new MyPromise((resolve, reject) => {
      self.onFulfilledCallbacks.push((value) => {
        try {
          let x = onFulfilled(value);
          resolvePromise(bridgePromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
      self.onRejectedCallbacks.push((error) => {
        try {
          let x = onRejected(error);
          resolvePromise(bridgePromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    });
    return bridgePromise;
  } else if (this.status === FULFILLED) {
    // fulfilled执行成功回调
    const bridgePromise = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          let x = onFulfilled(self.value);
          resolvePromise(bridgePromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    });
    return bridgePromise;
  } else if (this.status === REJECTED) {
    // rejected执行失败回调
    const bridgePromise = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          let x = onRejected(self.error);
          resolvePromise(bridgePromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    });
    return bridgePromise;
  }
  // 返回this，支持链式调用
  return this;
};

//catch方法其实是个语法糖，就是只传onRejected不传onFulfilled的then方法
MyPromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};

//用来解析回调函数的返回值x，x可能是普通值也可能是个promise对象
function resolvePromise(bridgePromise, x, resolve, reject) {
  //2.3.1规范，避免循环引用
  if (bridgePromise === x) {
    return reject(new TypeError("Circular reference"));
  }
  let called = false;

  //如果x是一个promise
  if (x instanceof MyPromise) {
    //如果这个promise是pending状态，就在它的then方法里继续执行resolvePromise解析它的结果，直到返回值不是一个pending状态的promise为止
    if (x.status === PENDING) {
      x.then(
        (y) => {
          resolvePromise(bridgePromise, y, resolve, reject);
        },
        (error) => {
          reject(error);
        }
      );
    } else {
      x.then(resolve, reject);
    }
    //如果x是一个普通值，就让bridgePromise的状态fulfilled，并把这个值传递下去
  } else if (x != null && (typeof x === "object" || typeof x === "function")) {
    try {
      // 是否是thenable对象（具有then方法的对象/函数）
      //2.3.3.1 将 then 赋为 x.then
      let then = x.then;
      if (typeof then === "function") {
        //2.3.3.3 如果 then 是一个函数，以x为this调用then函数，且第一个参数是resolvePromise，第二个参数是rejectPromise
        then.call(
          x,
          (y) => {
            if (called) return;
            called = true;
            resolvePromise(bridgePromise, y, resolve, reject);
          },
          (error) => {
            if (called) return;
            called = true;
            reject(error);
          }
        );
      } else {
        //2.3.3.4 如果 then不是一个函数，则 以x为值fulfill promise。
        resolve(x);
      }
    } catch (e) {
      //2.3.3.2 如果在取x.then值时抛出了异常，则以这个异常做为原因将promise拒绝。
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
}

try {
  module.exports = MyPromise;
} catch (e) {}


// promise方法实现
MyPromise.all = function(promises) {
  return new MyPromise(function(resolve, reject) {
      let result = [];
      let count = 0;
      for (let i = 0; i < promises.length; i++) {
          promises[i].then(function(data) {
              result[i] = data;
              if (++count == promises.length) {
                  resolve(result);
              }
          }, function(error) {
              reject(error);
          });
      }
  });
}

MyPromise.race = function(promises) {
  return new MyPromise(function(resolve, reject) {
      for (let i = 0; i < promises.length; i++) {
          promises[i].then(function(data) {
              resolve(data);
          }, function(error) {
              reject(error);
          });
      }
  });
}


MyPromise.resolve = function(value) {
  return new MyPromise(resolve => {
      resolve(value);
  });
}

MyPromise.reject = function(error) {
  return new MyPromise((resolve, reject) => {
      reject(error);
  });
}

MyPromise.allSettled = function(promises) {
  return new MyPromise(function(resolve, reject) {
      let result = [];
      let count = 0;
      let len = promises.length;
      for (let i = 0; i < len; i++) {
          promises[i].then(function(data) {
              result[i] = {
                  status: 'fulfilled',
                  value: data
              };
              if (++count == len) {
                  resolve(result);
              }
          }, function(error) {
              result[i] = {
                  status: 'rejected',
                  reason: error
                  };
              if (++count == len) {
                  resolve(result);
              }
          });
      }
  });
}



// 执行测试用例需要用到的代码
MyPromise.deferred = function () {
  let defer = {};
  defer.promise = new MyPromise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
};