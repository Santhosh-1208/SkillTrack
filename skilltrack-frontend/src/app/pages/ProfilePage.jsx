import { useEffect, useState } from "react";
import { User, Shield, Award, Trophy, LogOut, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../components/ui/dialog";
import { useAuth } from "../../platform/engine/context/AuthContext";
import { attemptsApi } from "../../api/attemptsApi";
import { usersApi } from "../../api/usersApi";
import { useToast } from "../../platform/engine/context/ToastContext";
import { EditProfileForm } from "../forms/EditProfileForm";
import { FieldLabel, inputCls } from "../components/shared/FormModal";

// ---------- Change Password inline dialog -----------------------------------
function ChangePasswordDialog({ open, onOpenChange, userId }) {
  const toast = useToast();
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.oldPassword || !form.newPassword) {
      setError("All fields are required.");
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await usersApi.update(userId, {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      toast.success("Password changed successfully.");
      setForm({ oldPassword: "", newPassword: "", confirm: "" });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Could not change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <input
              type="password"
              className={inputCls}
              value={form.oldPassword}
              onChange={set("oldPassword")}
              placeholder="Your current password"
              autoComplete="current-password"
            />
          </div>
          <div>
            <FieldLabel>New Password</FieldLabel>
            <input
              type="password"
              className={inputCls}
              value={form.newPassword}
              onChange={set("newPassword")}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <FieldLabel>Confirm New Password</FieldLabel>
            <input
              type="password"
              className={inputCls}
              value={form.confirm}
              onChange={set("confirm")}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors" style={{ border: '1px solid rgba(0,0,0,0.1)', color: '#4b5563', background: 'transparent' }}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Change Password"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Personal Info read-only dialog ----------------------------------
function PersonalInfoDialog({ open, onOpenChange, user }) {
  const rows = [
    { label: "Full Name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone || "—" },
    { label: "Role", value: user?.role },
    { label: "Department", value: user?.department || "—" },
    { label: "Organization", value: user?.organization || "—" },
    ...(user?.role === "learner"
      ? [
          { label: "Roll Number", value: user?.rollNumber || "—" },
          { label: "Batch", value: user?.batch || "—" },
        ]
      : []),
    ...(user?.role === "trainer"
      ? [
          { label: "Specialization", value: user?.specialization || "—" },
          { label: "Experience", value: user?.experienceYears != null ? `${user.experienceYears} yrs` : "—" },
        ]
      : []),
    { label: "Status", value: user?.status || "Active" },
    { label: "Joined", value: user?.joinedAt || "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Personal Information</DialogTitle>
          <DialogDescription>Your account details on record.</DialogDescription>
        </DialogHeader>
        <div className="divide-y pt-1" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2.5 text-sm">
              <span className="font-medium" style={{ color: '#4b5563' }}>{label}</span>
              <span className="font-semibold text-right max-w-[60%] truncate capitalize" style={{ color: '#111827' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className="px-4 py-2 rounded-xl text-sm font-medium transition-colors" style={{ border: '1px solid rgba(0,0,0,0.1)', color: '#4b5563', background: 'transparent' }}>
              Close
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Profile Page ----------------------------------------------------
export function ProfilePage({ onNavigate }) {
  const { user, logout, refresh } = useAuth();
  const toast = useToast();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [stats, setStats] = useState({ completed: 0, passed: 0 });

  useEffect(() => {
    if (!user?.id || user.role !== "learner") return;
    attemptsApi
      .listForLearner(user.id)
      .then((atts) => {
        const completed = atts.filter((a) => a.status === "completed" || a.final_score);
        const passedAttempts = completed.filter((a) => a.final_score?.passed === true);
        const uniquePassedSims = new Set(passedAttempts.map((a) => a.simulation_id));
        setStats({
          completed: completed.length,
          passed: passedAttempts.length,
          certificates: uniquePassedSims.size,
        });
      })
      .catch(() => {});
  }, [user?.id, user?.role]);

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  if (!user) {
    return (
      <div className="p-5">
        <p className="text-sm" style={{ color: '#4b5563' }}>Not logged in.</p>
        <button onClick={() => onNavigate("login")} className="text-sm text-blue-500 mt-2 font-semibold hover:underline">
          Go to Login
        </button>
      </div>
    );
  }

  const menuItems = [
    {
      icon: User,
      label: "Personal Information",
      onClick: () => setInfoOpen(true),
    },
    {
      icon: Shield,
      label: "Change Password",
      onClick: () => setPwOpen(true),
    },
    ...(user.role === "learner"
      ? [
          { icon: Award, label: "Certificates", count: stats.certificates, onClick: () => onNavigate("certificates") },
          { icon: Trophy, label: "Achievements", count: stats.completed, onClick: () => onNavigate("achievements") },
        ]
      : []),
  ];

  return (
    <div className="p-5 max-w-lg" style={{ background: '#f5f7f8', minHeight: '100vh' }}>
      <h1 className="text-xl font-bold mb-5" style={{ color: '#111827' }}>Profile</h1>
      <div className="rounded-2xl p-6 mb-3" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-4 pb-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {initial}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: '#111827' }}>{user.name}</h2>
            <p className="text-xs mt-0.5 capitalize" style={{ color: '#4b5563' }}>
              {user.organization || "—"} · {user.department || user.role}
            </p>
            <button
              onClick={() => setEditOpen(true)}
              className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          {[
            { label: "Role", value: user.role },
            { label: user.role === "learner" ? "Simulations" : "Status", value: user.role === "learner" ? stats.completed : user.status },
            { label: user.role === "learner" ? "Passed" : "Joined", value: user.role === "learner" ? stats.passed : user.joinedAt },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold capitalize" style={{ color: '#111827' }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{label}</p>
            </div>
          ))}
        </div>
        <div className="pt-3 space-y-0.5">
          {menuItems.map(({ icon: Icon, label, count, onClick }) => (
            <button
              key={label}
              onClick={onClick || undefined}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors" style={{ background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <Icon size={15} style={{ color: '#4b5563' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: '#111827' }}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                {count != null && <span className="text-xs" style={{ color: '#6b7280' }}>{count}</span>}
                <ChevronRight size={14} style={{ color: '#6b7280' }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setLogoutOpen(true)}
        className="w-full py-3 rounded-2xl text-sm font-semibold transition-colors flex items-center justify-center gap-2" style={{ background: 'rgba(0,86,210,0.1)', color: '#0056D2', border: '1px solid rgba(0,86,210,0.25)' }}
      >
        <LogOut size={15} /> Logout
      </button>

      {/* Edit Profile */}
      <EditProfileForm open={editOpen} onOpenChange={setEditOpen} user={user} onSaved={() => refresh()} />

      {/* Personal Information */}
      <PersonalInfoDialog open={infoOpen} onOpenChange={setInfoOpen} user={user} />

      {/* Change Password */}
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} userId={user.id} />

      {/* Logout Confirm */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out of SKILLTRACK?</DialogTitle>
            <DialogDescription>
              You'll need to sign in again to access your dashboard, simulations, and progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-xl text-sm font-medium transition-colors" style={{ border: '1px solid rgba(0,0,0,0.1)', color: '#4b5563', background: 'transparent' }}>
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={async () => {
                setLogoutOpen(false);
                await logout();
                onNavigate?.("login");
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Log Out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
