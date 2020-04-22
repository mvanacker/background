import React from 'react';
import Bar from './Bar';
import BarButton from './BarButton';

export default function Tabs(props) {
  const { titles, onClick } = props;
  return <Bar>
    {
      Object.entries(props.enum).map(([key, val]) =>
        <BarButton key={val} onClick={() => onClick(val)}>
          {titles[key]}
        </BarButton>
      )
    }
  </Bar>;
}