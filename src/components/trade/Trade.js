import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  forwardRef,
} from 'react';

import Panel from '../common/Panel';
import Lock from '../common/Lock';
import BTC from '../common/Bitcoin';
import { mean, floats } from '../../util/array';
import { lcm, round_to } from '../../util/math';
import { percent } from '../../util/format';
import { useLocal } from '../../hooks/useStorage';
import { DeribitContext } from '../../contexts/Deribit';
import { AuthState, ReadyState } from '../../sources/DeribitWebSocket';

// Define the Trade component
export default () => <DeribitPanel />;

// Define Deribit panel
const DeribitPanel = (props) => {
  const { deribit, readyState, authState, test, setTest } = useContext(
    DeribitContext
  );
  if (deribit === null) {
    return null;
  }

  const commonProps = {
    style: { width: '100%', maxWidth: '710px', margin: 'auto' },
    margin: false,
    ...props,
  };

  // Give feedback on connection status with Deribit
  let readyString;
  switch (readyState) {
    case ReadyState.CONNECTING:
      readyString = 'connecting';
      break;
    case ReadyState.CONNECTED:
      readyString = 'connected';
      break;
    case ReadyState.CLOSING:
      readyString = 'closing';
      break;
    case ReadyState.CLOSED:
      readyString = 'closed';
      break;
    default:
      break;
  }

  // Give feedback on authentication status with Deribit
  let authString;
  switch (authState) {
    case AuthState.NOT_AUTHENTICATED:
      authString = 'not authenticated';
      break;
    case AuthState.AUTHENTICATING:
    case AuthState.REAUTHENTICATING:
      authString = 'authenticating';
      break;
    case AuthState.AUTHENTICATED:
      authString = 'authenticated';
      break;
    default:
      break;
  }

  return (
    <div className="w3-container w3-section">
      {deribit.maybeDown ? (
        <Panel title={`Deribit down?`} {...commonProps}>
          <div className="w3-center w3-padding-large">
            <p>We encountered an error while trying to connect to Deribit.</p>
            <p>You may refresh this page to try again.</p>
          </div>
        </Panel>
      ) : (
        <Panel
          title={`Deribit (${readyString}, ${authString})`}
          {...commonProps}
        >
          {deribit.authState !== AuthState.AUTHENTICATED ? (
            <DeribitAuth deribit={deribit} test={test} setTest={setTest} />
          ) : (
            <DeribitInterface deribit={deribit} />
          )}
        </Panel>
      )}
    </div>
  );
};

// Define Deribit authentication form
const DeribitAuth = ({ deribit, test, setTest, ...props }) => {
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(null);

  return (
    <div className="w3-center" {...props}>
      {error && <div className="w3-padding">{error.toString()}</div>}
      <form
        className="w3-container"
        onSubmit={(e) => {
          e.preventDefault();
          deribit.auth({ key, secret }).catch(setError);
        }}
      >
        <div className="w3-padding-small">
          <label>Key</label>
        </div>
        <input
          autoComplete="username"
          className="w3-input"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <div className="w3-padding-small">
          <label>Secret</label>
        </div>
        <input
          autoComplete="current-password"
          className="w3-input"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <div className="w3-margin">
          <label>
            <input
              type="checkbox"
              className="my-check"
              checked={test}
              onChange={(e) => setTest(e.target.checked)}
            />{' '}
            Testnet
          </label>
        </div>
        <button className="w3-btn w3-theme-l2 w3-margin my-round" type="submit">
          Authenticate
        </button>
      </form>
    </div>
  );
};

// Define Deribit trading interface
const DeribitInterface = ({ deribit, ...props }) => {
  const [futures, setFutures] = useState({});
  const [orders, setOrders] = useState({});
  const [portfolio, setPortfolio] = useState({});

  // Setup information retrieval needed to provide a trading interface
  useEffect(() => {
    // We won't actually be subscribing until the end of this hook
    // Instead we'll be accumulating channels and their callbacks
    const pubSubs = {};
    const privSubs = {};

    // Subscribe to portfolio
    privSubs['user.portfolio.btc'] = ({ data }) => setPortfolio(data);

    // Fetch futures
    const setup = deribit
      .send({
        method: 'public/get_instruments',
        params: { currency: 'btc', kind: 'future' },
      })
      .then(({ result: futures }) => {
        futures = futures.map((r) => r.instrument_name);

        // Set up orders object
        const orders = {};
        futures.forEach((future) => (orders[future] = {}));
        setOrders(orders);

        // Subscribe to futures' tickers
        futures.forEach((future) => {
          const channel = `ticker.${future}.100ms`;
          pubSubs[channel] = ({ data }) =>
            setFutures((futures) => ({ ...futures, [future]: data }));
        });

        // Fetch user's open orders on futures
        deribit
          .send({
            method: 'private/get_open_orders_by_currency',
            params: { currency: 'btc', kind: 'future' },
          })

          // The private subscription will have a key named data
          .then(({ result: data }) => {
            const updateOrders = ({ data }) => {
              // Perform functional update on orders
              setOrders((orders) => {
                const newOrders = { ...orders };
                data.forEach((datum) => {
                  // Add or update order
                  const { instrument_name, order_id } = datum;
                  newOrders[instrument_name][order_id] = datum;
                  // Delete orders which are no longer open
                  if (
                    datum.order_state === 'cancelled' ||
                    datum.order_state === 'filled'
                  ) {
                    delete newOrders[instrument_name][order_id];
                  }
                });
                return newOrders;
              });
            };

            // First update with data (i.e. open orders) from initial fetch
            updateOrders({ data });

            // Subscribe to user's futures' orders
            futures.forEach((future) => {
              const orders = `user.orders.${future}.100ms`;
              privSubs[orders] = updateOrders; // notice subsequent updates
            });
          })

          // AFTER all of this...
          .then(() => {
            // Do actual subscribing
            deribit.publicSubscribe(pubSubs);
            deribit.privateSubscribe(privSubs);
          });
      });

    // Unsubscribe when done, making sure setup ran first
    return () =>
      setup.then(() => {
        deribit.publicUnsubscribe(Object.keys(pubSubs));
        deribit.privateUnsubscribe(Object.keys(privSubs));
      });
  }, [deribit]);

  // Store application state locally
  const [showOptions, setShowOptions] = useLocal('deribit-show-methods', {
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

  // Locks
  const [entriesLocked, setEntriesLocked] = useLocal('deribit-entries-locked', {
    intialValue: true,
  });
  const [stopsLocked, setStopsLocked] = useLocal('deribit-stops-locked', {
    initialValue: true,
  });

  // Core form state
  const [selectedFuture, setSelectedFuture] = useLocal(
    'deribit-selected-future'
  );
  const [entries, setEntries] = useLocal('deribit-entries', {
    initialValue: [''],
  });
  const [stops, setStops] = useLocal('deribit-stops', { initialValue: [''] });
  const [quantity, setQuantity] = useLocal('deribit-quantity');
  const [risk, setRisk] = useLocal('deribit-risk', { initialValue: 1 });
  const [label, setLabel] = useLocal('deribit-label');

  // Add premium feature
  const addPremium = (array) => {
    if (autoPremium && futures['BTC-PERPETUAL'] && futures[selectedFuture]) {
      const source = futures['BTC-PERPETUAL'].last_price;
      const future = futures[selectedFuture].last_price;
      return array.map((target) => (future * target) / source);
    } else return array;
  };

  // Render form
  const opacity = (enabled) => ({ opacity: enabled ? 1 : 0.3 });
  const entryOpacity = opacity(entriesEnabled);
  const riskOpacity = opacity(stopsEnabled);
  return (
    <div {...props}>
      <div className="w3-right-align" style={{ padding: '8px 24px 0' }}>
        <TopRightButton
          onClick={() => deribit.send({ method: 'private/cancel_all' })}
        >
          Cancel all
        </TopRightButton>
        <TopRightButton onClick={() => setShowOptions(!showOptions)}>
          {showOptions ? 'Hide options' : 'Show options'}
        </TopRightButton>
        <TopRightButton onClick={() => deribit.logout()}>
          Log out
        </TopRightButton>
      </div>
      <div className="w3-padding">
        <Row label="Equity">
          <BTC />
          {portfolio.equity}
        </Row>
        <Row label="Futures">
          <div>
            <select
              className="w3-input"
              style={{
                padding: '0 8px 0 4px',
                width: 'fit-content',
                display: 'inline',
              }}
              value={selectedFuture}
              onChange={(e) => setSelectedFuture(e.target.value)}
            >
              {Object.values(futures).map(({ instrument_name, last_price }) => (
                <option key={instrument_name} value={instrument_name}>
                  {instrument_name} ${last_price}
                </option>
              ))}
            </select>
          </div>
          {showOptions && (
            <div style={{ margin: '4px 0 0 8px' }}>
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
            <div style={{ margin: '4px 0 0 8px' }}>
              BTC-PERPETUAL ${futures['BTC-PERPETUAL']?.last_price}
            </div>
          )}
        </Row>
      </div>
      <div className="w3-padding">
        {showOptions && (
          <Row label="Entry method">
            <RadioGroup
              options={EntryMethod}
              value={entryMethod}
              setValue={setEntryMethod}
            />
          </Row>
        )}
        <Row
          label={
            <>
              <label>
                <input
                  type="checkbox"
                  className="my-check"
                  checked={entriesEnabled}
                  onChange={(e) => setEntriesEnabled(e.target.checked)}
                />{' '}
                <span style={entryOpacity}>Entry</span>{' '}
              </label>
              {entryMethod === EntryMethod.MANUAL && (
                <Lock locked={entriesLocked} setLocked={setEntriesLocked} />
              )}
            </>
          }
        >
          <Entries
            locked={entriesLocked}
            entryMethod={entryMethod}
            entries={entries}
            setEntries={setEntries}
            style={entryOpacity}
          />
        </Row>
      </div>
      <div className="w3-padding">
        {showOptions && (
          <Row label="Risk method">
            <RadioGroup
              options={RiskMethod}
              value={riskMethod}
              setValue={setRiskMethod}
            />
          </Row>
        )}
        <Row
          label={
            <>
              <label>
                <input
                  type="checkbox"
                  className="my-check"
                  checked={stopsEnabled}
                  onChange={(e) => setStopsEnabled(e.target.checked)}
                />{' '}
                <span style={riskOpacity}>Stop</span>
              </label>{' '}
              <Lock locked={stopsLocked} setLocked={setStopsLocked} />
            </>
          }
        >
          <NumericalDynamicInputs
            locked={stopsLocked}
            values={stops}
            setValues={setStops}
            style={riskOpacity}
          />
        </Row>
        <Row label="Quantity">
          <Quantity
            riskMethod={riskMethod}
            quantity={quantity}
            setQuantity={setQuantity}
            entries={entries}
            stops={stops}
            equity={portfolio.equity}
            risk={risk}
          />
        </Row>
        <Row label={<span style={riskOpacity}>Risk</span>}>
          <Risk
            riskMethod={riskMethod}
            risk={risk}
            setRisk={setRisk}
            entries={entries}
            stops={stops}
            equity={portfolio.equity}
            quantity={quantity}
            style={riskOpacity}
          />
        </Row>
      </div>
      <div className="w3-padding">
        <Row label="Label">
          <input
            className="my-small-input"
            style={{ width: '200px' }}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Row>
      </div>
      <div className="w3-padding">
        <Order
          deribit={deribit}
          label={label}
          instrument_name={selectedFuture}
          quantity={quantity}
          entriesEnabled={entriesEnabled}
          entries={addPremium(entries)}
          stops={addPremium(stops)}
          stopsEnabled={stopsEnabled}
        />
      </div>
      <Orders deribit={deribit} orders={orders} />
    </div>
  );
};

// Auxiliary component
const TopRightButton = ({ children, ...props }) => (
  <button
    className="w3-mobile w3-btn w3-card w3-theme-l2 my-round my-fader"
    style={{ margin: '4px' }}
    type="button"
    {...props}
  >
    {children}
  </button>
);

// Auxiliary component
const TextButton = ({ children, ...props }) => (
  <button type="text" className="my-text-button my-round" {...props}>
    {children}
  </button>
);

// Row with 2 columns; 25% and 75% wide (auxiliary component)
const Row = ({ label, children, ...props }) => (
  <div className="w3-row-padding w3-container" {...props}>
    <div
      className="w3-col w3-padding-small w3-left-align w3-mobile"
      style={{ width: '25%', maxWidth: '150px' }}
    >
      {label ? label : ''}
    </div>
    <div
      className="w3-col w3-padding-small w3-left-align w3-mobile"
      style={{ width: '75%' }}
    >
      {children}
    </div>
  </div>
);

//
const RadioGroup = ({ options, value: checked, setValue }) =>
  Object.entries(options).map(([name, value]) => (
    <label style={{ marginRight: '8px' }} key={name} className="w3-mobile">
      <input
        checked={checked === value}
        onChange={() => setValue(value)}
        type="radio"
        className="my-radio"
      />{' '}
      {name.toLowerCase()}{' '}
    </label>
  ));

// Meta-entries component
const Entries = ({ entryMethod, entries, setEntries, ...props }) => {
  switch (entryMethod) {
    case EntryMethod.SPLAY:
      return <SplayedEntries setEntries={setEntries} {...props} />;
    case EntryMethod.MANUAL:
    default:
      return (
        <NumericalDynamicInputs
          values={entries}
          setValues={setEntries}
          {...props}
        />
      );
  }
};

// Splayed entries component
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
    <>
      <Row label="Center">
        <NumericalInput
          value={center}
          onChange={(e) => setCenter(e.target.value)}
          {...props}
        />
      </Row>
      <Row label="Spread">
        <NumericalSlider
          value={spread}
          setValue={setSpread}
          min={1}
          max={10}
          step={1}
          {...props}
        />
      </Row>
      <Row label="Orders">
        <NumericalSlider
          value={orders}
          setValue={setOrders}
          min={1}
          max={21}
          step={2}
          {...props}
        />
      </Row>
      <Row label="Min">
        <span {...props}>{aggregates.min}</span>
      </Row>
      <Row label="Max">
        <span {...props}>{aggregates.max}</span>
      </Row>
    </>
  );
};

// Meta-quantity component
const Quantity = ({
  riskMethod,
  quantity,
  setQuantity,
  entries,
  stops,
  equity,
  risk,
  ...props
}) => {
  // Compute after render
  useEffect(() => {
    switch (riskMethod) {
      case RiskMethod.RISK:
        const ds = Math.abs(
          1 / mean(floats(entries)) - 1 / mean(floats(stops))
        );
        const quantity = round_to((equity * risk) / ds, -1);
        setQuantity(quantity);
        break;
      default:
        break;
    }
  }, [riskMethod, entries, stops, equity, risk, setQuantity]);

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

// Meta-risk component
const Risk = ({
  riskMethod,
  risk,
  setRisk,
  entries,
  stops,
  equity,
  quantity,
  ...props
}) => {
  // Compute after render
  useEffect(() => {
    switch (riskMethod) {
      case RiskMethod.CLASSIC:
        const ds = Math.abs(
          1 / mean(floats(entries)) - 1 / mean(floats(stops))
        );
        const risk = (quantity * ds) / equity;
        setRisk(risk);
        break;
      default:
        break;
    }
  }, [riskMethod, entries, stops, equity, quantity, setRisk]);

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

const OrderButton = ({ children, className, ...props }) => (
  <button
    className={`w3-card w3-section w3-btn w3-large ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Order = ({
  deribit,
  label,
  instrument_name,
  quantity,
  entries,
  entriesEnabled,
  stops,
  stopsEnabled,
}) => {
  //
  const [errors, setErrors] = useState([]);
  const addError = (error) => setErrors((errors) => [...errors, error]);

  //
  let base = 10;
  if (entriesEnabled && stopsEnabled) {
    base *= lcm(entries.length, stops.length);
  } else if (entriesEnabled) {
    base *= entries.length;
  } else if (stopsEnabled) {
    base *= stops.length;
  }
  quantity = round_to(quantity, -1, base);
  const entryQuantity = quantity / entries.length;
  const stopQuantity = quantity / stops.length;

  const commonParams = {
    label,
    instrument_name,
  };

  const order = (side) => {
    setErrors([]);
    if (entriesEnabled) {
      floats(entries).forEach((entry) =>
        deribit
          .send({
            method: `private/${side}`,
            params: {
              ...commonParams,
              amount: entryQuantity,
              price: entry,
              post_only: true,
              post_only_reject: true,
            },
          })
          .catch(addError)
      );
    }
    if (stopsEnabled) {
      floats(stops).forEach((stop) =>
        deribit
          .send({
            method: `private/${side === 'buy' ? 'sell' : 'buy'}`,
            params: {
              ...commonParams,
              type: 'stop_market',
              amount: stopQuantity,
              stop_price: stop,
              reduce_only: true,
              trigger: 'last_price',
            },
          })
          .catch(addError)
      );
    }
  };
  const buy = () => order('buy');
  const sell = () => order('sell');

  const meanStop = mean(floats(stops));
  const meanEntry = mean(floats(entries));
  return (
    <>
      {errors && (
        <div className="w3-padding-large">
          <ul className="w3-ul">
            {errors.map((error, i) => {
              return (
                <li key={error.id} className="w3-hover-theme">
                  <div className="w3-cell-row">
                    <div className="w3-cell w3-center" style={{ width: '15%' }}>
                      <TextButton
                        onClick={() =>
                          setErrors((errors) => {
                            const newErrors = [...errors];
                            newErrors.splice(i, 1);
                            return newErrors;
                          })
                        }
                      >
                        ✕
                      </TextButton>
                    </div>
                    <div
                      className="w3-cell w3-padding-small"
                      style={{ width: '85%' }}
                    >
                      {error.toString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {
        /* neither enabled */ !(entriesEnabled || stopsEnabled) ? (
          <OrderButton className="w3-block my-round w3-grey">
            No entries nor stops enabled
          </OrderButton>
        ) : /* both enabled */ entriesEnabled && stopsEnabled ? (
          meanStop === meanEntry ? (
            <div className="w3-cell-row">
              <OrderButton
                className="w3-cell my-round-left w3-green"
                style={{ width: '50%' }}
                onClick={buy}
              >
                Buy
              </OrderButton>
              <OrderButton
                className="w3-cell my-round-right w3-red"
                style={{ width: '50%' }}
                onClick={sell}
              >
                Sell
              </OrderButton>
            </div>
          ) : meanEntry > meanStop ? (
            <OrderButton className="w3-block my-round w3-green" onClick={buy}>
              Buy
            </OrderButton>
          ) : (
            <OrderButton className="w3-block my-round w3-red" onClick={sell}>
              Sell
            </OrderButton>
          )
        ) : (
          <div className="w3-cell-row">
            <OrderButton
              className="w3-cell my-round-left w3-green"
              style={{ width: '50%' }}
              onClick={buy}
            >
              {entriesEnabled ? 'Buy' : 'Sell stop'}
            </OrderButton>
            <OrderButton
              className="w3-cell my-round-right w3-red"
              style={{ width: '50%' }}
              onClick={sell}
            >
              {entriesEnabled ? 'Sell' : 'Buy stop'}
            </OrderButton>
          </div>
        )
      }
    </>
  );
};

const Orders = ({ deribit, orders, ...props }) => {
  const len = (future) => Object.keys(orders[future]).length;
  return (
    <div className="w3-center" {...props}>
      {Object.keys(orders)
        .sort((a, b) => len(b) - len(a))
        .map((future) => (
          <div key={future}>
            <h4>
              {future}
              {len(future) > 0 && (
                <TextButton
                  onClick={() =>
                    deribit.send({
                      method: 'private/cancel_all_by_instrument',
                      params: { instrument_name: future },
                    })
                  }
                >
                  🗑
                </TextButton>
              )}
            </h4>
            {Object.keys(orders[future]).length === 0 ? (
              <div className="w3-margin">
                <i>No orders.</i>
              </div>
            ) : (
              <div className="w3-margin w3-padding w3-theme-d1 my-round w3-card">
                {
                  <table className="w3-table w3-centered">
                    <thead>
                      <tr>
                        <th>label</th>
                        <th>side</th>
                        <th>type</th>
                        <th>price</th>
                        <th>amount</th>
                        <th>reduce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(orders[future])
                        .sort((a, b) => {
                          const price = (o) =>
                            o.order_type === 'limit' ? o.price : o.stop_price;
                          return price(b) - price(a);
                        })
                        .map(
                          ({
                            order_id,
                            label,
                            direction,
                            order_type,
                            stop_price,
                            price,
                            filled_amount,
                            amount,
                            reduce_only,
                          }) => (
                            <tr key={order_id}>
                              <td>
                                {label}
                                <TextButton
                                  onClick={() =>
                                    deribit.send({
                                      method: 'private/cancel_by_label',
                                      params: { label },
                                    })
                                  }
                                >
                                  🗑
                                </TextButton>
                              </td>
                              <td>{direction}</td>
                              {order_type === 'stop_market' ? (
                                <>
                                  <td>stop</td>
                                  <td>{stop_price}</td>
                                  <td>{amount}</td>
                                </>
                              ) : (
                                <>
                                  <td>{order_type}</td>
                                  <td>{price}</td>
                                  <td>
                                    {filled_amount} / {amount}
                                  </td>
                                </>
                              )}
                              <td>{reduce_only ? '✓' : '✕'}</td>
                              {/* <td className="w3-center">
                              <TextButton>🖉</TextButton>
                            </td> */}
                              <td>
                                <TextButton
                                  onClick={() =>
                                    deribit.send({
                                      method: 'private/cancel',
                                      params: { order_id },
                                    })
                                  }
                                >
                                  🗑
                                </TextButton>
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                }
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

// General numerical slider (auxiliary component)
const NumericalSlider = ({ value, setValue, ...props }) => {
  const valueProps = { value, onChange: (e) => setValue(e.target.value) };
  return (
    <div className="w3-mobile w3-row">
      <div className="w3-col w3-mobile">
        <NumericalInput {...valueProps} {...props} />
      </div>
      <div className="w3-col w3-mobile">
        <input
          type="range"
          className="my-small-range"
          {...valueProps}
          {...props}
        />
      </div>
    </div>
  );
};

// General numerical input (auxiliary component)
const NumericalInput = forwardRef((props, ref) => (
  <input
    ref={ref}
    type="number"
    min="1"
    max="99999"
    step="0.5"
    className="w3-input my-small-input"
    {...props}
  />
));

// Generalized dynamic inputs
const dynamize = (Input) => ({ locked, values, setValues, ...props }) => {
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

// Convenience wrapper
const NumericalDynamicInputs = dynamize(NumericalInput);

const EntryMethod = {
  MANUAL: 0,
  SPLAY: 1,
};

const RiskMethod = {
  CLASSIC: 0,
  RISK: 1,
};
