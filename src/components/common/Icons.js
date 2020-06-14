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

const icon = ({
  title,
  width = '16px',
  className: superClassName = '',
  ...superProps
}) => ({ className = '', ...props }) => (
  <img
    {...superProps}
    title={title}
    alt={title}
    width={width}
    className={`${superClassName} ${className}`}
    {...props}
  />
);

// Triangles
export const Up = icon({ src: up, className: 'my-lime' });
export const Down = icon({ src: down, className: 'my-red' });

// Moving averages
export const Gold = icon({ src: cross, className: 'my-gold' });
export const Death = icon({ src: cross });
export const SplayUp = icon({ src: lines, className: 'my-green' });
export const SplayDown = icon({ src: lines, className: 'my-red' });

// Warnings
export const Alert = icon({ src: alert });
export const Alarm = icon({ src: alarm });

// Double arrows
const doubleArrow = ({ src }) =>
  icon({ src, width: '32px', className: 'my-white' });
export const DoubleUp = doubleArrow({ src: doubleUp });
export const DoubleRight = doubleArrow({ src: doubleRight });
export const DoubleDown = doubleArrow({ src: doubleDown });
export const DoubleLeft = doubleArrow({ src: doubleLeft });

// Locks
const lockIcon = (props) =>
  icon({ width: '14px', className: 'my-lock my-white', ...props });
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
