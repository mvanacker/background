import React, { useEffect, useRef, useCallback } from 'react';

import { select } from 'd3-selection';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { axisLeft, axisBottom } from 'd3-axis';
import { line } from 'd3-shape';

import { removeOverlap, removeOverlapWithDatum } from '../../util/d3-axis-util';
import { premium } from '../../util/math.bs';
import { useLocalSet } from '../../hooks/useStorage';
import { PanelTitle } from '../common/Panel';
import BTC from '../common/Bitcoin';

import { DeleteButton } from './Common';

export default ({
  deribit,
  positions,
  instruments,
  futuresTickers,
  analysisPositions,
  setAnalysisPositions,
  ...props
}) => {
  const isReady = useCallback(
    () =>
      positions &&
      instruments &&
      Object.keys(positions).length &&
      Object.keys(instruments).length,
    [positions, instruments]
  );

  const { future: futures, option: options } = usePositions(
    deribit,
    isReady,
    instruments,
    positions
  );
  const { future: analysisFutures, option: analysisOptions } = usePositions(
    deribit,
    isReady,
    instruments,
    analysisPositions
  );

  //
  const isReadyForPNL = useCallback(
    () =>
      isReady() &&
      futuresTickers &&
      'BTC-PERPETUAL' in futuresTickers &&
      Object.keys(futures).every(
        (instrument_name) => instrument_name in futuresTickers
      ),
    [isReady, futuresTickers, futures]
  );

  // Keep track of which positions were deselected
  // This allows easily defaulting to all positions being selected
  const [deselectedPositions, setDeselectedPositions] = useLocalSet(
    'deribit-deselected-positions'
  );
  const [
    deselectedAnalysisPositions,
    setDeselectedAnalysisPositions,
  ] = useLocalSet('deribit-deselected-analysis-positions');

  return !isReadyForPNL() ? null : (
    <div className="my-position-inner" {...props}>
      <PanelTitle className="my-position-title">Position</PanelTitle>
      <div className="my-pnl-chart-container">
        <PnlChart
          deribit={deribit}
          futures={futures}
          options={options}
          deselectedPositions={deselectedPositions}
          analysisFutures={analysisFutures}
          analysisOptions={analysisOptions}
          deselectedAnalysisPositions={deselectedAnalysisPositions}
          futuresTickers={futuresTickers}
        />
      </div>
      <div className="my-position-list-container">
        <PositionList
          positions={analysisFutures}
          stringify={stringifyAnalysisPosition(setAnalysisPositions)}
          deselectedPositions={deselectedAnalysisPositions}
          setDeselectedPositions={setDeselectedAnalysisPositions}
        />
        <PositionList
          positions={analysisOptions}
          stringify={stringifyAnalysisPosition(setAnalysisPositions)}
          deselectedPositions={deselectedAnalysisPositions}
          setDeselectedPositions={setDeselectedAnalysisPositions}
        />
        <PositionList
          positions={futures}
          stringify={stringifyPosition}
          deselectedPositions={deselectedPositions}
          setDeselectedPositions={setDeselectedPositions}
        />
        <PositionList
          positions={options}
          stringify={stringifyPosition}
          deselectedPositions={deselectedPositions}
          setDeselectedPositions={setDeselectedPositions}
        />
      </div>
    </div>
  );
};

// Separate futures from options positions
// Merge position and instrument objects
// Include a snapshot of the option tickers
const usePositions = (deribit, isReady, instruments, positions) => {
  const ref = useRef(emptyPositions());

  useEffect(() => {
    if (!isReady()) return;
    Promise.all(
      Object.keys(positions).map((instrument_name) =>
        deribit.send({ method: 'public/ticker', params: { instrument_name } })
      )
    ).then((result) => {
      ref.current = emptyPositions();
      result.forEach(({ result: ticker }) => {
        const { instrument_name } = ticker;
        const position = positions[instrument_name];
        const { size, kind } = position;
        if (size !== 0) {
          ref.current[kind][instrument_name] = {
            ...ticker,
            ...position,
            ...instruments[instrument_name],
          };
        }
      });
    });
  }, [deribit, isReady, instruments, positions]);

  return ref.current;
};
const emptyPositions = () => ({ future: {}, option: {} });

const PositionList = ({
  positions,
  stringify,
  deselectedPositions,
  setDeselectedPositions,
}) => (
  <ul className="my-position-list">
    {Object.values(positions)
      .filter(({ size }) => size !== 0)
      .map((position) => {
        const { instrument_name } = position;
        return (
          <li key={instrument_name}>
            <label>
              <input
                type="checkbox"
                className="my-check"
                checked={!deselectedPositions.has(instrument_name)}
                onChange={() => {
                  setDeselectedPositions((positions) => {
                    const newPositions = new Set(positions);
                    if (newPositions.has(instrument_name)) {
                      newPositions.delete(instrument_name);
                    } else {
                      newPositions.add(instrument_name);
                    }
                    return newPositions;
                  });
                }}
              />{' '}
              {stringify(position)}
            </label>
          </li>
        );
      })}
  </ul>
);

const stringifyPosition = ({
  size,
  instrument_name,
  average_price,
  average_price_usd,
}) => {
  return (
    <>
      {size}x {instrument_name} from{' '}
      {average_price_usd ? (
        <>
          <BTC />
          {average_price} (${average_price_usd.toFixed(2)})
        </>
      ) : (
        `$${average_price}`
      )}
    </>
  );
};

const stringifyAnalysisPosition = (setAnalysisPositions) => (position) => {
  return (
    <>
      <DeleteButton
        title="Delete Analysis Position"
        onClick={() =>
          setAnalysisPositions((positions) => {
            const newPositions = { ...positions };
            delete newPositions[position.instrument_name];
            return newPositions;
          })
        }
      />{' '}
      {/* <i
        className="fas fa-search-dollar my-margin-lr"
        title="Analysis Position"
      /> */}
      {stringifyPosition(position)}
    </>
  );
};

const PnlChart = ({
  deribit,
  futures,
  options,
  deselectedPositions,
  analysisFutures,
  analysisOptions,
  deselectedAnalysisPositions,
  futuresTickers,
  width = 400,
  height = 400,
  padding = { top: 100, right: 1000, bottom: 100, left: 1000 },
  margin = { top: 20, right: 30, bottom: 30, left: 55 },
  minScaleWidthX = 1000,
  ...props
}) => {
  // Refer to tickers objects so not every tick causes a repaint
  const tickersRef = useRef();
  useEffect(() => {
    tickersRef.current = { ...tickersRef.current, ...futuresTickers };
  }, [futuresTickers]);

  // References to elements inside the SVG
  // These will be the subjects of D3 manipulations
  const clipRect = useRef();
  const expirationPath = useRef();
  const currentPath = useRef();
  const zeroLine = useRef();
  const verticalLines = useRef();
  const xAxis = useRef();
  const yAxis = useRef();

  // Parts of the initial construction needed in subsequent module(s)
  const x = useRef({ scale: null, left: null, right: null });
  const y = useRef({ scale: null, top: null, bottom: null });

  useEffect(() => {
    // Select positions, given sets of deselected positions (as props)
    const deselect = (positions, analysisPositions) =>
      Object.values(positions)
        .filter(
          (position) => !deselectedPositions.has(position.instrument_name)
        )
        .concat(
          Object.values(analysisPositions).filter(
            (analysisPosition) =>
              !deselectedAnalysisPositions.has(analysisPosition.instrument_name)
          )
        );
    const futuresPositions = deselect(futures, analysisFutures);
    const optionsPositions = deselect(options, analysisOptions);

    // Normalize futures entries
    const perpetual_price = tickersRef.current['BTC-PERPETUAL'].last_price;
    futuresPositions.forEach((future) => {
      future.average_price_norm =
        (perpetual_price * future.average_price) /
        tickersRef.current[future.instrument_name].last_price;
    });

    // Isolate (normalized) entries and strikes
    const entries = futuresPositions.map((future) => future.average_price_norm);
    const strikes = optionsPositions.map((option) => option.strike);
    const keyPrices = [...entries, ...strikes, perpetual_price].sort(
      (a, b) => a - b
    );

    // Compute x-axis domain
    [x.current.left, x.current.right] = extent(keyPrices);
    x.current.left -= padding.left;
    x.current.right += padding.right;

    // Widen x-scale if necessary
    const scaleWidthX = x.current.right - x.current.left;
    if (scaleWidthX < minScaleWidthX) {
      const extraWidth = minScaleWidthX - scaleWidthX / 2;
      x.current.left += extraWidth;
      x.current.right += extraWidth;
    }

    // Set up x-scale
    x.current.scale = scaleLinear()
      .domain([x.current.left, x.current.right])
      .range([margin.left, width - margin.right]);

    // Draw x-axis
    select(xAxis.current)
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(axisBottom(x.current.scale).tickValues(keyPrices).tickSizeOuter(0))
      // Remove overlapping labels on the x-axis,
      // but make sure perpetual price takes priority
      .call(removeOverlapWithDatum, perpetual_price)
      .call(removeOverlap);

    // Set up PNL computation
    const pnlPoints = {
      quote: { expiration: [], current: [] },
      // base: { expiration: [], current: [] },
    };
    const now = Date.now();

    // Simplistic computation of time to go in years (~TODO)
    const years = (time) => (time - now) / (1000 * 60 * 60 * 24 * 365.25);

    // Set up y-domain computation
    y.current.bottom = +Infinity;
    y.current.top = -Infinity;

    // Do computations
    const resolution = ((x.current.right - x.current.left + 1) / width) * 5;
    for (
      let price = x.current.left;
      price <= x.current.right;
      price += resolution
    ) {
      let pnlPoint = { expiration: 0, current: 0 };

      // Options PNL
      optionsPositions.forEach(
        ({
          mark_iv,
          average_price_usd,
          expiration_timestamp,
          option_type,
          size,
          strike,
        }) => {
          // Note: average_price is in base currency (BTC)
          //       while x and strike are in quote currency ($)
          // Normalize to quote currency with index_price
          const computePnl = (yearsRemaining) => {
            const entryPrice = average_price_usd;
            const optionPrice = premium[option_type](
              price,
              strike,
              mark_iv / 100,
              yearsRemaining
            );
            return size * (optionPrice - entryPrice);
          };

          // Compute
          pnlPoint.expiration += computePnl(0);
          pnlPoint.current += computePnl(years(expiration_timestamp));
        }
      );

      // Futures PNL
      futuresPositions.forEach(({ average_price_norm, size }) => {
        const pnl = size * (1 - average_price_norm / price);
        pnlPoint.expiration += pnl;
        pnlPoint.current += pnl;
      });

      // Tally
      pnlPoints.quote.expiration.push({ x: price, y: pnlPoint.expiration });
      pnlPoints.quote.current.push({ x: price, y: pnlPoint.current });
      // pnlPoints.base.expiration.push({ x: price, y: pnlPoint.expiration / price });
      // pnlPoints.base.current.push({ x: price, y: pnlPoint.current / price });

      // Measure y-domain while we're here
      y.current.bottom = Math.min(y.current.bottom, pnlPoint.expiration);
      y.current.top = Math.max(y.current.top, pnlPoint.expiration);
    }

    // Apply padding to y-axis
    y.current.bottom -= padding.bottom;
    y.current.top += padding.top;

    // Set up y-scale
    y.current.scale = scaleLinear()
      .domain([y.current.bottom, y.current.top])
      .range([height - margin.bottom, margin.top]);

    // Draw y-axis
    select(yAxis.current)
      .attr('transform', `translate(${margin.left},0)`)
      .call(axisLeft(y.current.scale).ticks(5).tickSizeOuter(0));

    // Clip plots
    select(clipRect.current)
      .attr('x', x.current.scale(x.current.left))
      .attr('y', y.current.scale(y.current.top))
      .attr(
        'width',
        x.current.scale(x.current.right) - x.current.scale(x.current.left)
      )
      .attr(
        'height',
        y.current.scale(y.current.bottom) - y.current.scale(y.current.top)
      );

    // Draw plots
    const pnlLine = line()
      .x((d) => x.current.scale(d.x))
      .y((d) => y.current.scale(d.y));
    select(expirationPath.current).attr(
      'd',
      pnlLine(pnlPoints.quote.expiration)
    );
    select(currentPath.current).attr('d', pnlLine(pnlPoints.quote.current));

    // Draw zero line
    select(zeroLine.current)
      .attr('x1', x.current.scale(x.current.left))
      .attr('y1', y.current.scale(0))
      .attr('x2', x.current.scale(x.current.right))
      .attr('y2', y.current.scale(0));

    // Draw vertical lines
    select(verticalLines.current)
      .selectAll('line')
      .data(keyPrices)
      .join('line')
      .attr('x1', (price) => x.current.scale(price))
      .attr('x2', (price) => x.current.scale(price))
      .attr('y1', y.current.scale(y.current.top))
      .attr('y2', y.current.scale(y.current.bottom))
      .attr('class', 'my-grid-line');
  }, [
    futures,
    options,
    deselectedPositions,
    analysisFutures,
    analysisOptions,
    deselectedAnalysisPositions,
    width,
    height,
    margin.top,
    margin.right,
    margin.bottom,
    margin.left,
    padding.top,
    padding.right,
    padding.bottom,
    padding.left,
    minScaleWidthX,
  ]);

  const priceLine = useRef();
  const priceDot = useRef();
  useEffect(() => {
    const price = futuresTickers['BTC-PERPETUAL'].last_price;
    const _x = x.current.scale(price);
    const _y = {
      top: y.current.scale(y.current.top),
      bottom: y.current.scale(y.current.bottom),
    };
    select(priceLine.current)
      .attr('x1', _x)
      .attr('x2', _x)
      .attr('y1', _y.top)
      .attr('y2', _y.bottom);
    select(priceDot.current)
      .attr('cx', _x)
      .attr('cy', _y.bottom + 1);
  }, [futuresTickers, deselectedPositions]);

  const clipId = 'my-pnl-chart-clip';
  const clipUrl = `url(#${clipId})`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="my-pnl-chart" {...props}>
      <clipPath id={clipId}>
        <rect ref={clipRect} />
      </clipPath>
      <path
        ref={expirationPath}
        clipPath={clipUrl}
        className="my-expiration-path"
      />
      <path ref={currentPath} clipPath={clipUrl} className="my-current-path" />
      <line ref={zeroLine} className="my-grid-line" />
      <g ref={verticalLines} />
      <g ref={xAxis} />
      <g ref={yAxis} />
      <line ref={priceLine} className="my-price-line" />
      <circle ref={priceDot} className="my-price-dot" />
    </svg>
  );
};
