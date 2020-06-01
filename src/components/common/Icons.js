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

import lock from '../../assets/lock.png';
import unlock from '../../assets/unlock.png';

// filters computation app: https://codepen.io/sosuke/pen/Pjoqqp

const lime = {
  filter:
    'invert(100%) sepia(78%) saturate(4813%) hue-rotate(18deg) brightness(103%) contrast(112%)',
};
const red = {
  filter:
    'invert(15%) sepia(96%) saturate(6773%) hue-rotate(6deg) brightness(104%) contrast(120%)',
};
const gold = {
  filter:
    'invert(85%) sepia(36%) saturate(526%) hue-rotate(355deg) brightness(85%) contrast(97%)',
};
const green = {
  filter:
    'invert(48%) sepia(41%) saturate(3401%) hue-rotate(87deg) brightness(129%) contrast(117%)',
};
const white = {
  filter:
    'invert(99%) sepia(4%) saturate(2%) hue-rotate(190deg) brightness(118%) contrast(100%)',
};

export const Up = ({ title, ...props }) => (
  <img
    src={up}
    title={title}
    alt={title}
    width="16px"
    style={lime}
    {...props}
  />
);
export const Down = ({ title, ...props }) => (
  <img
    src={down}
    title={title}
    alt={title}
    width="16px"
    style={red}
    {...props}
  />
);

export const Gold = ({ title, ...props }) => (
  <img
    src={cross}
    title={title}
    alt={title}
    width="16px"
    style={gold}
    {...props}
  />
);
export const Death = ({ title, ...props }) => (
  <img src={cross} title={title} alt={title} width="16px" {...props} />
);

export const SplayUp = ({ title, ...props }) => (
  <img
    src={lines}
    title={title}
    alt={title}
    width="16px"
    style={green}
    {...props}
  />
);
export const SplayDown = ({ title, ...props }) => (
  <img
    src={lines}
    title={title}
    alt={title}
    width="16px"
    style={red}
    {...props}
  />
);

export const Alert = ({ title, ...props }) => (
  <img src={alert} title={title} alt={title} width="16px" {...props} />
);
export const Alarm = ({ title, ...props }) => (
  <img src={alarm} title={title} alt={title} width="16px" {...props} />
);

export const DoubleLeft = ({ title, ...props }) => (
  <img
    src={doubleLeft}
    title={title}
    alt={title}
    width="32px"
    style={white}
    {...props}
  />
);

export const DoubleRight = ({ title, ...props }) => (
  <img
    src={doubleRight}
    title={title}
    alt={title}
    width="32px"
    style={white}
    {...props}
  />
);

export const Loading32 = () => (
  <img src={loading32} title="Loading..." alt="Loading..." />
);

export const Loading64 = () => (
  <img src={loading64} title="Loading..." alt="Loading..." />
);

export const Loading128 = () => (
  <img src={loading128} title="Loading..." alt="Loading..." />
);

export const Loading256 = () => (
  <img src={loading256} title="Loading..." alt="Loading..." />
);

export const Lock = ({ title, ...props }) => (
  <img
    src={lock}
    title={title}
    alt={title}
    width="14px"
    style={{ margin: '0 1px 2px', ...white }}
    {...props}
  />
);

export const Unlock = ({ title, ...props }) => (
  <img
    src={unlock}
    title={title}
    alt={title}
    width="14px"
    style={{ margin: '0 1px 2px', ...white }}
    {...props}
  />
);
