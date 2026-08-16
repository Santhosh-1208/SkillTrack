import React, { useState, useMemo } from 'react';

export default function InteractiveMenuSimulator({ steps = [], activeStepIndex = 0, onStepComplete }) {
  const [errorAction, setErrorAction] = useState(null);
  const [successAction, setSuccessAction] = useState(null);

  // Collect all unique actions from the SOP to use as choices
  const availableActions = useMemo(() => {
    const actions = new Set(steps.map(s => s.expected_action).filter(Boolean));
    return Array.from(actions).sort();
  }, [steps]);

  const handleActionClick = (action) => {
    if (activeStepIndex >= steps.length) return;
    
    const currentStep = steps[activeStepIndex];
    if (action === currentStep.expected_action) {
      setSuccessAction(action);
      setErrorAction(null);
      setTimeout(() => {
        setSuccessAction(null);
        if (onStepComplete) onStepComplete(activeStepIndex);
      }, 800);
    } else {
      setErrorAction(action);
      setSuccessAction(null);
      setTimeout(() => setErrorAction(null), 1000);
    }
  };

  const isComplete = activeStepIndex >= steps.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[300px]">
      <div className="bg-slate-50 border-b border-slate-100 p-4">
        <h2 className="text-lg font-bold text-slate-800">Action Panel</h2>
        <p className="text-sm text-slate-500">Select the correct action to proceed.</p>
      </div>
      
      <div className="flex-1 p-6 flex flex-col justify-center items-center">
        {isComplete ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <p className="text-lg font-bold text-slate-800">All Steps Completed</p>
            <p className="text-sm text-slate-500 mt-1">Please finish the simulation to see your results.</p>
          </div>
        ) : (
          <div className="w-full">
            <p className="font-semibold text-slate-700 mb-6 text-center text-lg">
              {steps[activeStepIndex]?.instruction}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {availableActions.map((action) => {
                const isError = errorAction === action;
                const isSuccess = successAction === action;
                
                let btnStyle = "bg-slate-100 hover:bg-blue-50 hover:border-blue-300 border-slate-200 text-slate-700";
                if (isError) btnStyle = "bg-red-100 border-red-300 text-red-700 animate-shake";
                if (isSuccess) btnStyle = "bg-green-100 border-green-300 text-green-700 scale-105 transition-transform";

                return (
                  <button
                    key={action}
                    onClick={() => handleActionClick(action)}
                    disabled={successAction !== null}
                    className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${btnStyle}`}
                  >
                    {action.replace(/_/g, ' ').toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
