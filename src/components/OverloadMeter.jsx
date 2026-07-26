import './OverloadMeter.css';

// A row of bars that ramp up and "clip" on the last bar — a visual pun on
// progressive overload (adding more than you handled last time until you
// just barely exceed it). This is the one deliberately bold element on the
// page; everything else stays quiet.
export default function OverloadMeter({ bars = 12 }) {
  return (
    <div className="ol-meter" role="presentation" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="ol-meter-bar"
          style={{ '--i': i, '--n': bars }}
        />
      ))}
    </div>
  );
}
