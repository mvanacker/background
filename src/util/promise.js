// Jaromanda X https://stackoverflow.com/questions/42429590/retry-on-javascript-promise-reject-a-limited-number-of-times-or-until-success
export const wait = (time) =>
  new Promise((resolve) => setTimeout(resolve, time || 0));
export const retry = (tries, promise, delay, handler) =>
  promise.catch((err) => {
    if (!handler) {
      handler = console.error;
    }
    handler(err);
    return tries > 0
      ? wait(delay).then(() => retry(tries - 1, promise, delay, handler))
      : Promise.reject('Gave up.');
  });
