import React from 'react';

import up from '../../assets/up.png';
import down from '../../assets/down.png';
import cross from '../../assets/cross.png';
import lines from '../../assets/lines.png';
import alert from '../../assets/alert.png';
import alarm from '../../assets/alarm.png';

import doubleUp from '../../assets/double-up.png';
import doubleRight from '../../assets/double-right.png';
import doubleDown from '../../assets/double-down.png';
import doubleLeft from '../../assets/double-left.png';

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

const icon = ({ title, width = '16px', style: superStyle, ...superProps }) => ({
  style,
  ...props
}) => (
  <img
    {...superProps}
    title={title}
    alt={title}
    width={width}
    style={{ ...superStyle, ...style }}
    {...props}
  />
);

// Triangles
export const Up = icon({ src: up, style: lime });
export const Down = icon({ src: down, style: red });

// Moving averages
export const Gold = icon({ src: cross, style: gold });
export const Death = icon({ src: cross });
export const SplayUp = icon({ src: lines, style: lime });
export const SplayDown = icon({ src: lines, style: red });

// Warnings
export const Alert = icon({ src: alert });
export const Alarm = icon({ src: alarm });

// Double arrows
const doubleArrow = ({ src }) => icon({ src, width: '32px', style: white });
export const DoubleUp = doubleArrow({ src: doubleUp });
export const DoubleRight = doubleArrow({ src: doubleRight });
export const DoubleDown = doubleArrow({ src: doubleDown });
export const DoubleLeft = doubleArrow({ src: doubleLeft });

// Locks
const lockIcon = (props) =>
  icon({
    width: '14px',
    style: { margin: '0 1px 2px', ...white },
    ...props,
  });
export const Lock = lockIcon({ src: lock });
export const Unlock = lockIcon({ src: unlock });

// Loading
const loadingAlt = 'Loading...';
const loading = ({ src }) => (props) => (
  <img src={src} title={loadingAlt} alt={loadingAlt} {...props} />
);
export const Loading32 = loading({ src: loading32 });
export const Loading64 = loading({ src: loading64 });
export const Loading128 = loading({ src: loading128 });
export const Loading256 = loading({ src: loading256 });
