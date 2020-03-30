import { stdNormalCDF, stdNormalInverseCDF } from "./util.math";

export function compute_d1(price, strike, volatility, time) {
  return (Math.log(price / strike) + volatility ** 2 / 2 * time)
         / (volatility * Math.sqrt(time));
}

export function compute_d2(d1, volatility, time) {
  return d1 - (volatility * Math.sqrt(time));
}

export function compute_prob_itm(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  return stdNormalCDF(Math.sign(strike - price) * d2);
}

export function compute_probs(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  const prob_itm = stdNormalCDF(Math.sign(strike - price) * d2);
  const prob_touch = 2 * prob_itm;
  const call = price * stdNormalCDF(d1) - strike * stdNormalCDF(d2);
  const prob_profit_call = 1 - compute_prob_itm(price, strike + call, volatility, time);
  const put = strike * stdNormalCDF(-d2) - price * stdNormalCDF(-d1);
  const prob_profit_put = 1 - compute_prob_itm(price, strike - put, volatility, time);
  return { prob_itm, prob_touch, prob_profit_put, prob_profit_call };
}

export function compute_reverse(price, strike, volatility, time, prob) {
  const r = volatility * Math.sqrt(time);
  const d2 = stdNormalInverseCDF(prob) / Math.sign(strike - price);
  return price * Math.exp(volatility ** 2 / 2 * time - (d2 + r) * r);
}

export function compute_call(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  return price * stdNormalCDF(d1) - strike * stdNormalCDF(d2);
}

export function compute_put(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  return strike * stdNormalCDF(-d2) - price * stdNormalCDF(-d1);
}
