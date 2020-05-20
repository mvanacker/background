import React, { useState, useEffect } from 'react';
import { round_to } from '../../util/math';

const futureId = 'future';
const spotId   = 'spot';
const daysId   = 'days';
const hoursId  = 'hours';
const minsId   = 'mins';
const annualId = 'annual';
const targetId = 'target';

const get = (id)      => localStorage.getItem(id);
const set = (id, val) => localStorage.setItem(id, val);

const Field = ({ id, value, setValue }) => <input
  className="w3-input"
  style={{ margin: '4px 0' }}
  id={id}
  value={isNaN(value) ? '' : value}
  onChange={e => setValue(e.target.value)}
/>;

const Row = ({ left, right }) => <div className="w3-cell-row">
  <div className="w3-cell" style={{width: '140px'}}>{left}</div>
  <div className="w3-cell">{right}</div>
</div>;

export default function Futures() {
  const [future, setFuture] = useState(get(futureId) ? get(futureId) : NaN);
  const [spot,   setSpot]   = useState(get(spotId)   ? get(spotId)   : NaN);
  const [days,   setDays]   = useState(get(daysId)   ? get(daysId)   : NaN);
  const [hours,  setHours]  = useState(get(hoursId)  ? get(hoursId)  : NaN);
  const [mins,   setMins]   = useState(get(minsId)   ? get(minsId)   : NaN);
  const [annual, setAnnual] = useState(get(annualId) ? get(annualId) : 365);
  const [target, setTarget] = useState(get(targetId) ? get(targetId) : NaN);

  useEffect(() => set(futureId, future), [future]);
  useEffect(() => set(spotId,   spot),   [spot]);
  useEffect(() => set(daysId,   days),   [days]);
  useEffect(() => set(hoursId,  hours),  [hours]);
  useEffect(() => set(minsId,   mins),   [mins]);
  useEffect(() => set(annualId, annual), [annual]);
  useEffect(() => set(targetId, target), [target]);

  const [ffuture, fspot, fannual, fdays, fhours, fmins, ftarget]
    = [future, spot, annual, days, hours, mins, target].map(parseFloat);
  const premium = (ffuture / fspot - 1) * 1440 * fannual
                  / (1440 * fdays + 60 * fhours + fmins);
  const equivalent = ftarget * ffuture / fspot;

  return <form className="w3-container w3-section" style={{width: '275px'}}>
    <Row
      left={<label htmlFor={futureId}>Future price</label>}
      right={<Field id={futureId} value={future} setValue={setFuture}/>}
    />
    <Row
      left={<label htmlFor={spotId}>Spot price</label>}
      right={<Field id={spotId} value={spot} setValue={setSpot}/>}
    />
    <Row
      left={<label htmlFor={daysId}>Days remaining</label>}
      right={<Field id={daysId} value={days} setValue={setDays}/>}
    />
    <Row
      left={<label htmlFor={hoursId}>Hours remaining</label>}
      right={<Field id={hoursId} value={hours} setValue={setHours}/>}
    />
    <Row
      left={<label htmlFor={minsId}>Mins remaining</label>}
      right={<Field id={minsId} value={mins} setValue={setMins}/>}
    />
    <Row
      left={<label htmlFor={annualId}>Annual</label>}
      right={<Field id={annualId} value={annual} setValue={setAnnual}/>}
    />
    <Row
      left="Premium"
      right={isNaN(premium) ? 'n/a' : `${round_to(100 * premium, 1)}%`}
    />
    <Row
      left={<label htmlFor={targetId}>Spot target</label>}
      right={<Field id={targetId} value={target} setValue={setTarget}/>}
    />
    <Row
      left="Future equivalent"
      right={isNaN(equivalent) ? 'n/a' : `${Math.round(equivalent)}`}
    />
  </form>;
}