import React from 'react';
import LeftColumn from '../components/LeftColumn';
import CenterColumn from '../components/CenterColumn';
import RightColumn from '../components/RightColumn';

export const StudioPage: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 overflow-hidden">
      {/* [LEFT COL] RH/LH glove sensors, calibration, connection */}
      <section className="lg:col-span-3 h-full min-h-0 overflow-hidden">
        <LeftColumn />
      </section>

      {/* [CENTER COL] LIVE REALISTIC 3D HAND, orbit controls, pulse on hit */}
      <section className="lg:col-span-5 h-full min-h-0 flex flex-col overflow-hidden">
        <CenterColumn />
      </section>

      {/* [RIGHT COL] Drum pads (14), MIDI status, Settings sliders, Activity log */}
      <section className="lg:col-span-4 h-full min-h-0 overflow-hidden">
        <RightColumn />
      </section>
    </div>
  );
};

export default StudioPage;
