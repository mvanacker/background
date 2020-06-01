// Based on Jaromanda X https://stackoverflow.com/questions/42429590/retry-on-javascript-promise-reject-a-limited-number-of-times-or-until-success
export const wait = (time) =>
  new Promise((resolve) => setTimeout(resolve, time || 1000));
export const retry = (
  promise,
  {
    tries = Infinity,
    delay = 1000,
    handler = (err, delay) => {
      console.error(err);
      console.error(`Retry in ${delay} ms...`);
    },
  } = {}
) =>
  promise.catch((err) => {
    handler(err, delay);
    return tries > 0
      ? wait(delay).then(() =>
          retry(promise, { tries: tries - 1, delay, handler })
        )
      : Promise.reject('Gave up.');
  });
