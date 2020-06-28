import React, { useEffect, useState, useRef } from 'react';
import moment from 'moment';
import { round_to } from '../../util/math';
import { useLocal } from '../../hooks/useStorage';
import { toTickerChannel, TableContainer, Table, OptionPrice } from './Common';

export default ({
  deribit,
  options,
  portfolio,
  instruments,
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
  // Note: actually subscription should probably already take place inside the
  //       option chain component, that would be easily extensible to support
  //       selecting multiple chains
  useEffect(() => {
    if (!selectedExpiration) {
      return;
    }

    // Any expiration date will have a chain of options associated with it
    // Select those relevant to us
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
    <div className="w3-center" {...props}>
      <div className="w3-card w3-section w3-theme-l1 my-expirations my-round my-scrollbars">
        {expirations.map((expiration) => (
          <div
            key={expiration}
            className={`w3-padding-large my-expiration my-pointer w3-hover-theme ${
              expiration === selectedExpiration && 'w3-theme'
            }`}
            onClick={() => {
              setSelectedExpiration(
                expiration === selectedExpiration ? null : expiration
              );
            }}
          >
            {moment(expiration).format('MMM Do, YYYY')}
          </div>
        ))}
      </div>
      {selectedExpiration && (
        <div className="w3-section">
          <OptionChain
            instruments={instruments}
            callTickers={callTickers}
            putTickers={putTickers}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
          />
        </div>
      )}
    </div>
  );
};

const OptionChain = ({
  instruments,
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
        instruments={instruments}
        className="my-half-option-chain"
        callSide={false}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
      />
      <HalfOptionChain
        tickers={putTickers}
        title="Puts"
        instruments={instruments}
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
  instruments,
  callSide,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  // Sort tickers in ascending order
  tickers = Object.values(tickers).sort((a, b) => {
    const strike = (ticker) => instruments[ticker.instrument_name].strike;
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
          <thead className="my-sticky-thead">
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
                const strike = instruments[instrument_name].strike;
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
