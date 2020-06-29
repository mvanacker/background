import React, { useState, useEffect, useRef } from 'react';

import Lock from '../common/Lock';
import BTC from '../common/Bitcoin';
import { PanelTitle } from '../common/Panel';
import { mean, floats } from '../../util/array';
import { lcm, round_to } from '../../util/math';
import { percent } from '../../util/format';
import { useLocal } from '../../hooks/useStorage';

import { DeleteButton, NumericalInput, RadioGroup } from './Common';

export default ({
  deribit,
  tickers,
  portfolio,
  setAnalysisPositions,
  ...props
}) => {
  const [showConfig, setShowConfig] = useLocal('deribit-show-futures-config', {
    initialValue: false,
  });

  // One (pure) option so far - TODO reduce on stops, reject on entries
  const [autoPremium, setAutoPremium] = useLocal('deribit-auto-premium', {
    initialValue: false,
  });

  // Methods
  const [entryMethod, setEntryMethod] = useLocal('deribit-entry-method', {
    initialValue: EntryMethod.MANUAL,
  });
  const [riskMethod, setRiskMethod] = useLocal('deribit-risk-method', {
    initialValue: RiskMethod.RISK,
  });

  // Enablings
  const [
    entriesEnabled,
    setEntriesEnabled,
  ] = useLocal('deribit-entries-enabled', { initialValue: true });
  const [stopsEnabled, setStopsEnabled] = useLocal('deribit-stops-enabled', {
    initialValue: true,
  });
  const [
    profitsEnabled,
    setProfitsEnabled,
  ] = useLocal('deribit-profits-enabled', { initialValue: false });

  // Locks
  const [entriesLocked, setEntriesLocked] = useLocal('deribit-entries-locked', {
    intialValue: true,
  });
  const [stopsLocked, setStopsLocked] = useLocal('deribit-stops-locked', {
    initialValue: true,
  });
  const [profitsLocked, setProfitsLocked] = useLocal('deribit-profits-locked', {
    initialValue: true,
  });

  // Core form state
  const [selectedFuture, setSelectedFuture] = useLocal(
    'deribit-selected-future'
  );
  const [entryType, setEntryType] = useLocal('deribit-entry-type', {
    initialValue: OrderType.LIMIT,
  });
  const [entries, setEntries] = useLocal('deribit-entries', {
    initialValue: [''],
  });
  const [stops, setStops] = useLocal('deribit-stops', { initialValue: [''] });
  const [quantity, setQuantity] = useLocal('deribit-quantity');
  const [risk, setRisk] = useLocal('deribit-risk', { initialValue: 1 });
  const [label, setLabel] = useLocal('deribit-label');
  const [profits, setProfits] = useLocal('deribit-profits', {
    initialValue: [''],
  });

  // Add-premium feature
  // Note: it is theoretically possible for an agent to order before the tickers
  //       are subscribed to. The add-premium feature will fail in this case.
  // Proposal: render loading icon on the entire form or on the button itself
  //           until the perpetual contract's ticker has been subscribed to.
  // Quick and dirty work-around:
  if (!(tickers['BTC-PERPETUAL'] && tickers[selectedFuture])) return null;
  const { last_price } = tickers['BTC-PERPETUAL'];
  const addPremium = (array) => {
    if (autoPremium) {
      const source = last_price;
      const future = tickers[selectedFuture].last_price;
      return floats(array).map((target) => (future * target) / source);
    } else return array;
  };

  // Opacities
  const opacity = (enabled) => (enabled ? 'my-full-opacity' : 'my-low-opacity');
  const entryOpacity = opacity(entriesEnabled);
  const riskOpacity = opacity(stopsEnabled);
  const profitOpacity = opacity(profitsEnabled);

  // Mean entry and stop prices
  const stopPrice = mean(floats(stops));
  let entryPrice;
  switch (entryType) {
    case OrderType.LIMIT:
      entryPrice = mean(floats(entries));
      break;
    case OrderType.MARKET:
      entryPrice = last_price;
      break;
    case OrderType.NONE:
    default:
      entryPrice = NaN;
  }

  return (
    <>
      <PanelTitle>
        <i
          onClick={() => setShowConfig(!showConfig)}
          className="fas fa-wrench fa-sm my-fader my-margin-lr w3-text-l4 my-pointer my-order-futures-settings"
          title={showConfig ? 'Hide settings' : 'Show settings'}
        />
        Order Futures
      </PanelTitle>
      <form
        className="w3-padding-large my-two-col-grid my-order-futures-form"
        {...props}
      >
        <div>Equity</div>
        <div>
          <BTC />
          {portfolio.equity}
        </div>
        <div>Futures</div>
        <div>
          <div>
            <select
              className="w3-input my-futures-selector"
              value={selectedFuture}
              onChange={(e) => setSelectedFuture(e.target.value)}
            >
              {Object.values(tickers).map(({ instrument_name, last_price }) => (
                <option key={instrument_name} value={instrument_name}>
                  {instrument_name} ${last_price}
                </option>
              ))}
            </select>
          </div>
          {showConfig && (
            <div className="my-auto-premium-container">
              <label>
                <input
                  disabled={selectedFuture.startsWith('BTC-PERPETUAL')}
                  type="checkbox"
                  className="my-check"
                  checked={autoPremium}
                  onChange={(e) => setAutoPremium(e.target.checked)}
                />{' '}
                auto-add premium <small>(enter perpetual prices)</small>
              </label>
            </div>
          )}
          {autoPremium && !selectedFuture.startsWith('BTC-PERPETUAL') && (
            <div className="my-perpetual-container">
              BTC-PERPETUAL ${last_price}
            </div>
          )}
        </div>
        <div>Entry type</div>
        <div>
          <RadioGroup
            options={OrderType}
            value={entryType}
            setValue={setEntryType}
          />
        </div>
        {entryType === OrderType.LIMIT && (
          <>
            {showConfig && (
              <>
                <div>Entry method</div>
                <div>
                  <RadioGroup
                    options={EntryMethod}
                    value={entryMethod}
                    setValue={setEntryMethod}
                  />
                </div>
              </>
            )}
            <div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    className="my-check"
                    checked={entriesEnabled}
                    onChange={(e) => setEntriesEnabled(e.target.checked)}
                  />{' '}
                  <span className={entryOpacity}>Entry</span>{' '}
                </label>
                {entryMethod === EntryMethod.MANUAL && (
                  <Lock locked={entriesLocked} setLocked={setEntriesLocked} />
                )}
              </div>
            </div>
            <div>
              <Entries
                locked={entriesLocked}
                entryMethod={entryMethod}
                entries={entries}
                setEntries={setEntries}
                className={entryOpacity}
              />
            </div>
          </>
        )}
        {showConfig && (
          <>
            <div>Risk method</div>
            <div>
              <RadioGroup
                options={RiskMethod}
                value={riskMethod}
                setValue={setRiskMethod}
              />
            </div>
          </>
        )}
        <div>
          <div>
            <label>
              <input
                type="checkbox"
                className="my-check"
                checked={stopsEnabled}
                onChange={(e) => setStopsEnabled(e.target.checked)}
              />{' '}
              <span className={riskOpacity}>Stop loss</span>
            </label>{' '}
            <Lock locked={stopsLocked} setLocked={setStopsLocked} />
          </div>
        </div>
        <div className="my-dynamic-inputs-container">
          <NumericalDynamicInputs
            locked={stopsLocked}
            values={stops}
            setValues={setStops}
            className={riskOpacity}
          />
        </div>
        <div>Quantity</div>
        <div>
          <Quantity
            riskMethod={riskMethod}
            quantity={quantity}
            setQuantity={setQuantity}
            entryPrice={entryPrice}
            stopPrice={stopPrice}
            equity={portfolio.equity}
            risk={risk}
          />
        </div>
        <div>
          <span className={riskOpacity}>Risk</span>
        </div>
        <div>
          <Risk
            riskMethod={riskMethod}
            risk={risk}
            setRisk={setRisk}
            entryPrice={entryPrice}
            stopPrice={stopPrice}
            equity={portfolio.equity}
            quantity={quantity}
            className={riskOpacity}
          />
        </div>
        <div>
          <div>
            <label>
              <input
                type="checkbox"
                className="my-check"
                checked={profitsEnabled}
                onChange={(e) => setProfitsEnabled(e.target.checked)}
              />{' '}
              <span className={profitOpacity}>Take profit</span>{' '}
            </label>
            <Lock locked={profitsLocked} setLocked={setProfitsLocked} />
          </div>
        </div>
        <div className="my-dynamic-inputs-container">
          <NumericalDynamicInputs
            locked={profitsLocked}
            values={profits}
            setValues={setProfits}
            className={profitOpacity}
          />
        </div>
        <div>Label</div>
        <div>
          <input
            className="my-small-input my-label-input"
            value={label ? label : ''}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={64}
          />
        </div>
        <div className="my-order-futures-button-container">
          <OrderFuturesButtonContainer
            deribit={deribit}
            label={label}
            instrument_name={selectedFuture}
            quantity={quantity}
            entryType={entryType}
            last_price={tickers[selectedFuture].last_price}
            entriesEnabled={entriesEnabled}
            entries={addPremium(entries)}
            stopsEnabled={stopsEnabled}
            stops={addPremium(stops)}
            profitsEnabled={profitsEnabled}
            profits={addPremium(profits)}
          />
        </div>
      </form>
    </>
  );
};

const Entries = ({ entryMethod, entries, setEntries, ...props }) => {
  switch (entryMethod) {
    case EntryMethod.SPLAY:
      return <SplayedEntries setEntries={setEntries} {...props} />;
    case EntryMethod.MANUAL:
    default:
      return <ManualEntries setEntries={setEntries} {...props} />;
  }
};

const SplayedEntries = ({ setEntries, locked, ...props }) => {
  const [center, setCenter] = useLocal('deribit-center');
  const [spread, setSpread] = useLocal('deribit-spread', { initialValue: 5 });
  const [orders, setOrders] = useLocal('deribit-orders', { initialValue: 9 });
  const [aggregates, setAggregates] = useState({});

  useEffect(() => {
    const half = ((orders - 1) * spread) / 2,
      min = center - half,
      max = center - -half;
    const entries = [];
    for (let i = 0; i < orders; i++) {
      entries[i] = min + i * spread;
    }
    setEntries(entries);
    setAggregates({ min, max });
  }, [center, spread, orders, setEntries, setAggregates]);

  return (
    <div className="my-two-col-grid my-splayed-entries">
      <div>Center</div>
      <div>
        <NumericalInput
          value={center}
          onChange={(e) => setCenter(e.target.value)}
          {...props}
        />
      </div>
      <div>Spread</div>
      <div>
        <NumericalSlider
          value={spread}
          setValue={setSpread}
          min={1}
          max={15}
          step={1}
          {...props}
        />
      </div>
      <div>Orders</div>
      <div>
        <NumericalSlider
          value={orders}
          setValue={setOrders}
          min={1}
          max={21}
          step={2}
          {...props}
        />
      </div>
      <div>Min</div>
      <div>
        <span {...props}>{aggregates.min}</span>
      </div>
      <div>Max</div>
      <div>
        <span {...props}>{aggregates.max}</span>
      </div>
    </div>
  );
};

const ManualEntries = ({ setEntries, ...props }) => {
  const [manualEntries, setManualEntries] = useLocal('deribit-manual-entries', {
    initialValue: [''],
  });
  useEffect(() => {
    setEntries(manualEntries);
  }, [manualEntries, setEntries]);
  return (
    <div className="my-dynamic-inputs-container">
      <NumericalDynamicInputs
        values={manualEntries}
        setValues={setManualEntries}
        {...props}
      />
    </div>
  );
};

const Quantity = ({
  riskMethod,
  quantity,
  setQuantity,
  entryPrice,
  stopPrice,
  equity,
  risk,
  ...props
}) => {
  // Compute after render
  useEffect(() => {
    switch (riskMethod) {
      case RiskMethod.RISK:
        const ds = computeStopDistance(entryPrice, stopPrice);
        const quantity = round_to((equity * risk) / ds, -1);
        setQuantity(quantity);
        break;
      default:
        break;
    }
  }, [riskMethod, entryPrice, stopPrice, equity, risk, setQuantity]);

  // Render
  switch (riskMethod) {
    case RiskMethod.RISK:
      return <div {...props}>{quantity ? quantity : 'n/a'}</div>;
    case RiskMethod.CLASSIC:
    default:
      return (
        <NumericalInput
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          step={10}
          min={10}
          {...props}
        />
      );
  }
};

const Risk = ({
  riskMethod,
  risk,
  setRisk,
  entryPrice,
  stopPrice,
  equity,
  quantity,
  ...props
}) => {
  // Compute after render
  useEffect(() => {
    switch (riskMethod) {
      case RiskMethod.CLASSIC:
        const ds = computeStopDistance(entryPrice, stopPrice);
        const risk = (quantity * ds) / equity;
        setRisk(risk);
        break;
      default:
        break;
    }
  }, [riskMethod, entryPrice, stopPrice, equity, quantity, setRisk]);

  // Render
  switch (riskMethod) {
    case RiskMethod.RISK:
      return (
        <NumericalInput
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          step={0.001}
          min={0.001}
          {...props}
        />
      );
    case RiskMethod.CLASSIC:
    default:
      return <div {...props}>{risk ? percent(risk) : ''}</div>;
  }
};

const computeStopDistance = (entryPrice, stopPrice) => {
  return Math.abs(1 / entryPrice - 1 / stopPrice);
};

const OrderFuturesButtonContainer = ({
  deribit,
  label,
  instrument_name,
  quantity,
  entryType,
  last_price,
  entriesEnabled,
  entries,
  stopsEnabled,
  stops,
  profitsEnabled,
  profits,
}) => {
  // Error handling
  const [errors, setErrors] = useState([]);
  const addError = (error) => setErrors((errors) => [...errors, error]);

  // Simple (placeholder) strategy for assigning quantities to given prices
  // i.e. evenly spread the total quantity
  const lengths = [];
  if (entriesEnabled && entryType === OrderType.LIMIT) {
    lengths.push(entries.length);
  }
  if (stopsEnabled) lengths.push(stops.length);
  if (profitsEnabled) lengths.push(profits.length);
  quantity = round_to(quantity, -1, 10 * lcm(lengths));
  const entryAmount = Math.round(quantity / entries.length);
  const stopAmount = Math.round(quantity / stops.length);
  const profitAmount = Math.round(quantity / profits.length);

  const order = (side) => {
    // Reset errors
    setErrors([]);

    const oppositeSide = side === 'buy' ? 'sell' : 'buy';
    const send = (message) => deribit.send(message).catch(addError);
    const subOrder = ({
      enabled,
      prices,
      amount,
      side,
      params,
      priceKey = 'price',
    }) => {
      if (enabled) {
        floats(prices).forEach((price) =>
          send({
            method: `private/${side}`,
            params: {
              label,
              instrument_name,
              [priceKey]: price,
              amount,
              ...params,
            },
          })
        );
      }
    };

    // Place entry orders
    switch (entryType) {
      case OrderType.LIMIT:
        subOrder({
          enabled: entriesEnabled,
          prices: entries,
          amount: entryAmount,
          side,
          params: {
            post_only: true,
            post_only_reject: true,
          },
        });
        break;
      case OrderType.MARKET:
        send({
          method: `private/${side}`,
          params: { instrument_name, amount: quantity, type: 'market' },
        });
        break;
      case OrderType.NONE:
      default:
        break;
    }

    // Place stop loss orders
    subOrder({
      enabled: stopsEnabled,
      prices: stops,
      amount: stopAmount,
      side: oppositeSide,
      params: {
        type: 'stop_market',
        reduce_only: true,
        trigger: 'last_price',
      },
      priceKey: 'stop_price',
    });

    // Place take profit orders
    subOrder({
      enabled: profitsEnabled,
      prices: profits,
      amount: profitAmount,
      side: oppositeSide,
      params: {
        post_only: true,
        post_only_reject: true,
      },
    });
  };
  const buy = () => order('buy');
  const sell = () => order('sell');

  const meanStop = Math.round(mean(floats(stops)));
  const meanEntry = Math.round(mean(floats(entries)));
  return (
    <>
      {errors && (
        <div className="w3-padding-large">
          <ul className="w3-ul">
            {errors.map((error, i) => {
              return (
                <li key={error.id} className="w3-hover-theme">
                  <div className="w3-cell-row">
                    <div className="w3-cell w3-center my-future-order-close-error-container">
                      <DeleteButton
                        onClick={() =>
                          setErrors((errors) => {
                            const newErrors = [...errors];
                            newErrors.splice(i, 1);
                            return newErrors;
                          })
                        }
                      />
                    </div>
                    <div className="w3-cell w3-padding-small my-future-order-error-container">
                      {error.toString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!(
        entriesEnabled ||
        stopsEnabled ||
        profitsEnabled
      ) ? null : entriesEnabled && stopsEnabled ? (
        meanEntry === meanStop ? null : meanEntry > meanStop ? (
          <BuyFullOrderFuturesButton buy={buy} />
        ) : (
          <SellFullOrderFuturesButton sell={sell} />
        )
      ) : (
        <HalfOrderFuturesButtonContainer>
          {stopsEnabled && profitsEnabled ? (
            <>
              <BuyHalfOrderFuturesButton buy={buy}>
                Sell stop &amp; profit sell
              </BuyHalfOrderFuturesButton>
              <SellHalfOrderFuturesButton sell={sell}>
                Buy stop &amp; profit buy
              </SellHalfOrderFuturesButton>
            </>
          ) : entriesEnabled ? (
            <>
              <BuyHalfOrderFuturesButton buy={buy}>
                Buy
              </BuyHalfOrderFuturesButton>
              <SellHalfOrderFuturesButton sell={sell}>
                Sell
              </SellHalfOrderFuturesButton>
            </>
          ) : stopsEnabled ? (
            <>
              <BuyHalfOrderFuturesButton buy={buy}>
                Sell stop
              </BuyHalfOrderFuturesButton>
              <SellHalfOrderFuturesButton sell={sell}>
                Buy stop
              </SellHalfOrderFuturesButton>
            </>
          ) : profitsEnabled ? (
            <>
              <BuyHalfOrderFuturesButton buy={buy}>
                Profit sell
              </BuyHalfOrderFuturesButton>
              <SellHalfOrderFuturesButton sell={sell}>
                Profit buy
              </SellHalfOrderFuturesButton>
            </>
          ) : null}
        </HalfOrderFuturesButtonContainer>
      )}
    </>
  );
};

const OrderFuturesButton = ({ children, className = '', ...props }) => (
  <button
    className={`w3-card w3-btn w3-large ${className}`}
    type="button"
    {...props}
  >
    {children}
  </button>
);

const FullOrderFuturesButton = ({ children, className = '', ...props }) => (
  <OrderFuturesButton className={`w3-block my-round ${className}`} {...props}>
    {children}
  </OrderFuturesButton>
);

const BuyFullOrderFuturesButton = ({ buy }) => (
  <FullOrderFuturesButton className="w3-green" onClick={buy}>
    Buy
  </FullOrderFuturesButton>
);

const SellFullOrderFuturesButton = ({ sell }) => (
  <FullOrderFuturesButton className="w3-red" onClick={sell}>
    Sell
  </FullOrderFuturesButton>
);

const HalfOrderFuturesButtonContainer = ({ children }) => (
  <div className="w3-cell-row">{children}</div>
);

const HalfOrderFuturesButton = ({ children, className = '', ...props }) => (
  <OrderFuturesButton className={`w3-cell w3-half ${className}`} {...props}>
    {children}
  </OrderFuturesButton>
);

const BuyHalfOrderFuturesButton = ({ children, buy }) => (
  <HalfOrderFuturesButton className="my-round-left w3-green" onClick={buy}>
    {children}
  </HalfOrderFuturesButton>
);

const SellHalfOrderFuturesButton = ({ children, sell }) => (
  <HalfOrderFuturesButton className="my-round-right w3-red" onClick={sell}>
    {children}
  </HalfOrderFuturesButton>
);

const NumericalSlider = ({ value, setValue, className = '', ...props }) => {
  const valueProps = { value, onChange: (e) => setValue(e.target.value) };
  return (
    <div>
      <div>
        <NumericalInput className={className} {...valueProps} {...props} />
      </div>
      <div>
        <input
          type="range"
          className={`my-small-range ${className}`}
          {...valueProps}
          {...props}
        />
      </div>
    </div>
  );
};

const NumericalDynamicInputs = ({ locked, values, setValues, ...props }) => {
  // A "vanilla" input would also work,
  // a "Component" input needs to be wrapped with forwardRef
  const Input = NumericalInput;

  // Focusing the last (real) input must be done *after* the render
  const last = useRef(null);
  const [focusLast, setFocusLast] = useState(false);
  useEffect(() => {
    if (focusLast) {
      last.current.focus();
    }
    setFocusLast(false);
  }, [focusLast]);

  // Used in both paths
  const setValue = (i) => (e) =>
    setValues(values.map((value, j) => (j === i ? e.target.value : value)));

  // If the amount of inputs is locked, i.e. static, we can save a lot of effort
  if (locked) {
    return values.map((value, i) => (
      <Input value={value} onChange={setValue(i)} key={i} {...props} />
    ));
  }

  // Otherwise render dynamic inputs
  return (
    <>
      {values.map((value, i) => {
        const commonProps = { value, onChange: setValue(i), key: i, ...props };

        // Leave a reference on the very last (real) input
        if (i === values.length - 1) {
          return <Input ref={last} {...commonProps} />;
        }

        // Clean up trailing empty values when focusing non-last input
        else {
          return (
            <Input
              onFocus={() => {
                if (!last.current.value) {
                  // Count how many trailing values are empty
                  let c = 0;
                  while (
                    !values[values.length - 1 - c] &&
                    c < values.length - 1 - i
                  ) {
                    c++;
                  }

                  // Slice them off
                  setValues(values.slice(0, values.length - c));

                  // Correct focus if necessary
                  if (i >= values.length - c) {
                    setFocusLast(true);
                  }
                }
              }}
              {...commonProps}
            />
          );
        }
      })}

      {/* Fake input that spawns new inputs when focused */}
      <Input
        value=""
        readOnly={true}
        onFocus={() => {
          setValues(values.concat(['']));
          setFocusLast(true);
        }}
        {...props}
      />
    </>
  );
};

const EntryMethod = {
  MANUAL: 0,
  SPLAY: 1,
};

const RiskMethod = {
  CLASSIC: 0,
  RISK: 1,
};

const OrderType = {
  LIMIT: 0,
  MARKET: 1,
};
