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
    const handleClass = "w3-theme-l1 toggle-handle";

    return <div>
      <span className={handleClass} onClick={() => this.setVisible(!visible)}>
        {visible ? <DoubleLeft title="Hide"/> : <DoubleRight title="Show"/>}
      </span>
      <div className="w3-cell-row" style={{width:'100%'}}>
        <div style={{
          minWidth: '375px',
          width: '500px',
          display: visible ? 'table-cell' : 'none',
        }}>{left}</div>
        <div className="w3-cell">{right}</div>
      </div>
    </div>;
  }
}

export default withCookies(Content);