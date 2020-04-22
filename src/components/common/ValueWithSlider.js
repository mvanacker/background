import React from 'react';

export default function ValueWithSlider(props) {
  const { value, onChange } = props;
  return <div className="w3-cell-row">
    <div className="w3-cell" style={{'width': '65px'}}>
      <input className="w3-input" value={value} onChange={onChange}/>
    </div>
    <div className="w3-cell w3-cell-bottom w3-container">
      <input className="my-range w3-theme-l5" type="range" {...props}/>
    </div>
  </div>;
}