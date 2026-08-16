import React, { useState } from 'react';

export default function SopList({ steps, activeStepIndex, onUseHint, onUseAnswer }) {
  const [revealedHints, setRevealedHints] = useState(new Set());
  const [revealedAnswers, setRevealedAnswers] = useState(new Set());

  if (!steps || steps.length === 0) return null;

  const handleShowHint = (stepId) => {
    setRevealedHints(prev => new Set([...prev, stepId]));
    if (onUseHint) onUseHint(stepId);
  };

  const handleShowAnswer = (stepId) => {
    setRevealedAnswers(prev => new Set([...prev, stepId]));
    if (onUseAnswer) onUseAnswer(stepId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Standard Operating Procedures (SOPs)</h2>
      <div className="space-y-4">
        {steps.map((step, index) => {
          // If activeStepIndex is provided, hide future steps.
          if (activeStepIndex !== undefined && index > activeStepIndex) {
            return null;
          }

          const isCompleted = activeStepIndex !== undefined && index < activeStepIndex;
          const isActive = activeStepIndex !== undefined && index === activeStepIndex;
          const isHintRevealed = revealedHints.has(step.step_id);
          const isAnswerRevealed = revealedAnswers.has(step.step_id);

          return (
            <div key={step.step_id} className={`flex items-start gap-4 p-4 rounded-md border ${isActive ? 'bg-blue-50 border-blue-200' : isCompleted ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-slate-50 border-slate-100'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {isCompleted ? '✓' : (step.order || index + 1)}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{step.instruction}</p>
                
                {step.is_safety_critical && !isCompleted && (
                  <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded mr-2">
                    Safety Critical
                  </span>
                )}

                {isActive && (
                  <div className="mt-3 flex gap-2">
                    {!isHintRevealed && step.hint && (
                      <button 
                        onClick={() => handleShowHint(step.step_id)}
                        className="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                        title="Using a hint reduces the score for this step by 30%"
                      >
                        Get Hint
                      </button>
                    )}
                    {!isAnswerRevealed && (
                      <button 
                        onClick={() => handleShowAnswer(step.step_id)}
                        className="text-xs px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                        title="Showing the answer forfeits the marks for this step"
                      >
                        Show Answer
                      </button>
                    )}
                  </div>
                )}

                {isHintRevealed && step.hint && isActive && (
                  <div className="mt-2 p-3 bg-blue-100 border-l-4 border-blue-400 text-sm text-slate-700 rounded-r">
                    <span className="font-semibold text-blue-800">Hint:</span> {step.hint}
                  </div>
                )}
                
                {isAnswerRevealed && isActive && (
                  <div className="mt-2 p-3 bg-orange-100 border-l-4 border-orange-400 text-sm text-slate-700 rounded-r">
                    <span className="font-semibold text-orange-800">Action:</span> Type <code className="bg-orange-200 px-1 py-0.5 rounded text-orange-900 font-mono text-xs">{step.expected_action}</code> in the terminal.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
