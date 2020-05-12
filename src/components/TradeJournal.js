import React, { Component, Fragment } from 'react';
import { DATA_URI } from "./config";
import { mean } from './util.math';
import moment from 'moment';

class TradeJournal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      trades:   undefined,
      comments: undefined,
    };
    this.bind();
  }

  bind() {
    this.refresh = this.refresh.bind(this);
    this.commentChangeHandler = this.commentChangeHandler.bind(this);
    this.postComment = this.postComment.bind(this);
    this.deleteEmpty = this.deleteEmpty.bind(this);
  }

  componentDidMount() {
    document.title = 'Journal';
    this.refresh();
  }

  refresh() {
    fetch(`${DATA_URI}/trades`)
    .then(r => r.json())
    .then(trades => {

      // initiate comments to empty strings
      const comments = {};
      trades.forEach(trade => comments[trade['_id']] = '');

      // update state
      this.setState({
        trades:   trades,
        comments: comments,
      })
    });
  }

  editComment(id, value) {
    const { comments } = this.state;
    comments[id] = value;
    this.setState({ comments });
  }

  commentChangeHandler(e, id) {
    this.editComment(id, e.target.value);
  }

  postComment(e, trade_id) {
    e.preventDefault();

    const comment = this.state.comments[trade_id];
    if (comment !== '') {

      // add comment
      fetch(`${DATA_URI}/comments/add`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ comment }),
      })
      .then(result => result.json())
      .then(result => {
        const comment_id = result['_id'];

        // get trade
        fetch(`${DATA_URI}/trades/${trade_id}`)
        .then(result => result.json())
        .then(trade => {

          // update trade
          trade.comments.push(comment_id);
          fetch(`${DATA_URI}/trades/update/${trade_id}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(trade),
          })
          .then(this.refresh);
        });
      });
    }
  }

  deleteEmpty() {
    fetch(`${DATA_URI}/trades/delete/empty`, {
      method: 'DELETE',
    })
    .then(this.refresh);
  }

  render() {
    const { trades, comments } = this.state;
    return !trades ? <div className="w3-container w3-section">
        Loading...
      </div> : <div className="w3-container w3-section">
      <div id="quick-access">
        <button id="delete-empty" type="button" onClick={this.deleteEmpty}>
          Delete empty
        </button>
      </div>
      <h1>Trade Journal</h1>
      <table id="trade-history">
        <tbody>
        {
          trades.map(trade =>
            <Fragment key={trade['_id']}>
              <tr key={`${trade['_id']}-header`} className="trade-history-header">
                <td>Position</td>
                <td>Entry</td>
                <td>Stop</td>
                <td>Profit</td>
                <td>Risk</td>
                <td>Quantity</td>
              </tr>
              <tr key={trade['_id']} className="trade-history-header-entry">
                <td>{trade.position}</td>
                <td>{mean(trade.entry)}</td>
                <td>{trade.stop}</td>
                <td>{mean(trade.profit)}</td>
                <td>{trade.risk}</td>
                <td>{trade.quantity}</td>
              </tr>
              {
                trade.comments.map((comment, i) =>
                  <tr key={`${trade['_id']}${i}`}>
                    <td colSpan={6} className="trade-history-comment">
                      <p className="created-at">
                        {
                          moment(new Date(comment.createdAt))
                          .format('MMMM Do YYYY, h:mm a')
                        }
                      </p>
                      <p className="comment">{comment.comment}</p>
                    </td>
                  </tr>
                )
              }
              <tr key={`${trade['_id']}-add-comment`}>
                <td colSpan={6} className="trade-history-add-comment">
                  <form onSubmit={e => this.postComment(e, trade['_id'])}>
                      <textarea onChange={e => this.commentChangeHandler(e, trade['_id'])}
                                rows={4} value={comments[trade['_id']]}/>
                    <input type="submit" value="Add comment"/>
                  </form>
                </td>
              </tr>
            </Fragment>
          )
        }
        </tbody>
      </table>
    </div>;
  }
}

export default TradeJournal;
