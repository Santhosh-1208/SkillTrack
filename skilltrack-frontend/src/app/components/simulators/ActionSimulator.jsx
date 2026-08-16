import React from 'react';
import Terminal from '../Terminal';
import InteractiveMenuSimulator from './InteractiveMenuSimulator';

export default function ActionSimulator({ 
  simulationId, 
  config, 
  activeStepIndex, 
  onStepComplete 
}) {
  if (!config) return null;

  const pattern = config.interaction_pattern;

  // Use the terminal for IT/sandbox related tasks
  if (pattern === 'sandbox' || pattern === 'cli') {
    return (
      <Terminal 
        simulationId={simulationId} 
        steps={config.sop_steps} 
        activeStepIndex={activeStepIndex} 
        onStepComplete={onStepComplete} 
      />
    );
  }

  // Use the interactive menu for all other types (safety, mechanical, manufacturing)
  return (
    <InteractiveMenuSimulator
      steps={config.sop_steps}
      activeStepIndex={activeStepIndex}
      onStepComplete={onStepComplete}
    />
  );
}
