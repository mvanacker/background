import { stdNormalCDF, stdNormalInverseCDF, stdNormalPDF } from './math';

export const d = (price, strike, volatility, time) => {
  const d1 =
    price === strike && time === 0
      ? 0
      : (Math.log(price / strike) + (volatility ** 2 / 2) * time) /
        (volatility * Math.sqrt(time));
  const d2 = d1 - volatility * Math.sqrt(time);
  return [d1, d2];
};

export const itm = (price, strike, volatility, time) => {
  const d2 = d(price, strike, volatility, time)[1];
  return stdNormalCDF(Math.sign(strike - price) * d2);
};

export const probs = (price, strike, volatility, time) => {
  const [d1, d2] = d(price, strike, volatility, time);
  const _itm = stdNormalCDF(Math.sign(strike - price) * d2);
  const touch = 2 * _itm;
  const call = price * stdNormalCDF(d1) - strike * stdNormalCDF(d2);
  const profit_call = 1 - itm(price, strike + call, volatility, time);
  const put = strike * stdNormalCDF(-d2) - price * stdNormalCDF(-d1);
  const profit_put = 1 - itm(price, strike - put, volatility, time);
  return { itm: _itm, touch, profit_put, profit_call };
};

export const reverse = (prob, strike, volatility, time) => {
  const vt = (volatility ** 2 / 2) * time;
  const svt = Math.sqrt(2 * vt);
  const d = stdNormalInverseCDF(prob) + svt;
  const p1 = strike * Math.exp(d * svt - vt);
  const p2 = strike * Math.exp(-(d * svt - vt));
  return [p1, p2];
};

export const call = (price, strike, volatility, time) => {
  const [d1, d2] = d(price, strike, volatility, time);
  return price * stdNormalCDF(d1) - strike * stdNormalCDF(d2);
};

export const put = (price, strike, volatility, time) => {
  const [d1, d2] = d(price, strike, volatility, time);
  return strike * stdNormalCDF(-d2) - price * stdNormalCDF(-d1);
};

export const premium = { call, put };

export const vega = (price, strike, volatility, time) => {
  const d1 = d(price, strike, volatility, time)[0];
  return price * Math.sqrt(time) * stdNormalPDF(d1);
};

export const vega_alt = (price, strike, volatility, time) => {
  const d2 = d(price, strike, volatility, time)[1];
  return strike * Math.sqrt(time) * stdNormalPDF(d2);
};

export const iv = {
  call: (price, strike, time, premium) =>
    iv_newton(price, strike, time, premium, call),
  put: (price, strike, time, premium) =>
    iv_newton(price, strike, time, premium, put),
};

const iv_newton = (
  price,
  strike,
  time,
  premium,
  premiumFunc,
  {
    maxIterations = 20,
    desiredPrecision = 1e-4,
    bound = { lower: 0, upper: 5 },
  } = {}
) => {
  const df = (iv) => vega(price, strike, iv, time);
  const f = (iv) => premiumFunc(price, strike, iv, time);

  // Initial guess
  let iv0 = estimate_iv(price, time, premium);

  // Short circuit IV above upper bound (default 500%)
  if (f(bound.upper) < premium) return bound.upper;

  // Short circuit IV below lower bound (default 0)
  if (f(bound.lower) > premium) return bound.lower;

  // Newton-Raphson
  for (let i = 0; i < maxIterations; i++) {
    const f0 = premium - f(iv0);
    let iv1 = iv0 + f0 / df(iv0);

    // Bisection step if IV goes out of bounds
    if (iv1 < bound.lower) {
      iv1 = (iv0 - bound.lower) / 2;
    } else if (iv1 > bound.upper) {
      iv1 = (iv0 + bound.upper) / 2;
    }

    // Stop when desired precision is reached or something went wrong
    if (Math.abs(f0) < desiredPrecision || isNaN(iv1)) {
      return iv1;
    }

    // Else continue
    iv0 = iv1;
  }
  console.warn(`IV calculation reached max iterations (${maxIterations}).`);
  return iv0;
};

// Brenner and Subrahmanyam DOI: 10.2469/faj.v44.n5.80 https://www.researchgate.net/publication/245065192_A_Simple_Formula_to_the_Implied_Standard_Deviation
const estimate_iv = (price, time, premium) => {
  return (Math.sqrt((2 * Math.PI) / time) * premium) / price;
};
