import React, { useEffect, useState } from 'react';
import moment from 'moment';

import BTC from '../common/Bitcoin';
import { DoubleDown, DoubleUp } from '../common/Icons';
import { useLocal } from '../../hooks/useStorage';

import {
  toTickerChannel,
  OptionPrice,
  RadioGroup,
  DeleteButton,
  NumericalInput,
} from './Common';

export default ({
  deribit,
  selectedOptions,
  setSelectedOptions,
  instruments,
  setAnalysisPositions,
  ...props
}) => {
  // Delete option from the basket
  const deleteOption = (instrument_name) => () => {
    setSelectedOptions((selection) => {
      const newSelection = new Set(selection);
      newSelection.delete(instrument_name);
      return newSelection;
    });
  };

  // Basket items state
  const withPrefix = (id) => `deribit-option-basket-${id}`;
  const [quantities, setQuantities] = useLocal(withPrefix('quantities'), {
    initialValue: {},
  });
  const [prices, setPrices] = useLocal(withPrefix('prices'), {
    initialValue: {},
  });
  const [sides, setSides] = useLocal(withPrefix('sides'), { initialValue: {} });
  const [labels, setLabels] = useLocal(withPrefix('labels'), {
    initialValue: {},
  });

  // Setters [TODO redux?]
  const immutate = (setter) => (instrument_name) => (value) => {
    setter((object) => {
      const newObject = { ...object };
      newObject[instrument_name] = value;
      return newObject;
    });
  };
  const setQuantity = immutate(setQuantities);
  const setPrice = immutate(setPrices);
  const setSide = immutate(setSides);
  const setLabel = immutate(setLabels);

  // Order
  const requestOrder = (instrument_name) => {
    const side = sides[instrument_name] === 0 ? 'buy' : 'sell';
    deribit.send({
      method: `private/${side}`,
      params: {
        instrument_name,
        amount: quantities[instrument_name],
        price: prices[instrument_name],
        label: labels[instrument_name],
        post_only: true,
        post_only_reject: true,
      },
    });
  };

  const order = (instrument_name) => () => {
    deleteOption(instrument_name)();
    requestOrder(instrument_name);
  };

  const orderAll = () => {
    const names = new Set(selectedOptions);
    setSelectedOptions(new Set());
    names.forEach(requestOrder);
  };

  // Visibility
  const [visible, setVisible] = useLocal(withPrefix('visibility'), {
    initialValue: true,
  });

  // Render basket
  return !visible ? (
    <div className="w3-theme-l1 my-round-top my-transition my-pointer my-white-glow my-option-basket-show">
      <DoubleUp
        title={`Show ${selectedOptions.size} options`}
        onClick={() => setVisible(true)}
      />
    </div>
  ) : (
    <div className="my-option-basket-outer-container" {...props}>
      <div className="w3-card w3-theme-l1 my-round my-option-basket-inner-container">
        <table className="w3-table w3-centered w3-striped-l2 my-option-basket">
          <thead className="my-sticky-thead">
            <tr className="w3-theme-l1">
              <th>
                <div
                  className="w3-theme-l2 my-round my-transition my-pointer my-white-glow my-option-basket-hide"
                  onClick={() => setVisible(false)}
                >
                  <DoubleDown title="Hide" />
                </div>
              </th>
              <th>Expiration</th>
              <th>Strike</th>
              <th>Type</th>
              <th>Bid</th>
              <th>Ask</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Side</th>
              <th>Label</th>
              <th>
                <OrderAllOptionsButton onClick={() => {}}>
                  Analyze all
                </OrderAllOptionsButton>
              </th>
              <th>
                <OrderAllOptionsButton onClick={orderAll}>
                  Order all
                </OrderAllOptionsButton>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(selectedOptions).map((instrument_name) => (
              <OptionBasketRow
                deribit={deribit}
                key={instrument_name}
                instrument={instruments[instrument_name]}
                deleteOption={deleteOption}
                quantity={quantities[instrument_name]}
                setQuantity={setQuantity(instrument_name)}
                price={prices[instrument_name]}
                setPrice={setPrice(instrument_name)}
                side={sides[instrument_name]}
                setSide={setSide(instrument_name)}
                label={labels[instrument_name]}
                setLabel={setLabel(instrument_name)}
                order={order(instrument_name)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OptionBasketRow = ({
  deribit,
  instrument: {
    instrument_name,
    expiration_timestamp,
    strike,
    option_type,
    min_trade_amount,
    tick_size,
  },
  deleteOption,
  quantity,
  setQuantity,
  price,
  setPrice,
  side,
  setSide,
  label,
  setLabel,
  order,
  ...props
}) => {
  // Subscribe to this option's ticker
  const [ticker, setTicker] = useState(null);
  useEffect(() => {
    const sub = {
      [toTickerChannel(instrument_name)]: ({ data }) => setTicker(data),
    };
    deribit.publicSubscribe(sub);
    return () => deribit.publicUnsubscribe(sub);
  }, [deribit, instrument_name]);

  if (!ticker) return null;
  const { best_bid_price, best_ask_price, mark_price } = ticker;

  return (
    <tr className="w3-hover-theme" {...props}>
      <td>
        <DeleteButton onClick={deleteOption(instrument_name)} />
      </td>
      <td>{moment(expiration_timestamp).format('MMMM Do, YYYY')}</td>
      <td>{strike}</td>
      <td>{option_type}</td>
      <td>
        <OptionPrice price={best_bid_price} />
      </td>
      <td>
        <OptionPrice price={best_ask_price} />
      </td>
      <td>
        <NumericalInput
          min={min_trade_amount}
          step={min_trade_amount}
          value={quantity ? quantity : ''}
          onChange={(e) => setQuantity(e.target.value)}
          className="my-option-basket-quantity"
        />
      </td>
      <td>
        <div className="my-no-wrap">
          <BTC />
          <NumericalInput
            min={tick_size}
            step={tick_size}
            value={price ? price : ''}
            onChange={(e) => setPrice(e.target.value)}
            className="my-option-basket-price"
            placeholder={mark_price.toFixed(4)}
          />
        </div>
      </td>
      <td>
        <RadioGroup
          options={{ LONG: 0, SHORT: 1 }}
          value={side ? side : 1}
          setValue={setSide}
        />
      </td>
      <td>
        <input
          className="my-small-input"
          value={label ? label : ''}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={64}
        />
      </td>
      <td>
        <OrderSingleOptionButton onClick={() => {}}>
          Analyze
        </OrderSingleOptionButton>
      </td>
      <td>
        <OrderSingleOptionButton onClick={order}>Order</OrderSingleOptionButton>
      </td>
    </tr>
  );
};

const OrderOptionButton = ({ children, className = '', ...props }) => (
  <button className={`w3-btn w3-card my-round ${className}`} {...props}>
    {children}
  </button>
);

const OrderSingleOptionButton = ({ children, className = '', ...props }) => (
  <OrderOptionButton className={`w3-theme-d3 ${className}`} {...props}>
    {children}
  </OrderOptionButton>
);

const OrderAllOptionsButton = ({ children, className = '', ...props }) => (
  <OrderOptionButton className={`w3-theme-d5 ${className}`} {...props}>
    {children}
  </OrderOptionButton>
);
