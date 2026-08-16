import { LayoutDashboard, Zap, User, Settings, LogOut } from "lucide-react";

export function DesignSystemPage() {
  return (
    <div className="p-6 max-w-3xl" style={{ fontFamily: "Poppins, sans-serif" }}>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Design System</h1>
      <p className="text-gray-500 text-sm mb-7">SkillTrack — visual language reference</p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Color Palette</h2>
        <div className="flex gap-4 flex-wrap">
          {[
            { hex: "#0A2240", label: "Navy" },
            { hex: "#3B6EF5", label: "Blue" },
            { hex: "#22C55E", label: "Success" },
            { hex: "#F59E0B", label: "Warning" },
            { hex: "#EF4444", label: "Danger" },
          ].map(({ hex, label }) => (
            <div key={hex} className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-2xl shadow-md" style={{ backgroundColor: hex }} />
              <p className="text-[11px] font-mono text-gray-500">{hex}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Typography</h2>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          {[
            { label: "Heading 1", cls: "text-3xl font-bold" },
            { label: "Heading 2", cls: "text-xl font-semibold" },
            { label: "Poppins SemiBold", cls: "text-base font-semibold" },
            { label: "Body Text 1", cls: "text-sm font-medium text-gray-600" },
            { label: "Body Text", cls: "text-sm text-gray-500" },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-baseline gap-4">
              <span className="text-[10px] text-gray-400 w-28 shrink-0">{label}</span>
              <span className={cls} style={{ fontFamily: "Poppins, sans-serif" }}>
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Buttons</h2>
        <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
            Primary Button
          </button>
          <button className="px-4 py-2 border-2 border-blue-500 text-blue-500 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
            Secondary Button
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">
            Danger
          </button>
          <button className="px-4 py-2 bg-amber-400 text-white rounded-lg text-sm font-semibold hover:bg-amber-500 transition-colors">
            Alert
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Icons Material</h2>
        <div className="flex gap-8 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          {[
            { icon: LayoutDashboard, label: "Dashboard" },
            { icon: Zap, label: "Simulations" },
            { icon: User, label: "Profile" },
            { icon: Settings, label: "Settings" },
            { icon: LogOut, label: "Logout" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <Icon size={20} className="text-gray-600" />
              </div>
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
