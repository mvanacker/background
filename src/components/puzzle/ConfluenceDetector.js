import React, { memo, useRef, useEffect } from 'react';

import { select } from 'd3-selection';
import { extent, median, mean } from 'd3-array';
import { axisLeft, axisRight } from 'd3-axis';
import { scaleLinear } from 'd3-scale';

import { subsequentPairs } from '../../util/array';

// Auxiliary function; basically a datum's toString()
const d2name = d => `${d.timeframe} ${d.name.toUpperCase().replace('_', ' ')}`;

export default memo(({
  width = 700,
  height = 1000,
  tolerance = 3,
  lumpThreshold = 30,
  margin = { left: 200, right: 25, top: 25, bottom: 25 },
  // include forecast to remind to make a "future confluence detector"
  data: { history, forecast },
}) => {
  const rimsvg = useRef(null);

  // Use D3 to draw a custom visualization
  useEffect(() => {
  
    // Compile list of relevant prices
    const relev_tfs = ['2h', '4h', '12h', '1d', '2d', '1w', '1M'];
    // const relev_tfs = Object.keys(history);
    const relev_names = [
      'ema_21', 'ema_55', 'ema_89', 'ema_200', 'ema_377', 'sma_200',
    ];
    const data = [];
    relev_tfs.forEach(timeframe => {
      relev_names.forEach(name => {
        const price = history[timeframe][name][0].y;
        if (price) {
          data.push({ timeframe, name, price });
        }
      });
    });

    // Inspired by Christophe Leys' proposed outlier removal technique
    // https://dipot.ulb.ac.be/dspace/bitstream/2013/139499/1/Leys_MAD_final-libre.pdf
    // Filter out levels that're too far from the current price
    const m = median(data, d => d.price);
    const mad = median(data, d => Math.abs(d.price - m));
    const price = history[relev_tfs[0]].close[0].y;
    const lower = price - tolerance * mad,
          upper = price + tolerance * mad;
    const toleratedData = data.filter(d => lower < d.price && d.price < upper);

    // Abstracted data structure
    const lumps = new Lumps(toleratedData, lumpThreshold);

    // Axes
    const priceScale = scaleLinear()
      .domain(extent(lumps.sortedPrices))
      .range([height - margin.bottom, margin.top]);

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
        .tickValues(lumps.unrepresentatives.map(d => d.price))
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
      .text((_, i) => d2name(lumps.unrepresentatives[i]));
  }, [width, height, history, tolerance, lumpThreshold, margin]);

  return <svg
    id="confluence-detector"
    ref={rimsvg}
    role="img"
    width={width}
    height={height}
  />;
});

class Lumps {
  constructor(points, threshold) {

    // Sort the points array by price
    this.sortedData = points.sort((d, e) => d.price < e.price ? -1 : 1);
    this.sortedPrices = this.sortedData.map(d => d.price);

    // Run over the sorted prices and lump points together
    this.lumps = [];
    this.unrepresentatives = [this.sortedPrices[0]];
    const didLump = [false];
    subsequentPairs(this.sortedPrices).forEach(([d, e], i) => {
      const shouldLump = e - d <= threshold;
      if (shouldLump) {
        if (!didLump[i]) {
          this.lumps.push([this.sortedData[i]]);
          this.unrepresentatives.pop();
        }
        const lastLump = this.lumps[this.lumps.length - 1];
        lastLump.push(this.sortedData[i + 1]);
      } else {
        this.unrepresentatives.push(this.sortedData[i + 1]);
      }
      didLump.push(shouldLump);
    });

    // Compute representatives; chose mean. A more sophisticated approach could
    // be to assign weights to data points, e.g. longer timeframe MAs would
    // carry higher weight than shorter timeframe MAs
    this.representatives = this.lumps.map(lump => mean(lump, d => d.price));

    // Generate names
    this.names = this.lumps.map(lump => lump.map(d2name).join(' + '));
  }

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