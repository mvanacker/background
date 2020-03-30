import React, { Component } from 'react';
import { DATA_SERVER_URL } from "./config";
import { parseFilename, parsePoints } from './util.IV';
import SimpleChart from './SimpleChart';

class IV extends Component {
  constructor(props) {
    super(props);
    this.state = {
      prices:             [],
      options:            {},
      total:              0,
      loaded:             0,
      selectedSymbol:     undefined,
      selectedExpiration: undefined,
      selectedStrike:     undefined,
      selectedType:       undefined,
    };
    this.symbolChangeHandler = this.symbolChangeHandler.bind(this);
    this.expirationChangeHandler = this.expirationChangeHandler.bind(this);
    this.strikeChangeHandler = this.strikeChangeHandler.bind(this);
    this.typeChangeHandler = this.typeChangeHandler.bind(this);
  }

  componentDidMount() {
    const root = `${DATA_SERVER_URL}/data/iv/`;
    const priceFile = 'BTC-PERPETUAL.csv';

    // fetch prices
    fetch(`${root}${priceFile}`)
    .then(prices => prices.text())
    .then(prices =>
      this.setState({ prices: parsePoints(prices) })
    );

    // fetch list of all (options) instruments
    const data = {};
    fetch(`${root}index.json`)
    .then(index => index.json())
    .then(index => index.filter(filename =>
      filename.endsWith('.csv') && filename !== priceFile
    ))
    .then(index => {

      // update state with total amount of files to fetch
      this.setState({ total: index.length });

      // fetch the actual data
      index.forEach(filename => {
        fetch(`${root}${filename}`)
        .then(content => content.text())

        // parse csv (simple)
        .then(content => {
          const opt = parseFilename(filename);
          const points = parsePoints(content, parseFloat);

          // structure data
          data[opt.symbol] = data[opt.symbol] || {};
          data[opt.symbol][opt.date] = data[opt.symbol][opt.date] || {};
          data[opt.symbol][opt.date][opt.strike] = data[opt.symbol][opt.date][opt.strike] || {};
          data[opt.symbol][opt.date][opt.strike][opt.type] = points;

          // update state
          this.setState({ options: data, loaded: this.state.loaded + 1 });
        })
      });
    });
  }

  symbolChangeHandler(e) {
    this.setState({ selectedSymbol: e.target.value });
  }

  expirationChangeHandler(e) {
    this.setState({ selectedExpiration: e.target.value });
  }

  strikeChangeHandler(e) {
    this.setState({ selectedStrike: e.target.value });
  }

  typeChangeHandler(e) {
    this.setState({ selectedType: e.target.value });
  }

  render() {
    return (
      <div id="iv">
        { // price chart
          this.state.prices.length === 0
            ? '' : <SimpleChart points={this.state.prices} title="price"/>
        }

        { // drop-down menu
          // todo: add empty <option>s at the top to circumvent the change event thing
          this.state.loaded === 0
            ? 'Loading...'
            : this.state.loaded < this.state.total
            ? `Loaded ${this.state.loaded}/${this.state.total}`
            : (
              <div>
                <select id="symbols" onChange={this.symbolChangeHandler}>
                  <option>pick symbol</option>
                  {
                    Object.keys(this.state.options).map(symbol =>
                      <option key={symbol}>{symbol}</option>
                    )
                  }
                </select>
                {
                  !(this.state.selectedSymbol in this.state.options)
                    ? ''
                    : (
                      <div>
                        <select id="expiration" onChange={this.expirationChangeHandler}>
                          <option>pick expiration</option>
                          {
                            Object.keys(this.state.options[this.state.selectedSymbol])
                            .map(expiration =>
                              <option key={expiration}>{expiration}</option>
                            )
                          }
                        </select>
                        {
                          !(this.state.selectedExpiration in this.state.options[this.state.selectedSymbol])
                            ? ''
                            : (
                              <div>
                                <select id="strikes" onChange={this.strikeChangeHandler}>
                                  <option>pick strike</option>
                                  {
                                    Object.keys(this.state.options[this.state.selectedSymbol][this.state.selectedExpiration])
                                    .map(strike =>
                                      <option key={strike}>{strike}</option>
                                    )
                                  }
                                </select>
                                {
                                  !(this.state.selectedStrike in this.state.options[this.state.selectedSymbol][this.state.selectedExpiration])
                                    ? ''
                                    : (
                                      <select id="types" onChange={this.typeChangeHandler}>
                                        <option>pick type</option>
                                        {
                                          Object.keys(this.state.options[this.state.selectedSymbol][this.state.selectedExpiration][this.state.selectedStrike])
                                          .map(type =>
                                            <option key={type}>{type}</option>
                                          )
                                        }
                                      </select>
                                    )
                                }
                              </div>
                            )
                        }
                      </div>
                    )
                }
              </div>
            )
        }

        { // IV graph
          !(this.state.selectedSymbol in this.state.options
            && this.state.selectedExpiration in this.state.options[this.state.selectedSymbol]
            && this.state.selectedStrike in this.state.options[this.state.selectedSymbol][this.state.selectedExpiration]
            && this.state.selectedType in this.state.options[this.state.selectedSymbol][this.state.selectedExpiration][this.state.selectedStrike]
          ) ? '' : (
            <div>
              <SimpleChart
                points={this.state.options[this.state.selectedSymbol][this.state.selectedExpiration][this.state.selectedStrike][this.state.selectedType]}
                title="implied volatility"
              />
              {/*debug dump*/}
              <p>{JSON.stringify(this.state.options[this.state.selectedSymbol][this.state.selectedExpiration][this.state.selectedStrike][this.state.selectedType])}</p>
            </div>
          )
        }
      </div>
    );
  }
}

export default IV;
