import React, { Component } from 'react';
import { DATA_URI } from "./config";
import { parseFilename, parsePoints } from './util.IV';
import SimpleChart from './SimpleChart';

class GIV extends Component {
  constructor(props) {
    super(props);
    this.state = {
      call_iv: [],
      put_iv:  [],
    };
  }

  componentDidMount() {
    const root = `${DATA_URI}/data/iv/`;
    const priceFile = 'BTC-PERPETUAL.csv';
    const indexFile = 'index.json';

    // fetch prices
    const fetch_prices = fetch(`${root}${priceFile}`)
    .then(prices => prices.text());

    // fetch index
    const fetch_index = fetch(`${root}${indexFile}`)
    .then(index => index.json())
    .then(index => index.filter(filename =>
      filename.endsWith('.csv') && filename !== priceFile
    ));

    Promise.all([fetch_prices, fetch_index])
    .then(result => {
      let [prices, index] = result;

      // parse prices to a list of { x: datetime, y: price }
      prices = parsePoints(prices);

      // parse index
      index = index.map(filename => {
        const option = parseFilename(filename);
        option.link = `${root}${filename}`;
        return option;
      });

      Promise.all(prices.map(point => {
        const time = point.x, price = point.y;

        // look up options with closest future expiration
        // todo optimize O(n^2) lookup, could be O(n*log(n)) by sorting index
        let closest_call = undefined;
        let shortest_call_timespan = Number.MAX_VALUE;
        let closest_put = undefined;
        let shortest_put_timespan = Number.MAX_VALUE;
        index.forEach(option => {
          const timespan = option.date - time;

          // consider only options in this point's future
          if (timespan > 0) {
            const pricedelta = Math.abs(option.strike - price);

            // call options
            if (option.type === 'C') {

              // find the closest option in this point's future
              if (timespan < shortest_call_timespan) {
                if (!closest_call
                    || pricedelta < Math.abs(closest_call.strike - price)) {
                  closest_call = option;
                  shortest_call_timespan = timespan;
                }
              }
            }

            // put options analogous
            else {
              if (timespan < shortest_put_timespan) {
                if (!closest_put
                    || pricedelta < Math.abs(closest_put.strike - price)) {
                  closest_put = option;
                  shortest_put_timespan = timespan;
                }
              }
            }
          }
        });

        // find iv at (C)losest (P)revious (T)ime
        const findIVCPT = option => fetch(option.link)
        .then(r => r.text())
        .then(content => {
          const ivs = parsePoints(content, parseFloat);
          let i = ivs.length - 1;
          // there was only 1 case where i ever went below 0
          // substituting with the earliest available datapoint is acceptable
          while (ivs[i].x > time && i > 0) {
            i--;
          }
          return ivs[i];
        });

        // now fetch the options' iv values
        return Promise.all([findIVCPT(closest_call), findIVCPT(closest_put)]);
      })).then(result => {

        // unzip the results
        const call_iv = [], put_iv = [];
        result.forEach(ivs => {
          call_iv.push(ivs[0]);
          put_iv.push(ivs[1]);
        });

        // update state
        this.setState({ call_iv: call_iv, put_iv: put_iv });
      });
    })
  }

  render() {
    return (
      <div id="giv">
        <SimpleChart points={this.state.call_iv} title="Call IV"/>
        <SimpleChart points={this.state.put_iv} title="Put IV"/>
      </div>
    );
  }
}

export default GIV;
