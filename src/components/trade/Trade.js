import React, { useState, useEffect, useRef, useContext } from 'react';

import OrderOptions from './OrderOptions';
import Position from './Position';
import OptionBasket from './OptionBasket';
import OrderFutures from './OrderFutures';
import Orders from './Orders';

import Panel from '../common/Panel';
import { useLocal, useLocalSet } from '../../hooks/useStorage';
import { DeribitContext } from '../../contexts/Deribit';
import { AuthState, ReadyState } from '../../sources/DeribitWebSocket';
import { toTickerChannel } from './Common';

// Skip authentication and log straight into testnet
// const DEV_MODE = false;
const DEV_MODE = true;

// Only Deribit is implemented right now
export default () => <DeribitTrade />;

const DeribitTrade = (props) => {
  const { deribit, readyState, authState, test, setTest } = useContext(
    DeribitContext
  );
  if (!deribit) return null;

  return deribit.maybeDown ? (
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
  );
};

const DeribitAuth = ({
  deribit,
  test,
  setTest,
  readyState,
  authState,
  ...props
}) => {
  // Engage developer mode
  useEffect(() => {
    if (DEV_MODE && deribit) {
      setTest(true);
      deribit.auth({
        // key: '5jgRJ5dz',
        // secret: 'MvocUP-l8nPift3btFFZ9cJIY08NZcbG9NqpxvdP_BY',
        key: 'a68zTY-U',
        secret: 'jFgvnkG6K96u7JuAXEOvWaO9x_P9oZA1txkMGCvbll0',
      });
    }
  }, [deribit, setTest]);

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
  const [instruments, setInstruments] = useState([]);
  const [options, setOptions] = useState([]);
  const [orders, setOrders] = useState({});
  const [positions, setPositions] = useState({});
  const [portfolio, setPortfolio] = useState({});
  const [
    analysisPositions,
    setAnalysisPositions,
  ] = useLocal('deribit-analysis-positions', { initialValue: {} });

  // Setup information retrieval needed to provide a trading interface
  useEffect(() => {
    // We won't actually be subscribing until the end of this hook
    // Instead we'll be accumulating channels and their callbacks
    const pubSubs = {};
    const privSubs = {};

    // Subscribe to portfolio
    privSubs['user.portfolio.btc'] = ({ data }) => setPortfolio(data);

    // Subscribe to change
    privSubs['user.changes.any.btc.100ms'] = ({
      data: { positions, orders },
    }) => {
      updateOrders(orders);
      updatePositions(positions);
    };

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

    const setup = Promise.all([
      // Fetch instruments
      deribit
        .send({
          method: 'public/get_instruments',
          params: { currency: 'btc' },
        })
        .then(({ result: instruments }) => {
          const newInstruments = {};
          instruments.forEach((instrument) => {
            newInstruments[instrument.instrument_name] = instrument;
          });
          setInstruments(newInstruments);

          // Separate options
          setOptions(instruments.filter((r) => r.kind === 'option'));

          // Subscribe to futures' tickers
          instruments
            .filter((r) => r.kind === 'future')
            .forEach(({ instrument_name }) => {
              const channel = toTickerChannel(instrument_name);
              pubSubs[channel] = ({ data }) => {
                setFuturesTickers((tickers) => ({
                  ...tickers,
                  [instrument_name]: data,
                }));
              };
            });
        }),

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
        // Do actual subscribing
        deribit.publicSubscribe(pubSubs);
        deribit.privateSubscribe(privSubs);
      });

    // Unsubscribe when done, making sure setup ran first
    return () =>
      setup.then(() => {
        deribit.publicUnsubscribe(pubSubs);
        deribit.privateUnsubscribe(privSubs);
      });
  }, [deribit]);

  // Used by the OptionBasket and OrderOptions components
  const [selectedOptions, setSelectedOptions] = useLocalSet(
    'deribit-selected-options'
  );

  // Render panels
  const optionsMapped = Object.keys(instruments).length > 0;
  return (
    <>
      <div className="my-trading-interface-container">
        <div className="my-trading-interface" {...props}>
          <Panel title="Order Options" className="my-order-options">
            <OrderOptions
              deribit={deribit}
              options={options}
              instruments={instruments}
              selectedOptions={selectedOptions}
              setSelectedOptions={setSelectedOptions}
            />
          </Panel>
          <div className="my-trading-interface-core">
            <Panel className="my-order-futures">
              <OrderFutures
                deribit={deribit}
                tickers={futuresTickers}
                portfolio={portfolio}
                setAnalysisPositions={setAnalysisPositions}
              />
            </Panel>
            <Panel className="my-position">
              <Position
                deribit={deribit}
                positions={positions}
                instruments={instruments}
                futuresTickers={futuresTickers}
                analysisPositions={analysisPositions}
                setAnalysisPositions={setAnalysisPositions}
              />
            </Panel>
          </div>
          <Panel className="my-orders">
            <Orders deribit={deribit} orders={orders} />
          </Panel>
        </div>
      </div>
      {selectedOptions.size > 0 && optionsMapped && (
        <OptionBasket
          deribit={deribit}
          selectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          instruments={instruments}
          setAnalysisPositions={setAnalysisPositions}
        />
      )}
    </>
  );
};
