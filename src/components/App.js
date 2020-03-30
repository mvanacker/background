import React, { Component } from 'react';
import './App.css';
import beepDown from '../assets/beep_down.mp3';
import beepUp from '../assets/beep_up.mp3';
import { DATA_SERVER_URL } from "./config";
import CanvasJSReact from '../canvasjs.react';

const { CanvasJSChart } = CanvasJSReact;

function BitcoinDominance(props) {
  return (
    <div id="bitcoin-dominance">
      {/* <h3>Bitcoin Dominance</h3> */}
      <span id="bitcoin-dominance">
        {props.bitcoinDominance}
      </span>
    </div>
  );
}

function CryptoFearAndGreed(props) {
  return (
    <div id="crypto-fear-and-greed">
      {/* <h3>Crypto Fear and Greed Index</h3> */}
      <span id="crypto-fear-and-greed">
        {props.data.value_classification} ({props.data.value})
      </span>
    </div>
  );
}

function BitmexOpenInterest(props) {
  if (props.data['TOTAL']) {
    return (
      <div id="bitmex-open-interest">
        {/* <h3>BitMEX Open Interest</h3> */}
        <span id="bitmex-total-open-interest">
          {props.data['TOTAL'].toLocaleString()}
        </span>
      </div>
    );
  } else {
    return (<span>Loading...</span>);
  }
}

function BitmexRecentTrades(props) {
  const squish = size => {
    if (size >= 1000000) {
      const first = Math.trunc(size / 100000);
      if (first % 10 === 0) {
        return `** ${Math.trunc(first / 10)}M **`;
      }
      return `**${first / 10}M**`;
    } else if (size >= 500000) {
      return ` *${Math.trunc(size / 1000)}K* `;
    } else if (size >= 100000) {
      return `  ${Math.trunc(size / 1000)}K  `;
    }
    return size;
  };

  const size_class = size => {
    if (size >= 1000000) {
      return " huge-size";
    } else if (size >= 500000) {
      return " big-size";
    }
    return "";
  };

  return (
    <table id="recent-trades" className="monospace">
      <tbody>
      {
        props.data.map((trade, i) => {
          const rowClass = trade.side === "Buy" ? "buy" : "sell";
          return (
            <tr className={rowClass + size_class(trade.size)} key={i}>
              <td className="time">
                {trade.timestamp.split(' ')[1].split('.')[0]}
              </td>
              <td className="side">{trade.side}</td>
              <td className="size">
                {squish(trade.size)}
              </td>
              <td className="price">{trade.price}</td>
            </tr>
          );
        })
      }
      </tbody>
    </table>
  );
}

function VolumeFlowChart(props) {
  const options = {
    culture:          "be",
    animationEnabled: true,
    theme:            "dark2",
    backgroundColor:  "black",
    height:           260,
    axisX:            {
      // valueFormatString: "HH:mm:ss"
    },
    axisY:            [{
      title:             "volume flow in $/second",
      logarithmic:       true,
      includeZero:       true,
      valueFormatString: "#,###",
      gridColor:         "#444444",
      minimum:           1000,
    }],
    axisY2:           [{
      title:             "price in $",
      includeZero:       false,
      valueFormatString: "#,###",
      gridColor:         "#ffffff",
    }],
    data:             [{
      lineColor:  "lime",
      type:       "line",
      xValueType: "dateTime",
      dataPoints: props.buyFlowHistory,
      markerType: "none",
    }, {
      lineColor:  "#bb3333",
      type:       "line",
      xValueType: "dateTime",
      dataPoints: props.sellFlowHistory,
      markerType: "none",
    }, {
      lineColor:  "royalblue",
      type:       "line",
      xValueType: "dateTime",
      dataPoints: props.priceHistory,
      markerType: "none",
      axisYType:  "secondary",
    }]
  };

  return (<CanvasJSChart options={options}/>);
}

function BitmexVolumeFlow(props) {
  return (
    <div id="bitmex-volume-flow">
      {/* <h3>BitMEX Volume Flow</h3> */}
      <div id="volume-flow">
        <span id="bitmex-price">{props.price}</span>
        <span id="buy-flow">{props.buyFlow.toLocaleString()}</span>
        <span id="sell-flow">{props.sellFlow.toLocaleString()}</span>
      </div>
      <div id="volume-flow-chart">
        <VolumeFlowChart
          priceHistory={props.priceHistory}
          buyFlowHistory={props.buyFlowHistory}
          sellFlowHistory={props.sellFlowHistory}
        />
      </div>
    </div>
  );
}

class Bitmex extends Component {
  constructor(props) {
    super(props);
    this.state = {
      price:            -1,
      buyFlow:          -1,
      sellFlow:         -1,
      priceHistory:     [],
      buyFlowHistory:   [],
      sellFlowHistory:  [],
      recentTrades:     [],
      openInterest:     {},
      fearAndGreed:     -1,
      bitcoinDominance: -1,
    };
  }

  _alarm(audioId, flow) {
    const beep = document.getElementById(audioId);
    const { price } = this.state;
    const { alarmScalar } = this.props;
    if (price > 0 && flow >= price * alarmScalar) {
      beep.play();
    } else {
      beep.pause();
    }
  }

  componentDidMount() {
    this.priceInterval = setInterval(() => {

      // Fetch data
      Promise.all([
        fetch(`${DATA_SERVER_URL}/data/price.txt`)
        .then(response => response.text())
        .catch(() => this.state.price),
        fetch(`${DATA_SERVER_URL}/data/buy-flow.txt`)
        .then(response => response.text())
        .catch(() => this.state.buyFlow),
        fetch(`${DATA_SERVER_URL}/data/sell-flow.txt`)
        .then(response => response.text())
        .catch(() => this.state.sellFlow),
        fetch(`${DATA_SERVER_URL}/data/price-history.json`)
        .then(response => response.json())
        .catch(() => this.state.priceHistory),
        fetch(`${DATA_SERVER_URL}/data/buy-flow-history.json`)
        .then(response => response.json())
        .catch(() => this.state.buyFlowHistory),
        fetch(`${DATA_SERVER_URL}/data/sell-flow-history.json`)
        .then(response => response.json())
        .catch(() => this.state.sellFlowHistory),
        fetch(`${DATA_SERVER_URL}/data/recent-trades.json`)
        .then(response => response.json())
        .catch(() => this.state.recentTrades),
        fetch(`${DATA_SERVER_URL}/data/open-interest.json`)
        .then(response => response.json())
        .catch(() => this.state.openInterest),
        fetch(`${DATA_SERVER_URL}/data/fear-and-greed.json`)
        .then(response => response.json())
        .catch(() => this.state.fearAndGreed),
        fetch(`${DATA_SERVER_URL}/data/bitcoin-dominance.txt`)
        .then(response => response.text()),
      ])
      .then(responses => {

        // Transform data
        let [
          price, buyFlow, sellFlow, priceHistory, buyFlowHistory,
          sellFlowHistory, recentTrades, openInterest, fearAndGreed,
          bitcoinDominance
        ] = responses;
        price = Math.trunc(parseFloat(price));
        buyFlow = Math.trunc(parseFloat(buyFlow));
        sellFlow = Math.trunc(parseFloat(sellFlow));
        priceHistory = priceHistory.map(entry => {
          return { x: entry.time, y: entry.price }
        });
        buyFlowHistory = buyFlowHistory.map(entry => {
          return { x: entry.time, y: 1 + entry.buyFlow }
        });
        sellFlowHistory = sellFlowHistory.map(entry => {
          return { x: entry.time, y: 1 + entry.sellFlow }
        });
        recentTrades = recentTrades.slice(0, this.props.recentTradesCount);
        recentTrades.forEach(trade => trade.size = parseInt(trade.size));
        fearAndGreed = fearAndGreed.data[0];
        bitcoinDominance = Math.round(parseFloat(bitcoinDominance) * 100) / 100;

        // Play or pause alarms
        this._alarm('beep-up', buyFlow);
        this._alarm('beep-down', sellFlow);

        // Set page title
        window.document.title = price;

        // Update state
        this.setState({
          price, buyFlow, sellFlow, priceHistory, buyFlowHistory,
          sellFlowHistory, recentTrades, openInterest, fearAndGreed,
          bitcoinDominance,
        });
      });

    }, this.props.refreshRate);
  }

  componentWillUnmount() {
    clearInterval(this.priceInterval);
  }

  render() {
    return (
      <span id="bitmex-data">
        <BitcoinDominance bitcoinDominance={this.state.bitcoinDominance}/>
        <CryptoFearAndGreed data={this.state.fearAndGreed}/>
        <BitmexOpenInterest data={this.state.openInterest}/>
        <BitmexVolumeFlow
          price={this.state.price}
          buyFlow={this.state.buyFlow}
          sellFlow={this.state.sellFlow}
          priceHistory={this.state.priceHistory}
          buyFlowHistory={this.state.buyFlowHistory}
          sellFlowHistory={this.state.sellFlowHistory}
        />
        <BitmexRecentTrades data={this.state.recentTrades}/>
      </span>
    );
  }
}

function App() {
  return (
    <div id="app">
      <audio loop id="beep-up">
        <source src={beepUp} type="audio/mpeg"/>
      </audio>
      <audio loop id="beep-down">
        <source src={beepDown} type="audio/mpeg"/>
      </audio>
      <div id="main">
        <div className="column">
          <Bitmex
            openInterestRefreshRate="10000"
            refreshRate="1000"
            recentTradesCount="100"
            historyLength="180"
            alarmScalar="100"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
