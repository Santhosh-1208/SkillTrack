import { useEffect, useState } from "react";
import {
  Users, UserMinus, ShieldCheck, TrendingUp, Award, BookOpen,
  Star, Clock, ChevronRight
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { usersApi } from "../../api/usersApi";
import { attemptsApi } from "../../api/attemptsApi";
import { useAuth } from "../../platform/engine/context/AuthContext";

function StatPill({ icon: Icon, label, value, color = "#3b82f6" }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: color + "12", border: `1px solid ${color}22` }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
        <Icon size={12} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-medium" style={{ color: "#6b7280" }}>{label}</p>
        <p className="text-sm font-bold leading-none mt-0.5" style={{ color: "#111827" }}>{value}</p>
      </div>
    </div>
  );
}

function TrainerCard({ trainer, isCurrentTrainer, stats, onSelect, onRemove, processing }) {
  const learnerCount = stats?.learnerCount ?? 0;
  const avgScore = stats?.avgScore ?? null;
  const completedCount = stats?.completedCount ?? 0;

  const scoreColor = avgScore == null ? "#9ca3af" : avgScore >= 80 ? "#22c55e" : avgScore >= 60 ? "#3b82f6" : "#f59e0b";

  return (
    <div
      className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col"
      style={{ borderColor: isCurrentTrainer ? "#3b82f6" : "#e5e7eb", borderWidth: isCurrentTrainer ? 2 : 1 }}
    >
      {isCurrentTrainer && (
        <div className="flex items-center gap-1.5 px-5 py-2 rounded-t-2xl text-xs font-bold text-blue-700"
          style={{ background: "linear-gradient(90deg,#eff6ff,#dbeafe)" }}>
          <ShieldCheck size={13} className="text-blue-600" /> Your Current Trainer
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
            style={{ background: isCurrentTrainer ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#6b7280,#9ca3af)" }}>
            {trainer.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{trainer.name}</h3>
            <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
              {trainer.specialization || "General Trainer"}
            </p>
            {trainer.experienceYears > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock size={9} /> {trainer.experienceYears} yr{trainer.experienceYears !== 1 ? "s" : ""} experience
              </p>
            )}
          </div>
        </div>

        {/* Blog / Bio */}
        <div className="mb-4 p-3 rounded-xl italic text-xs text-gray-600 line-clamp-3"
          style={{ background: "#f9fafb", borderLeft: "3px solid #dbeafe" }}>
          "{trainer.blog || "I'm here to guide you through your SkillTrack journey. Let's achieve your goals together!"}"
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatPill
            icon={Users}
            label="Learners"
            value={learnerCount}
            color="#3b82f6"
          />
          <StatPill
            icon={Award}
            label="Avg Score"
            value={avgScore != null ? `${avgScore}%` : "—"}
            color={scoreColor}
          />
          <StatPill
            icon={BookOpen}
            label="Attempts"
            value={completedCount}
            color="#8b5cf6"
          />
        </div>

        {/* Action button */}
        {isCurrentTrainer ? (
          <button
            onClick={onRemove}
            disabled={processing}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fecaca" }}
          >
            <UserMinus size={14} /> Remove Trainer
          </button>
        ) : (
          <button
            onClick={() => onSelect(trainer.id)}
            disabled={processing}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}
          >
            Select Trainer <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ExploreTrainersPage({ onNavigate }) {
  const { user, refresh } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [trainerStats, setTrainerStats] = useState({}); // { trainerId: { learnerCount, avgScore, completedCount } }
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      usersApi.list("trainer"),
      usersApi.list("learner"),
      usersApi.trainerStats(), // { trainerId: learnerCount } from backend
    ])
      .then(async ([trainerList, allLearners, backendCounts]) => {
        setTrainers(trainerList);

        // Build stats per trainer
        const stats = {};
        for (const t of trainerList) {
          const learnerCount = backendCounts[t.id] ?? 0;
          // Gather learners assigned to this trainer to compute avg score
          const myLearners = allLearners.filter(l => l.trainerId === t.id);

          let totalScore = 0;
          let scoredCount = 0;
          let completedCount = 0;

          // Fetch attempts for up to 5 learners (cap to avoid too many requests)
          const sample = myLearners.slice(0, 5);
          await Promise.all(sample.map(async (learner) => {
            try {
              const attempts = await attemptsApi.listForLearner(learner.id);
              const completed = attempts.filter(a => a.status === "completed" || a.final_score);
              completedCount += completed.length;
              for (const a of completed) {
                const s = a.final_score?.overall_score;
                if (s != null) { totalScore += s; scoredCount++; }
              }
            } catch { /* ignore */ }
          }));

          stats[t.id] = {
            learnerCount,
            avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : null,
            completedCount,
          };
        }
        setTrainerStats(stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.trainerId]);

  const handleSelectTrainer = async (trainerId) => {
    if (processing) return;
    setProcessing(true);
    try {
      await usersApi.update(user.id, { trainerId });
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveTrainer = async () => {
    if (processing) return;
    setRemoveDialogOpen(false);
    setProcessing(true);
    try {
      await usersApi.update(user.id, { trainerId: null });
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const currentTrainer = trainers.find(t => t.id === user?.trainerId);
  const otherTrainers = trainers.filter(t => t.id !== user?.trainerId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading trainers & stats…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
            <Users size={18} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Explore Trainers</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          Browse expert trainers, check their learner stats, and choose who guides your simulation journey.
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          <Users size={11} /> {trainers.length} trainer{trainers.length !== 1 ? "s" : ""} available
        </div>
        {user?.trainerId && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
            <ShieldCheck size={11} /> You have a trainer assigned
          </div>
        )}
        {!user?.trainerId && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <TrendingUp size={11} /> Select a trainer to track your progress
          </div>
        )}
      </div>

      {/* Current trainer on top */}
      {currentTrainer && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Your Trainer</h2>
          <div className="grid grid-cols-1 gap-5">
            <TrainerCard
              trainer={currentTrainer}
              isCurrentTrainer={true}
              stats={trainerStats[currentTrainer.id]}
              onRemove={() => setRemoveDialogOpen(true)}
              onSelect={handleSelectTrainer}
              processing={processing}
            />
          </div>
        </div>
      )}

      {/* All / other trainers */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          {currentTrainer ? "Other Trainers" : "All Trainers"}
        </h2>
        {otherTrainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users size={24} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No other trainers available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {otherTrainers.map(t => (
              <TrainerCard
                key={t.id}
                trainer={t}
                isCurrentTrainer={false}
                stats={trainerStats[t.id]}
                onSelect={handleSelectTrainer}
                onRemove={handleRemoveTrainer}
                processing={processing}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trainer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your current trainer? You can always select a new one later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveTrainer}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Remove Trainer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
