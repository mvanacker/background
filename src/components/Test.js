import React, { Component } from 'react';

export default class Test extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <GeneralComponent chart={SubComponent}/>;
  }
}

function GeneralComponent(props) {
  return <props.chart prop1='hello' prop2='world'/>
}

function SubComponent(props) {
  const { prop1, prop2 } = props;
  return <div>I use {prop1} and {prop2}.</div>;
}