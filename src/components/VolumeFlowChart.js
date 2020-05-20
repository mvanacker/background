import React, { useEffect, useRef } from 'react';

import { select } from 'd3-selection';
import { extent, max } from 'd3-array';
import { scaleLog, scaleLinear, scaleUtc } from 'd3-scale';
import { axisLeft, axisRight, axisBottom } from 'd3-axis';
import { line } from 'd3-shape';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';

import beepDown from '../assets/beep_down.mp3';
import beepUp from '../assets/beep_up.mp3';
import { DATA_URI, REFRESH_RATE } from './config';

import '../volume-flow-chart.css';

// Note on REFRESH_RATE: it is assumed in the code below that this value is
// at least the update rate of the back-end.

const MIN_FLOW = 1000;
const MAX_FLOW = 1000000;
const ALARM_SCALAR = 75;

export default function VolumeFlowChart() {

  // Decide dimensions
  const margin = { top: 10, bottom: 25, flow: 65, price: 50, openInterest: 40 };
  const width = 468;
  const height = 300;

  // Reference to SVG's DOM-element
  const d3svg = useRef(null);

  // Identities
  const beepUpId = 'beep-up';
  const beepDownId = 'beep-down';
  const openInterestId = 'open-interest';
  const priceId = 'price';
  const buyFlowId = 'buy-flow';
  const sellFlowId = 'sell-flow';
  
  // Control alarms
  const alarm = (audioId, flow, price) => {
    const beep = document.getElementById(audioId);
    try {
      if (flow >= price * ALARM_SCALAR) {
        beep.play();
      } else {
        beep.pause();
      }
    } catch(e) {
      console.error(e);
    }
  }

  // Draw after render
  useEffect(() => {

    // Interval's handle
    let handle;

    // Fetch histories
    // Note: assuming buy flow and sell flow domains are equal
    Promise.all([
      `${DATA_URI}/data/buy-flow-history.json`,
      `${DATA_URI}/data/sell-flow-history.json`,
      `${DATA_URI}/data/price-history.json`,
      `${DATA_URI}/data/open-interest-history.json`,
    ].map(uri => fetch(uri).then(r => r.json())))

      // Transform data
      .then(data => {
        const [buyFlow, sellFlow, price, openInterest] = data;
        return {

          // Transform buy flow
          buyFlow: buyFlow.map(({ time, buyFlow }) => ({
            x: new Date(time),
            y: 1 + parseFloat(buyFlow),
          })),

          // Transform sell flow
          sellFlow: sellFlow.map(({ time, sellFlow }) => ({
            x: new Date(time),
            y: 1 + parseFloat(sellFlow),
          })),

          // Transform prices
          price: price.map(({ time, price }) => ({
            x: new Date(time),
            y: parseFloat(price),
          })),

          // Transform open interest
          openInterest: openInterest.map(({ time, openInterest }) => ({
            x: new Date(time),
            y: parseFloat(openInterest),
          })),
        };
      })

      // Draw the initial chart
      .then(({ buyFlow, sellFlow, price, openInterest }) => {
        const last = buyFlow.length - 1;

        // Write initial values into divs
        document.getElementById(openInterestId).innerText
          = openInterest[last].y.toLocaleString();
        document.getElementById(priceId).innerText
          = price[last].y.toLocaleString();
        document.getElementById(buyFlowId).innerText
          = buyFlow[last].y.toLocaleString();
        document.getElementById(sellFlowId).innerText
          = sellFlow[last].y.toLocaleString();

        // X-axis
        const x = scaleUtc()
          .domain([buyFlow[0].x, buyFlow[last].x])
          .range([
            margin.flow,
            width - margin.price - margin.openInterest
          ]);

        const xAxis = g => g
          .call(axisBottom(x)
            .ticks(5)
            .tickFormat(x => timeFormat('%H:%M')(x))
            .tickSizeOuter(0));

        // Y-axes
        const yRange = [height - margin.bottom, margin.top];

        // Flow axis
        const flowScale = scaleLog()
          .domain([
            MIN_FLOW,
            Math.max(MAX_FLOW, max(buyFlow, d => d.y), max(sellFlow, d => d.y)),
          ])
          .range(yRange);
    
        const flowAxis = g => g
          .call(axisLeft(flowScale)
            .tickValues([1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7])
            .tickFormat(y => format(',.0r')(y))
            .tickSizeOuter(0));

        const flowLine = line()
          .x(d => x(d.x))
          .y(d => flowScale(d.y));

        // Price axis
        const priceScale = scaleLinear()
          .domain(extent(price, d => d.y))
          .range(yRange);

        const priceAxis = g => g
          .call(axisRight(priceScale)
            .ticks(3))

        const priceLine = line()
          .x(d => x(d.x))
          .y(d => priceScale(d.y));

        // Open interest axis
        const openInterestScale = scaleLinear()
          .domain(extent(openInterest, d => d.y))
          .range(yRange);

        const openInterestAxis = g => g
          .call(axisRight(openInterestScale)
            .ticks(3)
            .tickFormat(y => format('.3s')(y)));

        const openInterestLine = line()
          .x(d => x(d.x))
          .y(d => openInterestScale(d.y));
        
        // Assemble the SVG-element
        const svg = select(d3svg.current)
          .attr('viewbox', [0, 0, width, height]);
        
        // Axes groups
        svg.append('g')
          .attr('transform', `translate(0,${height - margin.bottom})`)
          .attr('class', 'x-axis')
          .call(xAxis);
    
        svg.append('g')
          .attr('transform', `translate(${margin.flow},0)`)
          .attr('class', 'flow-axis')
          .call(flowAxis);

        svg.append('g')
          .attr('transform', `translate(${width - margin.price},0)`)
          .attr('class', 'price-axis')
          .call(priceAxis);

        const tx = width - margin.price - margin.openInterest;
        svg.append('g')
          .attr('transform', `translate(${tx},0)`)
          .attr('class', 'open-interest-axis')
          .call(openInterestAxis);

        // Clip path
        const xMargin = margin.flow + margin.price + margin.openInterest;
        svg.append('clipPath')
          .attr('id', 'rect-clip')
          .append('rect')
            .attr('x', margin.flow)
            .attr('y', margin.top)
            .attr('width', width - xMargin)
            .attr('height', height - (margin.top + margin.bottom))

        // Paths
        svg.append('path')
          .attr('id', 'buy-flow')
          .attr('clip-path', 'url(#rect-clip)')
          .datum(buyFlow)
            .attr('fill', 'none')
            .attr('stroke', 'lime')
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('d', flowLine);

        svg.append('path')
          .attr('id', 'sell-flow')
          .attr('clip-path', 'url(#rect-clip)')
          .datum(sellFlow)
            .attr('fill', 'none')
            .attr('stroke', '#b33')
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('d', flowLine);

        svg.append('path')
          .attr('id', 'price')
          .attr('clip-path', 'url(#rect-clip)')
          .datum(price)
            .attr('fill', 'none')
            .attr('stroke', 'royalblue')
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('d', priceLine);

        svg.append('path')
          .attr('id', 'open-interest')
          .attr('clip-path', 'url(#rect-clip)')
          .datum(openInterest)
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('d', openInterestLine);

        // Update chart
        const update = () => Promise.all([
          `${DATA_URI}/data/buy-flow.txt`,
          `${DATA_URI}/data/sell-flow.txt`,
          `${DATA_URI}/data/price.txt`,
          `${DATA_URI}/data/open-interest.txt`,
        ].map(uri => fetch(uri).then(r => r.text())))
          .then(data => data.map(parseFloat))

          // Process new data
          .then(data => {
            let [lastBuyFlow, lastSellFlow, lastPrice, lastOpenInterest] = data;

            // TODO temporary patch until I rewire the back-end
            if (isNaN(lastBuyFlow)) {
              lastBuyFlow = buyFlow[last].y;
            }
            if (isNaN(lastSellFlow)) {
              lastSellFlow = sellFlow[last].y;
            }
            if (isNaN(lastPrice)) {
              lastPrice = price[last].y;
            }
            if (isNaN(lastOpenInterest)) {
              lastOpenInterest = openInterest[last].y;
            }

            // Firstly sound any alarm
            alarm(beepUpId, lastBuyFlow, lastPrice);
            alarm(beepDownId, lastSellFlow, lastPrice);

            // Set page title
            document.title = lastPrice;

            // Update the divs
            document.getElementById(openInterestId).innerText
              = lastOpenInterest.toLocaleString();
            document.getElementById(priceId).innerText
              = lastPrice.toLocaleString();
            document.getElementById(buyFlowId).innerText
              = lastBuyFlow.toLocaleString();
            document.getElementById(sellFlowId).innerText
              = lastSellFlow.toLocaleString();

            // TODO these O(n) shifts are a burden on my soul
            const next_x = new Date(buyFlow[last].x.getTime() + REFRESH_RATE);
            buyFlow.push({ x: next_x, y: 1 + lastBuyFlow });
            buyFlow.shift();
            sellFlow.push({ x: next_x, y: 1 + lastSellFlow });
            sellFlow.shift();
            price.push({ x: next_x, y: lastPrice });
            price.shift();
            openInterest.push({ x: next_x, y: lastOpenInterest });
            openInterest.shift();

            const svg = select(d3svg.current);
                
            // Update bottom axis
            x.domain([buyFlow[0].x, next_x]);
            svg.select('g.x-axis')
                .call(xAxis);

            // Update flow axis
            flowScale.domain([
              MIN_FLOW,
              Math.max(MAX_FLOW, buyFlow[last].y, sellFlow[last].y),
            ]);
            svg.select('g.flow-axis')
                .call(flowAxis);

            // Update price axis
            priceScale.domain(extent(price, d => d.y));
            svg.select('g.price-axis')
              .call(priceAxis);

            // Update open interest axis
            openInterestScale.domain(extent(openInterest, d => d.y));
            svg.select('g.open-interest-axis')
              .call(openInterestAxis);

            // Update paths
            svg.select('path#buy-flow')
              .attr('d', flowLine(buyFlow));
            svg.select('path#sell-flow')
              .attr('d', flowLine(sellFlow));
            svg.select('path#price')
              .attr('d', priceLine(price));
            svg.select('path#open-interest')
              .attr('d', openInterestLine(openInterest));
          });
        handle = setInterval(update, REFRESH_RATE);
      });

    // Clean up on dismount
    return () => clearInterval(handle);
  });
 
  return <div className="w3-xxlarge">
    <audio loop id={beepUpId}>
      <source src={beepUp} type="audio/mpeg"/>
    </audio>
    <audio loop id={beepDownId}>
      <source src={beepDown} type="audio/mpeg"/>
    </audio>
    <div className="w3-cell-row">
      <div className="w3-cell w3-text-white" id={openInterestId}>
        Loading...
      </div>
    </div>
    <div className="w3-cell-row w3-section">
      <div
        className="w3-cell my-third"
        style={{ color: 'royalblue' }}
        id={priceId}
      >
        Loading...
      </div>
      <div
        className="w3-cell my-third w3-text-lime"
        id={buyFlowId}
      >
        Loading...
      </div>
      <div
        className="w3-cell my-third"
        style={{ color : '#b33' }}
        id={sellFlowId}
      >
        Loading...
      </div>
    </div>
    <svg
      ref={d3svg}
      role="img"
      width={width}
      height={height}
      className=''
      style={{}}
    />
  </div>;
}