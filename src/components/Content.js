import React, { Component } from 'react';

import { instanceOf } from "prop-types";
import { Cookies, withCookies } from "react-cookie";

import setYearlyCookie from '../util/cookie';
import { DoubleLeft, DoubleRight } from './common/Icons';

class Content extends Component {
  static propTypes = {
    cookies:  instanceOf(Cookies).isRequired,
  };

  constructor(props) {
    super(props);
    const { cookies } = this.props;
    this.state = {
      visible: (c => c ? c === 'true' : true)(cookies.get('visible')),
    };
    this.setVisible = this.setVisible.bind(this);
  }

  setVisible(visible) {
    setYearlyCookie(this.props.cookies, 'visible', visible, '/');
    this.setState({ visible });
  }

  render() {
    const { visible } = this.state;
    const { left, right } = this.props;
    const hideHandle = {
      position: 'fixed',
      bottom: '20px',
      cursor: 'pointer',
      padding: '5px 5px 5px 15px',
      margin: '5px 5px 5px 0',
    };
    const showHandle = {
      ...hideHandle,
    };
    const leftStyle = {
      minWidth: '375px',
      width: '500px',
      display: this.state.visible ? 'table-cell' : 'none',
    };
    const handleClass = "w3-theme-l1";
    return <div>
      {
        visible
          ? <span onClick={() => this.setVisible(false)}>
            <span style={hideHandle} className={handleClass}>
              <DoubleLeft title="Hide"/>
            </span>
          </span>
          : <span onClick={() => this.setVisible(true)}>
            <span style={showHandle} className={handleClass}>
              <DoubleRight title="Show"/>
            </span>
          </span>
      }
      <div className="w3-cell-row" style={{width:'100%'}}>
        <div style={leftStyle}>{left}</div>
        <div className="w3-cell">{right}</div>
      </div>
    </div>;
  }
}

export default withCookies(Content);