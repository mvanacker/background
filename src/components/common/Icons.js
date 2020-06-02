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


export const Up = ({ title, style, ...props }) => (
  <img
    src={up}
    title={title}
    alt={title}
    width="16px"
    style={{ ...lime, ...style }}
    {...props}
  />
);

export const Down = ({ title, style, ...props }) => (
  <img
    src={down}
    title={title}
    alt={title}
    width="16px"
    style={{ ...red, ...style }}
    {...props}
  />
);

export const Gold = ({ title, style, ...props }) => (
  <img
    src={cross}
    title={title}
    alt={title}
    width="16px"
    style={{ ...gold, ...style }}
    {...props}
  />
);

export const Death = ({ title, style, ...props }) => (
  <img src={cross} title={title} alt={title} width="16px" {...props} />
);

export const SplayUp = ({ title, style, ...props }) => (
  <img
    src={lines}
    title={title}
    alt={title}
    width="16px"
    style={{ ...green, ...style }}
    {...props}
  />
);

export const SplayDown = ({ title, style, ...props }) => (
  <img
    src={lines}
    title={title}
    alt={title}
    width="16px"
    style={{ ...red, ...style }}
    {...props}
  />
);

export const Alert = ({ title, ...props }) => (
  <img src={alert} title={title} alt={title} width="16px" {...props} />
);

export const Alarm = ({ title, ...props }) => (
  <img src={alarm} title={title} alt={title} width="16px" {...props} />
);

export const DoubleLeft = ({ title, style, ...props }) => (
  <img
    src={doubleLeft}
    title={title}
    alt={title}
    width="32px"
    style={{ ...white, ...style }}
    {...props}
  />
);

export const DoubleRight = ({ title, style, ...props }) => (
  <img
    src={doubleRight}
    title={title}
    alt={title}
    width="32px"
    style={{ ...white, ...style }}
    {...props}
  />
);

export const Loading32 = (props) => (
  <img src={loading32} title="Loading..." alt="Loading..." {...props} />
);

export const Loading64 = (props) => (
  <img src={loading64} title="Loading..." alt="Loading..." {...props} />
);

export const Loading128 = (props) => (
  <img src={loading128} title="Loading..." alt="Loading..." {...props} />
);

export const Loading256 = (props) => (
  <img src={loading256} title="Loading..." alt="Loading..." {...props} />
);

export const Lock = ({ title, style, ...props }) => (
  <img
    src={lock}
    title={title}
    alt={title}
    width="14px"
    style={{ margin: '0 1px 2px', ...white, ...style }}
    {...props}
  />
);

export const Unlock = ({ title, style, ...props }) => (
  <img
    src={unlock}
    title={title}
    alt={title}
    width="14px"
    style={{ margin: '0 1px 2px', ...white, ...style }}
    {...props}
  />
);
