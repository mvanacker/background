import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  forwardRef,
} from 'react';

import moment from 'moment';
import { select } from 'd3-selection';

import Panel, { PanelTitle } from '../common/Panel';
import Lock from '../common/Lock';
import BTC from '../common/Bitcoin';
import { DoubleDown, DoubleUp } from '../common/Icons';

import { mean, floats } from '../../util/array';
import { lcm, round_to } from '../../util/math';
import { percent } from '../../util/format';
import { appendRect } from '../../util/svg';

import { useLocal } from '../../hooks/useStorage';
import { DeribitContext } from '../../contexts/Deribit';

import { AuthState, ReadyState } from '../../sources/DeribitWebSocket';

// Only Deribit is implemented right now
export default (props) => {
  const { deribit, readyState, authState, test, setTest } = useContext(
    DeribitContext
  );
  if (!deribit) {
    return null;
  }

  return (
    <div className="w3-container w3-section">
      {deribit.maybeDown ? (
        <Panel title="Deribit down?" className="my-auth-panel" {...props}>
          <div className="w3-center w3-padding-large">
            <p>We encountered an error while trying to connect to Deribit.</p>
            <p>You may refresh this page to try again.</p>
          </div>
        </Panel>
      ) : deribit.authState !== AuthState.AUTHENTICATED ? (
        <DeribitAuth
          deribit={deribit}
          test={test}
          setTest={setTest}
          readyState={readyState}
          authState={authState}
          className="my-auth-panel"
          {...props}
        />
      ) : (
        <DeribitInterface deribit={deribit} {...props} />
      )}
    </div>
  );
};

// Authentication form
const DeribitAuth = ({
  deribit,
  test,
  setTest,
  readyState,
  authState,
  ...props
}) => {
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(null);

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
    <Panel title={`Deribit (${readyString}, ${authString})`} {...props}>
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
          <button
            className="w3-card w3-btn w3-theme-l2 w3-margin my-round"
            type="submit"
          >
            Authenticate
          </button>
        </form>
      </div>
    </Panel>
  );
};

// Trading interface
const DeribitInterface = ({ deribit, ...props }) => {
  const [futuresTickers, setFuturesTickers] = useState({});
  const [options, setOptions] = useState([]);
  const [orders, setOrders] = useState({});
  const [positions, setPositions] = useState({});
  const [portfolio, setPortfolio] = useState({});

  // Setup information retrieval needed to provide a trading interface
  useEffect(() => {
    // We won't actually be subscribing until the end of this hook
    // Instead we'll be accumulating channels and their callbacks
    const pubSubs = {};
    const privSubs = {};

    // Subscribe to portfolio
    privSubs['user.portfolio.btc'] = ({ data }) => setPortfolio(data);

    // Set up orders callback
    const updateOrders = (orders) => {
      // Perform functional update on orders
      setOrders((oldOrders) => {
        const newOrders = { ...oldOrders };
        orders.forEach((order) => {
          // Add or update order
          const { instrument_name, order_id } = order;
          if (!(instrument_name in newOrders)) {
            newOrders[instrument_name] = {};
          }
          newOrders[instrument_name][order_id] = order;
          // Delete orders which are no longer open
          if (
            order.order_state === 'cancelled' ||
            order.order_state === 'filled'
          ) {
            delete newOrders[instrument_name][order_id];
          }
          if (Object.keys(newOrders[instrument_name]) === 0) {
            delete newOrders[instrument_name];
          }
        });
        return newOrders;
      });
    };

    // Set up positions callback
    const updatePositions = (positions) => {
      setPositions((oldPositions) => {
        const newPositions = { ...oldPositions };
        positions.forEach((position) => {
          newPositions[position.instrument_name] = position;
        });
        return newPositions;
      });
    };

    // Fetch futures
    const setup = deribit
      .send({
        method: 'public/get_instruments',
        params: { currency: 'btc' },
      })
      .then(({ result: instruments }) => {
        // Separate futures and options
        const futures = instruments.filter((r) => r.kind === 'future');
        const options = instruments.filter((r) => r.kind === 'option');
        setOptions(options);

        // Subscribe to futures' tickers
        const addTickerSubscription = (set) => ({ instrument_name }) => {
          const channel = toTickerChannel(instrument_name);
          pubSubs[channel] = ({ data }) => {
            set((tickers) => ({ ...tickers, [instrument_name]: data }));
          };
        };
        futures.forEach(addTickerSubscription(setFuturesTickers));

        Promise.all([
          // Fetch open orders
          deribit
            .send({
              method: 'private/get_open_orders_by_currency',
              params: { currency: 'btc' },
            })
            .then(({ result: orders }) => updateOrders(orders)),

          // Fetch positions
          deribit
            .send({
              method: 'private/get_positions',
              params: { currency: 'btc' },
            })
            .then(({ result: positions }) => updatePositions(positions)),
        ])

          // After the initial fetches
          .then(() => {
            // Prepare to subscribe to changes of all instruments
            instruments.forEach(({ instrument_name }) => {
              const channel = toChangesChannel(instrument_name);
              privSubs[channel] = ({ data: { positions, orders } }) => {
                updateOrders(orders);
                updatePositions(positions);
              };
            });

            // Do actual subscribing
            deribit.publicSubscribe(pubSubs);
            deribit.privateSubscribe(privSubs);
          });
      });

    // Unsubscribe when done, making sure setup ran first
    return () =>
      setup.then(() => {
        deribit.publicUnsubscribe(pubSubs);
        deribit.privateUnsubscribe(privSubs);
      });
  }, [deribit]);

  // Map option's instrument name to its metadata
  const optionInstruments = useRef({});
  useEffect(() => {
    optionInstruments.current = {};
    options.forEach((option) => {
      optionInstruments.current[option.instrument_name] = option;
    });
  }, [options]);

  // Used by the Options basket
  const [selectedOptions, setSelectedOptions] = useLocal(
    'deribit-selected-options',
    {
      initialValue: new Set(),
      stringify: (set) => JSON.stringify(Array.from(set)),
      parse: (string) => new Set(JSON.parse(string)),
    }
  );

  // Render panels
  return (
    <div className="my-trading-interface" {...props}>
      <Panel title="Order Options">
        <OrderOptions
          deribit={deribit}
          options={options}
          optionInstruments={optionInstruments.current}
          selectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
        />
      </Panel>
      <Panel>
        <Position portfolio={portfolio} positions={positions} />
      </Panel>
      <Panel title="Order Futures">
        <OrderFutures
          deribit={deribit}
          tickers={futuresTickers}
          portfolio={portfolio}
        />
      </Panel>
      <Panel title="Open Orders">
        <Orders deribit={deribit} orders={orders} />
      </Panel>
      {selectedOptions.size > 0 &&
        Object.keys(optionInstruments.current).length > 0 && (
          <OptionBasket
            deribit={deribit}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            optionInstruments={optionInstruments.current}
          />
        )}
    </div>
  );
};

// Position
const Position = ({ deribit, portfolio, positions, ...props }) => {
  return (
    <div className="my-position">
      <PanelTitle className="my-position-title">Position</PanelTitle>
      <div className="w3-padding my-greeks" {...props}>
        <Greek>Δ {portfolio.options_delta}</Greek>
        <Greek>Γ {portfolio.options_gamma}</Greek>
        <Greek>ϴ {portfolio.options_theta}</Greek>
        <Greek>𝜈 {portfolio.options_vega}</Greek>
      </div>
      <div className="my-pnl-chart-container">
        <PnlChart positions={positions} />
      </div>
      <div className="my-position-foo">
        <ul>
          {Object.values(positions)
            .filter(({ size }) => size !== 0)
            .map(({ instrument_name, size, kind }) => (
              <li key={instrument_name}>
                {size}x {instrument_name} ({kind})
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

const PnlChart = ({ positions, ...props }) => {
  const chartRef = useRef();

  useEffect(() => {
    // draw here
    const chart = select(chartRef.current);
    appendRect(chart)(0, 0, '100%', '100%').attr('class', 'my-pnl-test-rect');
    console.log('redraw rect', positions);
    return () => {
      // undraw here
    };
  }, [positions]);

  // every individually updateable part of the chart
  // should be a separate component

  const filterPositions = (kind) =>
    Object.values(positions).filter((position) => position.kind === kind);
  const futuresPositions = filterPositions('future');
  const optionsPositions = filterPositions('option');

  return (
    <>
      <svg ref={chartRef} className="my-pnl-chart" {...props} />
    </>
  );
};

const Greek = ({ children, ...props }) => (
  <div className="w3-theme-l1 w3-padding my-round" {...props}>
    {children}
  </div>
);

// Order options
const OrderOptions = ({
  deribit,
  options,
  portfolio,
  optionInstruments,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  const [selectedExpiration, setSelectedExpiration] = useLocal(
    'deribit-selected-expiration'
  );
  const [callTickers, setCallTickers] = useState({});
  const [putTickers, setPutTickers] = useState({});
  const callNames = useRef(new Set());
  const putNames = useRef(new Set());
  const [expirations, setExpirations] = useState([]);

  // Filter (unique) expirations
  useEffect(() => {
    setExpirations(
      Array.from(
        new Set(options.map((option) => option.expiration_timestamp))
      ).sort((a, b) => a - b)
    );
  }, [options]);

  // Separate calls and puts [instruments]
  useEffect(() => {
    callNames.current.clear();
    putNames.current.clear();
    options.forEach((option) => {
      if (option.option_type === 'call') {
        callNames.current.add(option.instrument_name);
      } else {
        putNames.current.add(option.instrument_name);
      }
    });
  }, [options]);

  // Subscribe to selected expiration(s) [plural TODO]
  useEffect(() => {
    // Any expiration date will have a chain of options associated with it
    // Select those relevant to us; also (re)select options in basket
    const relevantOptions = options.filter(
      (option) => option.expiration_timestamp === selectedExpiration
    );

    // Subscribe
    const subs = {};
    const addTickerSubscriptions = (instrument_names, set) => {
      instrument_names.forEach((instrument_name) => {
        const channel = toTickerChannel(instrument_name);
        subs[channel] = ({ data }) => {
          set((tickers) => ({ ...tickers, [instrument_name]: data }));
        };
      });
    };
    const names = relevantOptions.map((o) => o.instrument_name);
    addTickerSubscriptions(
      names.filter((name) => callNames.current.has(name)),
      setCallTickers
    );
    addTickerSubscriptions(
      names.filter((name) => putNames.current.has(name)),
      setPutTickers
    );
    deribit.publicSubscribe(subs);

    // Cleanup
    return () => {
      deribit.publicUnsubscribe(subs);

      // Remove unsubbed options from the ticker objects
      const cleanTickers = (tickers) => {
        const newTickers = { ...tickers };
        names.forEach((name) => delete newTickers[name]);
        return newTickers;
      };
      setCallTickers(cleanTickers);
      setPutTickers(cleanTickers);
    };
  }, [deribit, options, setCallTickers, setPutTickers, selectedExpiration]);

  return (
    <div {...props}>
      <div className="w3-center">
        <div className="w3-card w3-section w3-theme-l1 my-expirations my-round my-scrollbars">
          {expirations.map((expiration) => (
            <div
              key={expiration}
              className={`w3-padding-large my-expiration ${
                expiration === selectedExpiration
                  ? 'w3-theme my-default-cursor'
                  : 'w3-hover-theme my-pointer'
              }`}
              onClick={() => setSelectedExpiration(expiration)}
            >
              {moment(expiration).format('MMM Do, YYYY')}
            </div>
          ))}
        </div>
        <div className="w3-section">
          <OptionChain
            optionInstruments={optionInstruments}
            callTickers={callTickers}
            putTickers={putTickers}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
          />
        </div>
      </div>
    </div>
  );
};

const OptionChain = ({
  optionInstruments,
  callTickers,
  putTickers,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  return (
    <div className="my-option-chain" {...props}>
      <HalfOptionChain
        tickers={callTickers}
        title="Calls"
        optionInstruments={optionInstruments}
        className="my-half-option-chain"
        callSide={false}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
      />
      <HalfOptionChain
        tickers={putTickers}
        title="Puts"
        optionInstruments={optionInstruments}
        className="my-half-option-chain"
        callSide={true}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
      />
    </div>
  );
};

const HalfOptionChain = ({
  title,
  tickers,
  optionInstruments,
  callSide,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  // Sort tickers in ascending order
  tickers = Object.values(tickers).sort((a, b) => {
    const strike = (ticker) => optionInstruments[ticker.instrument_name].strike;
    return strike(a) - strike(b);
  });

  // Columns which are mirrored between call and put side
  const mirrorHeaders = [<th key="strike">Strike</th>, <th key="itm">ITM</th>];
  const mirrorColumns = ({ strike, delta }) => [
    <td key="strike">{strike}</td>,
    <td key="itm">{round_to(100 * Math.abs(delta), 2)}%</td>,
  ];

  // Handle click on a row (= on an option)
  const toggleSelection = (instrument_name) => () => {
    setSelectedOptions((selection) => {
      const newSelection = new Set(selection);
      if (selection.has(instrument_name)) {
        newSelection.delete(instrument_name);
      } else {
        newSelection.add(instrument_name);
      }
      return newSelection;
    });
  };

  return (
    <TableContainer {...props}>
      <div className="w3-theme-l1 my-round w3-padding my-table-container">
        <b>{title}</b>
      </div>
      <div className="my-option-inner-container">
        <Table className="w3-striped-d2">
          <thead>
            <tr className="w3-theme-d1">
              {callSide && mirrorHeaders}
              {/* <th>Size</th> */}
              <th>IV</th>
              <th>Bid</th>
              <th>Ask</th>
              <th>IV</th>
              {/* <th>Size</th> */}
              {!callSide && mirrorHeaders.reverse()}
            </tr>
          </thead>
          <tbody>
            {tickers.map(
              ({
                instrument_name,
                // best_bid_amount,
                bid_iv,
                best_bid_price,
                best_ask_price,
                ask_iv,
                greeks: { delta },
                // best_ask_amount,
                underlying_price,
              }) => {
                const strike = optionInstruments[instrument_name].strike;
                const mirrorColumns0 = mirrorColumns({ strike, delta });
                return (
                  <tr
                    key={instrument_name}
                    className="w3-hover-l1 my-pointer"
                    onClick={toggleSelection(instrument_name)}
                  >
                    {callSide && mirrorColumns0}
                    {/* <td>{best_bid_amount}</td> */}
                    <td>{bid_iv}%</td>
                    <td>
                      <OptionPrice
                        price={best_bid_price}
                        underlying_price={underlying_price}
                      />
                    </td>
                    <td>
                      <OptionPrice
                        price={best_ask_price}
                        underlying_price={underlying_price}
                      />
                    </td>
                    <td>{ask_iv}%</td>
                    {/* <td>{best_ask_amount}</td> */}
                    {!callSide && mirrorColumns0.reverse()}
                  </tr>
                );
              }
            )}
          </tbody>
        </Table>
      </div>
    </TableContainer>
  );
};

const OptionPrice = ({ price, underlying_price }) => (
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

// Option basket
const OptionBasket = ({
  deribit,
  selectedOptions,
  setSelectedOptions,
  optionInstruments,
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
  return (
    <div className="my-option-basket-container-container">
      {!visible ? (
        <div className="w3-theme-l1 my-round-top my-transition my-pointer my-white-glow my-option-basket-show">
          <DoubleUp
            title={`Show ${selectedOptions.size} options`}
            onClick={() => setVisible(true)}
          />
        </div>
      ) : (
        <div className="w3-padding-small w3-card w3-theme-l1 my-round my-option-basket-container">
          <table className="w3-table w3-centered my-option-basket">
            <thead>
              <tr>
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
                  instrument={optionInstruments[instrument_name]}
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
      )}
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
  const { best_bid_price, best_ask_price } = ticker;

  return (
    <tr className="w3-hover-l2" {...props}>
      <td>
        <TextButton onClick={deleteOption(instrument_name)}>🗑</TextButton>
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
        <NumericalInput
          min={tick_size}
          step={tick_size}
          value={price ? price : ''}
          onChange={(e) => setPrice(e.target.value)}
          className="my-option-basket-price"
        />
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

// Order futures
const OrderFutures = ({ deribit, tickers, portfolio, ...props }) => {
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
    if (autoPremium && tickers['BTC-PERPETUAL'] && tickers[selectedFuture]) {
      const source = tickers['BTC-PERPETUAL'].last_price;
      const future = tickers[selectedFuture].last_price;
      return floats(array).map((target) => (future * target) / source);
    } else return array;
  };

  const opacity = (enabled) => (enabled ? 'my-full-opacity' : 'my-low-opacity');
  const entryOpacity = opacity(entriesEnabled);
  const riskOpacity = opacity(stopsEnabled);
  return (
    <form {...props}>
      <div className="w3-right-align my-top-buttons-container">
        <TopButton
          onClick={() => deribit.send({ method: 'private/cancel_all' })}
        >
          Cancel all
        </TopButton>
        <TopButton onClick={() => setShowConfig(!showConfig)}>
          {showConfig ? 'Hide config' : 'Show config'}
        </TopButton>
        <TopButton onClick={() => deribit.logout()}>Log out</TopButton>
      </div>
      <div className="w3-padding">
        <Row label="Equity">
          <BTC />
          {portfolio.equity}
        </Row>
        <Row label="Futures">
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
              BTC-PERPETUAL ${tickers['BTC-PERPETUAL']?.last_price}
            </div>
          )}
        </Row>
      </div>
      <div className="w3-padding">
        {showConfig && (
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
                <span className={entryOpacity}>Limit</span>{' '}
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
            className={entryOpacity}
          />
        </Row>
      </div>
      <div className="w3-padding">
        {showConfig && (
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
                <span className={riskOpacity}>Stop loss</span>
              </label>{' '}
              <Lock locked={stopsLocked} setLocked={setStopsLocked} />
            </>
          }
        >
          <NumericalDynamicInputs
            locked={stopsLocked}
            values={stops}
            setValues={setStops}
            className={riskOpacity}
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
        <Row label={<span className={riskOpacity}>Risk</span>}>
          <Risk
            riskMethod={riskMethod}
            risk={risk}
            setRisk={setRisk}
            entries={entries}
            stops={stops}
            equity={portfolio.equity}
            quantity={quantity}
            className={riskOpacity}
          />
        </Row>
      </div>
      <div className="w3-padding">
        <Row label="Label">
          <input
            className="my-small-input my-label-input"
            value={label ? label : ''}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={64}
          />
        </Row>
      </div>
      <div className="w3-padding">
        <OrderFuturesButtonContainer
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
    </form>
  );
};

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
          max={15}
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

const OrderFuturesButtonContainer = ({
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
  const entryQuantity = Math.round(quantity / entries.length);
  const stopQuantity = Math.round(quantity / stops.length);

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
                    <div className="w3-cell w3-center my-future-order-close-error-container">
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
      {
        /* neither enabled */ !(entriesEnabled || stopsEnabled) ? (
          <OrderFuturesButton className="w3-block my-round w3-grey">
            No entries nor stops enabled
          </OrderFuturesButton>
        ) : /* both enabled */ entriesEnabled && stopsEnabled ? (
          meanStop === meanEntry ? (
            <div className="w3-cell-row">
              <OrderFuturesButton
                className="w3-cell my-round-left w3-green w3-half"
                onClick={buy}
              >
                Buy
              </OrderFuturesButton>
              <OrderFuturesButton
                className="w3-cell my-round-right w3-red w3-half"
                onClick={sell}
              >
                Sell
              </OrderFuturesButton>
            </div>
          ) : meanEntry > meanStop ? (
            <OrderFuturesButton
              className="w3-block my-round w3-green"
              onClick={buy}
            >
              Buy
            </OrderFuturesButton>
          ) : (
            <OrderFuturesButton
              className="w3-block my-round w3-red"
              onClick={sell}
            >
              Sell
            </OrderFuturesButton>
          )
        ) : (
          <div className="w3-cell-row">
            <OrderFuturesButton
              className="w3-cell my-round-left w3-green w3-half"
              onClick={buy}
            >
              {entriesEnabled ? 'Buy' : 'Sell stop'}
            </OrderFuturesButton>
            <OrderFuturesButton
              className="w3-cell my-round-right w3-red w3-half"
              onClick={sell}
            >
              {entriesEnabled ? 'Sell' : 'Buy stop'}
            </OrderFuturesButton>
          </div>
        )
      }
    </>
  );
};

// Order table
const Orders = ({ deribit, orders, ...props }) => {
  // Sorting of contracts by amount of orders on them
  const amount = (future) => Object.keys(orders[future]).length;
  const byAmount = (a, b) => amount(b) - amount(a);

  // Sorting of orders by price
  const price = (o) => (o.order_type === 'limit' ? o.price : o.stop_price);
  const byPrice = (a, b) => price(b) - price(a);

  // Cancellation handlers
  const cancelByInstrument = (instrument_name) => () => {
    deribit.send({
      method: 'private/cancel_all_by_instrument',
      params: { instrument_name },
    });
  };

  const cancelByLabel = (label) => () => {
    deribit.send({
      method: 'private/cancel_by_label',
      params: { label },
    });
  };

  const cancel = (order_id) => () => {
    deribit.send({
      method: 'private/cancel',
      params: { order_id },
    });
  };

  return (
    <div className="w3-center" {...props}>
      {Object.keys(orders).every((future) => amount(future) === 0) && (
        <i>No open orders.</i>
      )}
      {Object.keys(orders)
        .filter((future) => amount(future) > 0)
        .sort(byAmount)
        .map((future) => (
          <div key={future}>
            <h4>
              {future}
              {amount(future) > 0 && (
                <TextButton onClick={cancelByInstrument(future)}>🗑</TextButton>
              )}
            </h4>
            <OrderTable>
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
                  .sort(byPrice)
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
                          <TextButton onClick={cancelByLabel(label)}>
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
                          <TextButton onClick={cancel(order_id)}>🗑</TextButton>
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </OrderTable>
          </div>
        ))}
    </div>
  );
};

const OrderTable = ({ children, ...props }) => (
  <TableContainer {...props}>
    <Table>{children}</Table>
  </TableContainer>
);

const TableContainer = ({ children, className = '', ...props }) => (
  <div
    className={`w3-margin w3-padding w3-theme-d1 my-round w3-card ${className}`}
    {...props}
  >
    {children}
  </div>
);

const Table = ({ children, className = '', ...props }) => (
  <table className={`w3-table w3-centered ${className}`} {...props}>
    {children}
  </table>
);

const OrderFuturesButton = ({ children, className, ...props }) => (
  <button
    className={`w3-card w3-section w3-btn w3-large ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Auxiliary conversions
const toTickerChannel = (instrument_name) => `ticker.${instrument_name}.100ms`;
const toChangesChannel = (instrument_name) =>
  `user.changes.${instrument_name}.100ms`;

// Auxiliary component
const TopButton = ({ children, ...props }) => (
  <button
    className="w3-mobile w3-btn w3-card w3-theme-l2 my-round my-fader my-top-button"
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
    <div className="w3-col w3-padding-small w3-left-align w3-mobile my-row-label">
      {label ? label : ''}
    </div>
    <div className="w3-col w3-padding-small w3-left-align w3-mobile my-row-content">
      {children}
    </div>
  </div>
);

// Auxiliary component
const RadioGroup = ({ options, value: checked, setValue, ...props }) =>
  Object.entries(options).map(([name, value]) => (
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
