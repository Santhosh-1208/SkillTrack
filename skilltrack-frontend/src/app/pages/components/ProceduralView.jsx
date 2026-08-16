import { Zap } from "lucide-react";

export function ProceduralView({ simulation }) {
  return (
    <div className="flex-1 rounded-2xl h-44 flex items-center justify-center" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="text-center p-6">
        <div className="w-16 h-16 rounded-3xl shadow-md flex items-center justify-center mx-auto mb-3" style={{ background: '#f3f4f6' }}>
          <Zap size={28} className="text-amber-500" />
        </div>
        <p className="text-sm font-semibold" style={{ color: '#ffffff' }}>{simulation?.branch}</p>
        <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: '#4b5563' }}>{simulation?.goal}</p>
      </div>
    </div>
  );
}
