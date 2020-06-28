import React, { forwardRef } from 'react';
import BTC from '../common/Bitcoin';
import { round_to } from '../../util/math';

export const toTickerChannel = (instrument_name) => {
  return `ticker.${instrument_name}.100ms`;
};

export const TableContainer = ({ children, className = '', ...props }) => (
  <div
    className={`w3-margin w3-padding w3-theme-d1 my-round w3-card my-order-table ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const Table = ({ children, className = '', ...props }) => (
  <table className={`w3-table w3-centered ${className}`} {...props}>
    {children}
  </table>
);

export const OptionPrice = ({ price, underlying_price }) => (
  <>
    <div className="my-no-wrap">
      <BTC />
      {price.toFixed(4)}
    </div>
    {underlying_price && (
      <div>
        <small>(${round_to(price * underlying_price, 2)})</small>
      </div>
    )}
  </>
);

export const RadioGroup = ({ options, value: checked, setValue, ...props }) => {
  return Object.entries(options).map(([name, value]) => (
    <label key={name} className="w3-mobile my-radio-group-label">
      <span className="my-no-wrap">
        <input
          checked={checked === value}
          onChange={() => setValue(value)}
          type="radio"
          className="my-radio"
          {...props}
        />{' '}
        {name.toLowerCase()}{' '}
      </span>
    </label>
  ));
};

export const DeleteButton = ({ className = '', ...props }) => (
  <i
    className={`fas fa-trash-alt my-margin-lr my-pointer my-opaquer-fader fa-sm ${className}`}
    {...props}
  />
);

export const NumericalInput = forwardRef(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      type="number"
      min="1"
      max="99999"
      step="0.5"
      className={`w3-input my-small-input ${className}`}
      {...props}
    />
  )
);
