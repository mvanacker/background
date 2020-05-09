import React from 'react';

import up from '../../assets/up.png';
import down from '../../assets/down.png';
import cross from '../../assets/cross.png';
import lines from '../../assets/lines.png';
import alert from '../../assets/alert.png';
import alarm from '../../assets/alarm.png';

// filters computation app: https://codepen.io/sosuke/pen/Pjoqqp

const lime = {'filter': 'invert(100%) sepia(78%) saturate(4813%) hue-rotate(18deg) brightness(103%) contrast(112%)'};
const red = {'filter': 'invert(15%) sepia(96%) saturate(6773%) hue-rotate(6deg) brightness(104%) contrast(120%)'};
const gold = {'filter': 'invert(85%) sepia(36%) saturate(526%) hue-rotate(355deg) brightness(85%) contrast(97%)'};
const green = {'filter': 'invert(48%) sepia(41%) saturate(3401%) hue-rotate(87deg) brightness(129%) contrast(117%)'};

export const Up = props =>
  <img src={up} title={props.title} width='16px' style={lime}/>;
export const Down = props =>
  <img src={down} title={props.title} width='16px' style={red}/>;

export const Gold = props =>
  <img src={cross} title={props.title} width='16px' style={gold}/>;
export const Death = props =>
  <img src={cross} title={props.title} width='16px'/>;

export const SplayUp = props =>
  <img src={lines} title={props.title} width='16px' style={green}/>;
export const SplayDown = props =>
  <img src={lines} title={props.title} width='16px' style={red}/>;

export const Alert = props =>
  <img src={alert} title={props.title} width='16px'/>;
export const Alarm = props =>
  <img src={alarm} title={props.title} width='16px'/>;