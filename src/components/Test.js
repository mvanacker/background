import React, { Component } from 'react';

import { DoubleLeft, DoubleRight } from './common/Icons';

export default class Test extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: true,
    };
    this.setVisible = this.setVisible.bind(this);
  }

  setVisible(visible) {
    this.setState({ visible });
  }

  render() {
    const { visible } = this.state;
    const { left, right } = this.props;
    const handle = {cursor: 'pointer', position: 'absolute', margin: '8px'};
    return <div>
      {
        visible
          ? <span onClick={() => this.setVisible(false)}>
            <span style={handle}>
              <DoubleLeft title="Hide"/>
            </span>
          </span>
          : <span onClick={() => this.setVisible(true)}>
            <span style={handle}>
              <DoubleRight title="Show"/>
            </span>
          </span>
      }
      <div className="w3-cell-row" style={{width:'100%'}}>
        <div style={{
          width: '500px',
          display: this.state.visible ? 'table-cell' : 'none',
        }}>
          {left} azer
        </div>
        <div className="w3-cell">
          {right} az
        </div>
      </div>
    </div>;
  }
}