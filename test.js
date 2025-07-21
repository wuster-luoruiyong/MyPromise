import MyPromise from "./MyPromise.js";
import fs from "fs";

// 异步成功测试
const p1 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve("Hello World");
  }, 1000);
}).then((value) => {
  console.log(value);
});

// 异步失败测试
const p2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject("Hello Error");
  }, 1000);
}).then(null, (error) => {
  console.log(error);
});

// 同步任务测试（基础版会报错-原因是resolve时还未绑定回调函数）
// 根据事件循环->同步->异步->微任务->宏任务，所以同步任务会先执行，而此时resolve还未绑定回调函数，所以会报错
// 解决方法是，将resolve和reject函数保存起来，当then方法执行时再执行resolve和reject函数也就是封装成宏任务
const p3 = new MyPromise((resolve, reject) => {
  resolve("sync task");
}).then((value) => {
  console.log(value);
});

// 链式同步
const p4 = new MyPromise((resolve, reject) => {
  resolve(1);
})
  .then((value) => {
    if (value === 1) {
      console.log(value);
    }
  })
  .then(
    (value) => {
      console.log(value);
    },
    (value) => {
      console.log(value + 1);
    }
  );

// 链式异步
let p5 = new MyPromise((resolve, reject) => {
  fs.readFile("./file/1.txt", "utf8", function (err, data) {
    err ? reject(err) : resolve(data);
  });
});
let f1 = function (data) {
  console.log(data);
  return new MyPromise((resolve, reject) => {
    fs.readFile("./file/2.txt", "utf8", function (err, data) {
      err ? reject(err) : resolve(data);
    });
  });
};
let f2 = function (data) {
  console.log(data);
  return new MyPromise((resolve, reject) => {
    fs.readFile("./file/3.txt", "utf8", function (err, data) {
      err ? reject(err) : resolve(data);
    });
  });
};
let f3 = function (data) {
  console.log(data);
};
let errorLog = function (error) {
  console.log(error);
};
p5.then(f1).then(f2).then(f3).catch(errorLog);
