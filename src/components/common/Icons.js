import React from 'react';

import up from '../../assets/up.png';
import down from '../../assets/down.png';
import cross from '../../assets/cross.png';
import lines from '../../assets/lines.png';
import alert from '../../assets/alert.png';
import alarm from '../../assets/alarm.png';
import doubleLeft from '../../assets/double-left.png';
import doubleRight from '../../assets/double-right.png';
import loading32 from '../../assets/loading32.svg';
import loading64 from '../../assets/loading64.svg';
import loading128 from '../../assets/loading128.svg';
import loading256 from '../../assets/loading256.svg';

// filters computation app: https://codepen.io/sosuke/pen/Pjoqqp

const lime = {'filter': 'invert(100%) sepia(78%) saturate(4813%) hue-rotate(18deg) brightness(103%) contrast(112%)'};
const red = {'filter': 'invert(15%) sepia(96%) saturate(6773%) hue-rotate(6deg) brightness(104%) contrast(120%)'};
const gold = {'filter': 'invert(85%) sepia(36%) saturate(526%) hue-rotate(355deg) brightness(85%) contrast(97%)'};
const green = {'filter': 'invert(48%) sepia(41%) saturate(3401%) hue-rotate(87deg) brightness(129%) contrast(117%)'};
const white = {'filter': 'invert(99%) sepia(4%) saturate(2%) hue-rotate(190deg) brightness(118%) contrast(100%)'};

export const Up = props =>
  <img src={up} title={props.title} alt={props.title} width='16px' style={lime}/>;
export const Down = props =>
  <img src={down} title={props.title} alt={props.title} width='16px' style={red}/>;

export const Gold = props =>
  <img src={cross} title={props.title} alt={props.title} width='16px' style={gold}/>;
export const Death = props =>
  <img src={cross} title={props.title} alt={props.title} width='16px'/>;

export const SplayUp = props =>
  <img src={lines} title={props.title} alt={props.title} width='16px' style={green}/>;
export const SplayDown = props =>
  <img src={lines} title={props.title} alt={props.title} width='16px' style={red}/>;

export const Alert = props =>
  <img src={alert} title={props.title} alt={props.title} width='16px'/>;
export const Alarm = props =>
  <img src={alarm} title={props.title} alt={props.title} width='16px'/>;

export const DoubleLeft = props =>
  <img src={doubleLeft} title={props.title} alt={props.title} width='32px' style={white}/>;

export const DoubleRight = props =>
  <img src={doubleRight} title={props.title} alt={props.title} width='32px' style={white}/>;

export const Loading32 = () =>
  <img src={loading32} title="Loading..." alt="Loading..."/>;
  
export const Loading64 = () =>
  <img src={loading64} title="Loading..." alt="Loading..."/>;
  
export const Loading128 = () =>
  <img src={loading128} title="Loading..." alt="Loading..."/>;

export const Loading256 = () =>
  <img src={loading256} title="Loading..." alt="Loading..."/>;
