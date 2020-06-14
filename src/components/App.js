import React, { Component, memo } from 'react';

import { Link } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';

import { DATA_URI } from '../config';

import VolumeFlowChart from './VolumeFlowChart';
import Panel from './common/Panel';
import LabeledRow from './common/LabeledRow';
import ListBlock from './common/ListBlock';
import { Loading128 } from './common/Icons';
import { useLocal } from '../hooks/useStorage';

// Never needs to update
const VolumeFlowChartWrapper = memo(() => <VolumeFlowChart />);

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // static
      refreshRate: 1000,
      recentTradesCount: 100,

      // dynamic
      recentTrades: [],
      fearAndGreed: {},
      dominance: NaN,
    };
  }

  componentDidMount() {
    const update = () => {
      // Fetch data
      Promise.all(
        [
          {
            link: `${DATA_URI}/data/recent-trades.json`,
            onsuccess: (response) => response.json(),
            onfailure: () => this.state.recentTrades,
          },
          {
            link: `${DATA_URI}/data/fear-and-greed.json`,
            onsuccess: (response) => response.json(),
            onfailure: () => this.state.fearAndGreed,
          },
          {
            link: `${DATA_URI}/data/bitcoin-dominance.txt`,
            onsuccess: (response) => response.text(),
            onfailure: () => this.state.dominance,
          },
        ].map(({ link, onsuccess, onfailure }) =>
          fetch(link).then(onsuccess).catch(onfailure)
        )
      ).then((responses) => {
        // Transform data
        let [recentTrades, fearAndGreed, dominance] = responses;
        recentTrades = recentTrades.slice(0, this.state.recentTradesCount);
        recentTrades.forEach((trade) => (trade.size = parseInt(trade.size)));
        fearAndGreed = fearAndGreed.data
          ? fearAndGreed.data[0]
          : this.state.fearAndGreed;
        dominance = Math.round(parseFloat(dominance) * 100) / 100;

        // Update state
        this.setState({
          recentTrades,
          fearAndGreed,
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
    return (
      <div id="app" className="my-full-stretch">
        {isNaN(this.state.dominance) ? (
          <div className="my-display-flex my-full-stretch">
            <Loading128 className="my-margin-auto" />
          </div>
        ) : (
          <>
            <Title />
            <Notes />
            <Overview state={this.state} />
            <VolumeFlowChartWrapper />
            <BitmexRecentTrades data={this.state.recentTrades} />
          </>
        )}
      </div>
    );
  }
}

function Title() {
  return (
    <Link to="/" className="my-no-decoration">
      <div
        id="title"
        className="w3-hover-theme w3-card w3-container w3-theme-d3 my-round-bottom"
      >
        <h1>Maurits'</h1>
      </div>
    </Link>
  );
}

const Notes = memo(() => {
  const [notes, setNotes] = useLocal('notes');
  return (
    <Panel title={false}>
      <TextareaAutosize
        placeholder="Write notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w3-input w3-theme-l4 w3-round-large my-notes"
        minRows={2}
      />
    </Panel>
  );
});

function Overview(props) {
  const { dominance, fearAndGreed } = props.state;
  return (
    <Panel title={false}>
      <ListBlock>
        <li>
          <LabeledRow label="Dominance">{dominance}%</LabeledRow>
        </li>
        <li>
          <LabeledRow label="Fear and Greed">
            {fearAndGreed.value}{' '}
            <small>({fearAndGreed.value_classification})</small>
          </LabeledRow>
        </li>
      </ListBlock>
    </Panel>
  );
}

function BitmexRecentTrades(props) {
  const squish = (size) => {
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

  const size_class = (size) => {
    if (size >= 1000000) {
      return ' w3-large';
    } else if (size >= 500000) {
      return ' w3-medium';
    }
    return ' w3-medium';
  };

  return (
    <Panel>
      <table className="w3-content monospace">
        <tbody>
          {props.data.map((trade, i) => {
            const rowClass = trade.side === 'Buy' ? 'buy' : 'sell';
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
          })}
        </tbody>
      </table>
    </Panel>
  );
}
