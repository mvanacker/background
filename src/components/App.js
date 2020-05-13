import React, { Component } from 'react';

import CanvasJSReact from '../canvasjs.react';

import beepDown from '../assets/beep_down.mp3';
import beepUp from '../assets/beep_up.mp3';
import { DATA_URI } from "./config";

import Panel from './common/Panel';
import LabeledRow from './common/LabeledRow';
import ListBlock from './common/ListBlock';
import { DoubleLeft, DoubleRight } from './common/Icons';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      
      // static
      openInterestRefreshRate: 10000,
      refreshRate:             1000,
      recentTradesCount:       100,
      historyLength:           180,
      openInterestFraction:    1000000,
      alarmScalar:             100,
      // minimumYScalar:          10,

      // dynamic
      price:               -1,
      buyFlow:             -1,
      sellFlow:            -1,
      openInterest:        -1,
      priceHistory:        [],
      buyFlowHistory:      [],
      sellFlowHistory:     [],
      openInterestHistory: [],
      recentTrades:        [],
      fearAndGreed:        -1,
      dominance:           -1,
    };
  }

  _alarm(audioId, flow) {
    const beep = document.getElementById(audioId);
    const { price, alarmScalar } = this.state;
    try {
      if (price > 0 && flow >= price * alarmScalar) {
        beep.play();
      } else {
        beep.pause();
      }
    } catch(e) {}
  }

  componentDidMount() {

    const update = () => {

      // Fetch data
      Promise.all([{
        link: `${DATA_URI}/data/price.txt`,
        onsuccess: response => response.text(),
        onfailure: () => this.state.price,
      }, {
        link: `${DATA_URI}/data/buy-flow.txt`,
        onsuccess: response => response.text(),
        onfailure: () => this.state.buyFlow,
      }, {
        link: `${DATA_URI}/data/sell-flow.txt`,
        onsuccess: response => response.text(),
        onfailure: () => this.state.sellFlow,
      }, {
        link: `${DATA_URI}/data/open-interest.txt`,
        onsuccess: response => response.text(),
        onfailure: () => this.state.openInterest,
      }, {
        link: `${DATA_URI}/data/price-history.json`,
        onsuccess: response => response.json(),
        onfailure: () => this.state.priceHistory,
      }, {
        link: `${DATA_URI}/data/buy-flow-history.json`,
        onsuccess: response => response.json(),
        onfailure: () => this.state.buyFlowHistory,
      }, {
        link: `${DATA_URI}/data/sell-flow-history.json`,
        onsuccess: response => response.json(),
        onfailure: () => this.state.sellFlowHistory,
      }, {
        link: `${DATA_URI}/data/open-interest-history.json`,
        onsuccess: response => response.json(),
        onfailure: () => this.state.openInterestHistory,
      }, {
        link: `${DATA_URI}/data/recent-trades.json`,
        onsuccess: response => response.json(),
        onfailure: () => this.state.recentTrades,
      }, {
        link: `${DATA_URI}/data/fear-and-greed.json`,
        onsuccess: response => response.json(),
        onfailure: () => this.state.fearAndGreed,
      }, {
        link: `${DATA_URI}/data/bitcoin-dominance.txt`,
        onsuccess: response => response.text(),
        onfailure: () => this.state.dominance,
      }].map(item =>
        fetch(item.link).then(item.onsuccess).catch(item.onfailure)
      ))
      .then(responses => {

        // Transform data
        let [
          price, buyFlow, sellFlow, openInterest, priceHistory, buyFlowHistory,
          sellFlowHistory, openInterestHistory, recentTrades, fearAndGreed,
          dominance
        ] = responses;

        if (price && !isNaN(price)) {
          price = Math.trunc(parseFloat(price));
        } else {
          price = this.state.price;
        }
        if (buyFlow && !isNaN(buyFlow)) {
          buyFlow = Math.trunc(parseFloat(buyFlow));
        } else {
          buyFlow = this.state.buyFlow;
        }
        if (sellFlow && !isNaN(sellFlow)) {
          sellFlow = Math.trunc(parseFloat(sellFlow));
        } else {
          sellFlow = this.state.sellFlow;
        }
        if (openInterest && !isNaN(openInterest)) {
          openInterest = Math.trunc(parseFloat(openInterest));
        } else {
          openInterest = this.state.openInterest;
        }
        if (priceHistory && priceHistory.length && priceHistory.length > 1) {
          priceHistory = priceHistory.map(entry => {
            return { x: entry.time, y: entry.price }
          });
        } else {
          priceHistory = this.state.priceHistory;
        }
        if (buyFlowHistory && buyFlowHistory.length && buyFlowHistory.length > 1) {
          buyFlowHistory = buyFlowHistory.map(entry => {
            return { x: entry.time, y: 1 + entry.buyFlow }
          });
        }
        if (sellFlowHistory && sellFlowHistory.length && sellFlowHistory.length > 1) {
          sellFlowHistory = sellFlowHistory.map(entry => {
            return { x: entry.time, y: 1 + entry.sellFlow }
          });
        } else {
          sellFlowHistory = this.state.sellFlowHistory;
        }
        if (openInterestHistory && openInterestHistory.length && openInterestHistory.length > 1) {
          openInterestHistory = openInterestHistory.map(entry => {
            return {
              x: entry.time,
              y: isNaN(entry.openInterest) ? undefined : entry.openInterest / this.state.openInterestFraction
            }
          });
        } else {
          openInterestHistory = this.state.openInterestHistory;
        }
        if (recentTrades && recentTrades.length && recentTrades.length > 0) {
          recentTrades = recentTrades.slice(0, this.state.recentTradesCount);
          recentTrades.forEach(trade => trade.size = parseInt(trade.size));
        } else {
          recentTrades = this.state.recentTrades;
        }
        if (fearAndGreed && fearAndGreed.data) {
          fearAndGreed = fearAndGreed.data[0];
        } else {
          fearAndGreed = this.state.fearAndGreed;
        }
        if (dominance) {
          dominance = Math.round(parseFloat(dominance) * 100) / 100;
        } else {
          dominance = this.state.dominance;
        }

        // Play or pause alarms
        this._alarm('beep-up', buyFlow);
        this._alarm('beep-down', sellFlow);

        // Set page title
        document.title = price;

        // Update state
        this.setState({
          price, buyFlow, sellFlow, openInterest, priceHistory, buyFlowHistory,
          sellFlowHistory, openInterestHistory, recentTrades, fearAndGreed,
          dominance,
        });
      });

    };
    update();
    this.priceInterval = setInterval(update, this.state.refreshRate);
  }

  componentWillUnmount() {
    clearInterval(this.priceInterval);
  }

  render() {
    return <div id="app">
      <audio loop id="beep-up">
        <source src={beepUp} type="audio/mpeg"/>
      </audio>
      <audio loop id="beep-down">
        <source src={beepDown} type="audio/mpeg"/>
      </audio>
      {/* <Overview state={this.state}/> */}
      <VolumeFlowChart state={this.state}/>
      <BitmexRecentTrades data={this.state.recentTrades}/>
    </div>;
  }
}

function Overview(props) {
  const { dominance, fearAndGreed } = props.state;
  return <Panel title="Overview" padding={true} margin={false}>
    <ListBlock>
      <li>
        <LabeledRow label="Dominance">
          {dominance}%
        </LabeledRow>
      </li>
      <li>
        <LabeledRow label="Fear and Greed">
          {fearAndGreed.value} <small>
            ({fearAndGreed.value_classification})
          </small>
        </LabeledRow>
      </li>
    </ListBlock>
  </Panel>;
}

function VolumeFlowChart(props) {
  const { 
    price, buyFlow, sellFlow, openInterest,
    priceHistory, buyFlowHistory, sellFlowHistory, openInterestHistory,
    // minimumYScalar,
  } = props.state;
  const options = {
    culture:          "be",
    animationEnabled: true,
    theme:            "dark2",
    backgroundColor:  "transparent",
    height:           260,
    axisX:            {
      valueFormatString: "HH:mm:ss"
    },
    axisY:            [{
      // title:             "volume flow in $/second",
      logarithmic:       true,
      includeZero:       true,
      valueFormatString: "#,###",
      gridColor:         "#444444",
      minimum:           1000,
      // minimum:           minimumYScalar * price,
    }],
    axisY2:           [{
      // title:             "open interest in million $",
      includeZero:       false,
      valueFormatString: "#,###",
      gridColor:         "#ffffff",
    }, {
      // title:             "price in $",
      includeZero:       false,
      valueFormatString: "#,###",
      gridColor:         "#ffffff",
    }],
    data:             [{
      lineColor:  "white",
      type:       "line",
      xValueType: "dateTime",
      dataPoints: openInterestHistory,
      markerType: "none",
      axisYIndex: 0,
      axisYType: "secondary",
    }, {
      lineColor:  "lime",
      type:       "line",
      xValueType: "dateTime",
      dataPoints: buyFlowHistory,
      markerType: "none",
    }, {
      lineColor:  "#b33",
      type:       "line",
      xValueType: "dateTime",
      dataPoints: sellFlowHistory,
      markerType: "none",
    }, {
      lineColor:  "royalblue",
      type:       "line",
      xValueType: "dateTime",
      dataPoints: priceHistory,
      markerType: "none",
      axisYIndex: 1,
      axisYType: "secondary",
    }]
  };
  
  return <div className="w3-margin w3-container w3-theme-dark w3-xxlarge">
    <div className="w3-cell-row">
      <div className="w3-cell w3-text-white">
        {openInterest.toLocaleString()}
      </div>
    </div>
    <div className="w3-cell-row w3-section">
      <div className="w3-cell my-third" style={{'color': 'royalblue'}}>
        {price.toLocaleString()}
      </div>
      <div className="w3-cell my-third w3-text-lime">
        {buyFlow.toLocaleString()}
      </div>
      <div className="w3-cell my-third" style={{'color': '#b33'}}>
        {sellFlow.toLocaleString()}
      </div>
    </div>
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
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
      return " w3-large";
    } else if (size >= 500000) {
      return " w3-medium";
    }
    return " w3-medium";
  };

  return <Panel theme="w3-theme-dark" margin={false}>
    <table className="monospace" style={{'margin': 'auto'}}>
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
              <td className="size">{squish(trade.size)}</td>
              <td className="price">{trade.price}</td>
            </tr>
          );
        })
      }
      </tbody>
    </table>
  </Panel>;
}
