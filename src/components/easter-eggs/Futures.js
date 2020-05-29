import React from 'react';
import { round_to } from '../../util/math';
import useStorage from '../../hooks/useStorage';

const futureId = 'future';
const spotId   = 'spot';
const daysId   = 'days';
const hoursId  = 'hours';
const minsId   = 'mins';
const annualId = 'annual';
const spotTargetId = 'spot-target';
const futureTargetId = 'future-target';

const Field = ({ id, value, setValue }) => <input
  className="w3-input"
  style={{ margin: '4px 0' }}
  id={id}
  value={isNaN(value) ? '' : value}
  onChange={e => setValue(e.target.value)}
/>;

const Row = ({ left, right }) => <div className="w3-cell-row">
  <div className="w3-cell" style={{width: '160px'}}>{left}</div>
  <div className="w3-cell">{right}</div>
</div>;

export default function Futures() {
  const [future,       setFuture]       = useStorage(futureId,       { initialValue: NaN });
  const [spot,         setSpot]         = useStorage(spotId,         { initialValue: NaN });
  const [days,         setDays]         = useStorage(daysId,         { initialValue: NaN });
  const [hours,        setHours]        = useStorage(hoursId,        { initialValue: NaN });
  const [mins,         setMins]         = useStorage(minsId,         { initialValue: NaN });
  const [annual,       setAnnual]       = useStorage(annualId,       { initialValue: 365 });
  const [spotTarget,   setSpotTarget]   = useStorage(spotTargetId,   { initialValue: NaN });
  const [futureTarget, setFutureTarget] = useStorage(futureTargetId, { initialValue: NaN });

  const [
    ffuture, fspot, fannual, fdays, fhours, fmins, fspotTarget, ffutureTarget
  ] = [
    future, spot, annual, days, hours, mins, spotTarget, futureTarget
  ].map(parseFloat);
  const premium = (ffuture / fspot - 1) * 1440 * fannual
                  / (1440 * fdays + 60 * fhours + fmins);
  const future_equiv = fspotTarget * ffuture / fspot;
  const spot_equiv = ffutureTarget * fspot / ffuture;

  return <form className="w3-container" style={{width: '275px'}}>
    <div className="w3-section">
      <h1>Input</h1>
      <Row
        left={<label htmlFor={futureId}>Future price</label>}
        right={<Field id={futureId} value={future} setValue={setFuture}/>}
      />
      <Row
        left={<label htmlFor={spotId}>Spot price</label>}
        right={<Field id={spotId} value={spot} setValue={setSpot}/>}
      />
    </div>
    
    <div className="w3-section">
      <h1>Spot to future</h1>
      <Row
        left={<label htmlFor={spotTargetId}>Spot target</label>}
        right={<Field
          id={spotTargetId} value={spotTarget} setValue={setSpotTarget}
        />}
      />
      <Row
        left="Future equivalent"
        right={isNaN(future_equiv) ? 'n/a' : `${Math.round(future_equiv)}`}
      />
    </div>

    <div className="w3-section">
      <h1>Future to spot</h1>
      <Row
        left={<label htmlFor={futureTargetId}>Future target</label>}
        right={<Field
          id={futureTargetId} value={futureTarget} setValue={setFutureTarget}
        />}
      />
      <Row
        left="Spot equivalent"
        right={isNaN(spot_equiv) ? 'n/a' : `${Math.round(spot_equiv)}`}
      />
    </div>

    <div className="w3-section">
      <h1>Premium</h1>
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
    </div>
  </form>;
}