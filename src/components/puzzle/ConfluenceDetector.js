import React, { memo, useRef, useEffect, useState } from 'react';

import { select } from 'd3-selection';
import { extent, median, mean } from 'd3-array';
import { axisLeft, axisRight } from 'd3-axis';
import { scaleLinear } from 'd3-scale';

import { subsequentPairs } from '../../util/array';
import Panel from '../common/Panel';

// Local storage variables
const timeframesId = 'confluence-detector-timeframes';
const indicatorsId = 'confluence-detector-indicators';

export default memo(({
  fixedHeight = 900,
  tolerance = 3,
  lumpThreshold = 30,
  margin = { left: 135, right: 25, top: 25, bottom: 25 },
  // Include forecast to remind me to make a "future confluence detector"
  data: { history, forecast },
  // Note: a difficulty would be to harmonioulsy visualize future confluence
  //       over different timeframes. Imagine a time slider with a step of one
  //       hour. Imagine you want to slide a day into the future. There are only
  //       6 or so hourly predictions available. However, there would be a
  //       sufficient amount of 4-hourly (or higher) predictions available.
  // Suggestion: just stop considering the timeframes with an insufficient
  //             amount of predictions.
  //             The alternative would be to go with wildly inaccurate
  //             predictions, possibly also complicating things with differing
  //             amounts of predictions amongst the timeframes.
}) => {
  const rimsvg = useRef(null);

  // Retrieve custom timeframes and indicators from local storage or use default
  const storedTimeframes = localStorage.getItem(timeframesId);
  const [timeframes, setTimeframes] = useState(storedTimeframes
    ? JSON.parse(storedTimeframes)
    : {
    '1h':  false,
    '2h':  true,
    '3h':  false,
    '4h':  true,
    '6h':  false,
    '12h': true,
    '1d':  true,
    '2d':  true,
    '3d':  false,
    '1w':  true,
    '1M':  true,
    '3M':  false,
  });
  const storedIndicators = localStorage.getItem(indicatorsId);
  const [indicators, setIndicators] = useState(storedIndicators
    ? JSON.parse(storedIndicators)
    : {
    'ema_21':  true,
    'ema_55':  true,
    'ema_89':  true,
    'ema_200': true,
    'ema_377': true,
    'sma_10':  false,
    'sma_200': true,
  });

  // Store custom timeframes and indicators in local storage
  useEffect(() => {
    localStorage.setItem(timeframesId, JSON.stringify(timeframes));
    localStorage.setItem(indicatorsId, JSON.stringify(indicators));
  }, [timeframes, indicators]);

  // Get, for example, timeframes or indicators which are set to true
  const getSelected = obj => Object.keys(obj).filter(k => obj[k]);

  // Use D3 to draw a custom visualization
  // Note: there should be a way to harness the true power of D3's general
  //       update pattern whenever timeframes or indicators change.
  useEffect(() => {
  
    // Compile list of customized data
    const data = [];
    getSelected(timeframes).forEach(timeframe => {
      getSelected(indicators).forEach(name => {
        const price = history[timeframe][name][0].y;
        if (price) {
          data.push({ timeframe, name, price });
        }
      });
    });

    // Grab current price, also add it to data
    const price = history[Object.keys(history)[0]].close[0].y;
    data.push({
      timeframe: '',
      name: 'Current Price',
      price,
    });

    // Inspired by Christophe Leys' proposed outlier removal technique
    // https://dipot.ulb.ac.be/dspace/bitstream/2013/139499/1/Leys_MAD_final-libre.pdf
    // Filter out levels that're too far from the current price
    const mad = median(data, d => Math.abs(d.price - price));
    const lower = price - tolerance * mad,
          upper = price + tolerance * mad;
    const toleratedData = data.filter(d => lower < d.price && d.price < upper);

    // Abstracted data structure
    const lumps = new Lumps(toleratedData, lumpThreshold);

    // Axes
    const priceScale = scaleLinear()
      .domain(extent(lumps.sortedPrices))
      .range([fixedHeight - margin.bottom, margin.top]);

    const priceAxis = g => g
      .call(axisLeft(priceScale)
        .tickValues(lumps.sortedPrices)
        .tickSizeOuter(0));

    const lumpAxis = g => g
      .call(axisLeft(priceScale)
        .tickValues(lumps.representatives)
        .tickSizeInner(50)
        .tickPadding(8)
        .tickSizeOuter(0));

    const lumpNameAxis = g => g
      .call(axisRight(priceScale)
        .tickValues(lumps.representatives)
        .tickSizeOuter(0));

    const unlumpNameAxis = g => g
      .call(axisRight(priceScale)
        .tickValues(lumps.unlumps.map(d => d.price))
        .tickSizeOuter(0));

    // Grab (and clear) the SVG-element
    const svg = select(rimsvg.current);
    svg.selectAll('*').remove();

    const translateAxis = g => g
      .attr('transform', `translate(${margin.left},0)`);

    // Draw prices
    svg.append('g')
      .attr('class', 'price-axis')
      .call(translateAxis)
      .call(priceAxis);
      
    // Remove lumped prices
    svg.selectAll('.price-axis .tick text')
      .filter(d => lumps.getIndex(d) >= 0)
      .remove();

    // Draw representatives for lumped prices
    svg.append('g')
      .attr('class', 'lump-axis')
      .call(translateAxis)
      .call(lumpAxis);

    // Draw names of lumped prices
    svg.append('g')
      .attr('class', 'lump-name-axis')
      .call(translateAxis)
      .call(lumpNameAxis);
    svg.selectAll('.lump-name-axis text')
      .text((_, i) => lumps.names[i]);

    // Draw names of unlumped prices
    svg.append('g')
      .attr('class', 'unlump-name-axis')
      .call(translateAxis)
      .call(unlumpNameAxis);
    svg.selectAll('.unlump-name-axis text')
      .text((_, i) => d2string(lumps.unlumps[i]));

    // Set width after all is said and done
    const bb = svg.node().getBBox();
    svg.attr('width', bb.width + bb.x);

    // Mark the current price
    svg.append('circle')
      .attr('fill', '#b33')
      .attr('r', 5)
      .attr('cx', margin.left)
      .attr('cy', priceScale(price))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
  }, [
    // props
    fixedHeight, history, tolerance, lumpThreshold, margin,
    // states
    timeframes, indicators,
  ]);

  return <Panel title="Confluence Detector">
    <div className="w3-cell-row">
      <div
        className="w3-cell w3-cell-top w3-content"
        style={{width: '175px', minWidth: '175px'}}
      >
        <Checks title="Timeframes" getter={timeframes} setter={setTimeframes}/>
        <Checks
          title="MAs"
          getter={indicators}
          setter={setIndicators}
          key2id={name => name.replace('_', '-')}
          key2label={name2string}
        />
      </div>
      <div className="w3-cell">
        <svg
          id="confluence-detector"
          ref={rimsvg}
          role="img"
          height={fixedHeight}
        />
      </div>
    </div>
  </Panel>;
});

// Auxiliary function; e.g. convert 'ema_200' to 'EMA 200'
const name2string = name => name.toUpperCase().replace('_', ' ');
// Auxiliary function; basically a datum's toString()
const d2string = d => `${d.timeframe} ${name2string(d.name)}`;

// Auxiliary component to customize timeframes and indicators
const Checks = ({
  title,
  getter,
  setter,
  key2id    = x => x,
  key2label = x => x,
}) => <ul style={{listStyleType: 'none', lineHeight: 2, fontFamily: 'Kreon'}}>
  <li>{title}</li>
  {
    Object.keys(getter).map(key => {
      const id = `${key2id(key)}-check`
      return <li key={id}>
        <label htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            className="w3-check"
            checked={getter[key]}
            onChange={e => {
              const newState = { ...getter };
              newState[key] = e.target.checked;
              setter(newState);
            }}
          />
          <span style={{margin: '0 7px 0 5px'}}>
            {key2label(key)}
          </span>
        </label>
      </li>;
    })
  }
</ul>;

// Auxiliary data structure
class Lumps {
  constructor(points, threshold, maxNameLength = 5) {

    // Sort the points array by price
    this.sortedData = points.sort((d, e) => d.price < e.price ? -1 : 1);
    this.sortedPrices = this.sortedData.map(d => d.price);

    // Run over the sorted prices and lump points together
    this.lumps = [];
    this.unlumps = [this.sortedData[0]];
    const didLump = [false];
    subsequentPairs(this.sortedPrices).forEach(([d, e], i) => {
      const shouldLump = e - d <= threshold;
      if (shouldLump) {
        if (!didLump[i]) {
          this.lumps.push([this.sortedData[i]]);
          this.unlumps.pop();
        }
        const lastLump = this.lumps[this.lumps.length - 1];
        lastLump.push(this.sortedData[i + 1]);
      } else {
        this.unlumps.push(this.sortedData[i + 1]);
      }
      didLump.push(shouldLump);
    });

    // Compute representatives; chose mean. A more sophisticated approach could
    // be to assign weights to data points, e.g. longer timeframe MAs would
    // carry higher weight than shorter timeframe MAs
    this.representatives = this.lumps.map(lump => mean(lump, d => d.price));

    // Generate names
    this.names = this.lumps.map(lump => {
      const d2name = d => d.map(d2string).join(' + ');
      if (lump.length <= maxNameLength) {
        return d2name(lump);
      } else {
        return `${d2name(lump.slice(0, maxNameLength))}, ... (${lump.length})`;
      }
    });
  }

  // Get the index of the lump of associated with the given price, if any,
  // otherwise return -1.
  getIndex = price => {
    for (let i = 0; i < this.lumps.length; i++) {
      const lumpedPrices = Array.from(this.lumps[i], d => d.price);
      if (lumpedPrices.includes(price)) {
        return i;
      }
    }
    return -1;
  };
}