import React, { createContext, useState, useEffect } from 'react';
import { simulationEngine } from '../platform/engine/SimulationEngine';

export const SimulationContext = createContext();

export const SimulationProvider = ({ children }) => {
  const [engine] = useState(simulationEngine);

  useEffect(() => {
    engine.initialize();
    return () => {
      if (engine.shutdown) {
        engine.shutdown();
      }
    };
  }, [engine]);

  const value = {
    engine,
    loadScenario: engine.loadScenario,
    start: engine.start,
    pause: engine.pause,
    resume: engine.resume,
    submitAction: engine.recordAction,
    getState: engine.getState,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};
