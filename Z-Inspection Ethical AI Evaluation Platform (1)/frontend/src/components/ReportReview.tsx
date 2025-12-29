import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Lock, Save, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { User } from "../types";

type RoleCategory = "admin" | "expert" | "viewer";

type ExpertComment = {
  expertId?: string;
  expertName?: string;
  commentText?: string;
  updatedAt?: string;
};

type ReportDoc = {
  _id?: string;
  id?: string;
  title?: string;
  status?: "draft" | "final" | "archived";
  generatedAt?: string;
  createdAt?: string;
  finalizedAt?: string;
  projectId?: { _id?: string; id?: string; title?: string } | string;
  expertComments?: ExpertComment[];
};

const getRoleCategory = (role: string | undefined): RoleCategory => {
  const r = String(role || "").toLowerCase();
  if (r.includes("admin")) return "admin";
  if (r.includes("viewer")) return "viewer";
  return "expert";
};

export function ReportReview({
  reportId,
  currentUser,
  onBack,
}: {
  reportId: string;
  currentUser: User;
  onBack: () => void;
}) {
  const roleCategory = useMemo(() => getRoleCategory(currentUser.role), [currentUser.role]);
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [report, setReport] = useState<ReportDoc | null>(null);
  const [expertCommentDraft, setExpertCommentDraft] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    ethical_principles: string[];
    risk_tone: "low" | "medium" | "high";
    warning_signal: boolean;
    confidence: "low" | "medium" | "high";
  } | null>(null);

  const isLocked = report?.status === "final";
  const canFinalize = roleCategory === "admin" && !isLocked;
  const canSaveExpertComment = roleCategory === "expert" && !isLocked;

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(api(`/api/reports/${reportId}?userId=${currentUser.id}`));
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.error || "Report could not be loaded");
      }
      const data = (await res.json()) as ReportDoc;
      setReport(data);
      if (roleCategory === "expert") {
        const comments = Array.isArray(data.expertComments) ? data.expertComments : [];
        const mine = comments.find((c) => String(c.expertId) === String(currentUser.id)) || null;
        setExpertCommentDraft(String(mine?.commentText || ""));
      }
    } catch (e: any) {
      alert(e?.message || "Report could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, currentUser.id]);

  const handleSaveExpertComment = async () => {
    if (!canSaveExpertComment) return;
    setSavingComment(true);
    try {
      const res = await fetch(
        api(`/api/reports/${reportId}/expert-comment`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            commentText: expertCommentDraft,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.error || "Failed to save comment");
      }
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to save comment");
    } finally {
      setSavingComment(false);
    }
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;
    const ok = window.confirm(
      "Finalize & Lock this report?\n\nAfter finalization, experts will no longer be able to edit or comment."
    );
    if (!ok) return;

    setFinalizing(true);
    try {
      const res = await fetch(api(`/api/reports/${reportId}/finalize`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.error || "Failed to finalize report");
      }
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to finalize report");
    } finally {
      setFinalizing(false);
    }
  };

  const handleAnalyzeComments = async () => {
    if (!report?.expertComments || report.expertComments.length === 0) {
      alert("No expert comments to analyze.");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const comments = report.expertComments
        .map((c) => c.commentText)
        .filter((text) => text && text.trim());

      if (comments.length === 0) {
        alert("No valid comments to analyze.");
        return;
      }

      const res = await fetch(api("/api/reports/analyze-expert-comments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertComments: comments }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.error || "Failed to analyze comments");
      }

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e: any) {
      alert(e?.message || "Failed to analyze expert comments");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div>
              <div className="text-sm text-gray-500">Report Review</div>
              <div className="text-lg font-semibold text-gray-900">{report?.title || "Report"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLocked && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold">
                <Lock className="h-3.5 w-3.5" />
                Final & Locked
              </span>
            )}

            {roleCategory === "expert" && (
              <button
                type="button"
                onClick={handleSaveExpertComment}
                disabled={!canSaveExpertComment || savingComment}
                className="relative z-50 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                style={{
                  display: "inline-flex",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  boxShadow: "0 10px 24px rgba(16, 185, 129, 0.20)",
                  opacity: 1,
                  visibility: "visible",
                }}
              >
                {savingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingComment ? "Saving..." : "Save"}
              </button>
            )}

            {canFinalize && (
              <button
                onClick={handleFinalize}
                disabled={finalizing || loading}
                className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Finalize & Lock
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 flex items-center justify-center text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading report...
          </div>
        ) : (
          <div className="space-y-6">
            {roleCategory === "expert" && (
              <>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-6">
                    <textarea
                      value={expertCommentDraft}
                      onChange={(e) => setExpertCommentDraft(e.target.value)}
                      disabled={!canSaveExpertComment}
                      rows={14}
                      className="w-full border border-gray-200 rounded-2xl p-5 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 disabled:bg-gray-50"
                      placeholder={isLocked ? "This report is read-only." : "Write your expert comment here..."}
                    />
                  </div>
                </div>
              </>
            )}

            {roleCategory === "admin" && (
              <>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Expert Comments</div>
                    {Array.isArray(report?.expertComments) && report!.expertComments!.length > 0 && (
                      <button
                        onClick={handleAnalyzeComments}
                        disabled={analyzing}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            AI Analysis
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="p-5 space-y-4">
                    {Array.isArray(report?.expertComments) && report!.expertComments!.length > 0 ? (
                      report!.expertComments!.map((c, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-semibold text-gray-900">{c.expertName || "Expert"}</div>
                            <div className="text-xs text-gray-500">
                              {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ""}
                            </div>
                          </div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">{c.commentText || ""}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No expert comments yet.</div>
                    )}
                  </div>
                </div>

                {analysisResult && (
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <div className="text-sm font-semibold text-gray-900">AI Analysis Results</div>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Summary */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Summary</div>
                        <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{analysisResult.summary}</div>
                      </div>

                      {/* Risk Tone & Warning Signal */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Risk Tone</div>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            analysisResult.risk_tone === "high" 
                              ? "bg-red-100 text-red-700" 
                              : analysisResult.risk_tone === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {analysisResult.risk_tone === "high" && <AlertTriangle className="h-3 w-3" />}
                            {analysisResult.risk_tone === "medium" && <AlertTriangle className="h-3 w-3" />}
                            {analysisResult.risk_tone === "low" && <CheckCircle2 className="h-3 w-3" />}
                            {analysisResult.risk_tone.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Warning Signal</div>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            analysisResult.warning_signal
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {analysisResult.warning_signal ? (
                              <>
                                <AlertTriangle className="h-3 w-3" />
                                Warning Detected
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                No Critical Warnings
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ethical Principles */}
                      {analysisResult.ethical_principles.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Ethical Principles Identified</div>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.ethical_principles.map((principle, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium"
                              >
                                {principle}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Confidence */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Confidence Level</div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          analysisResult.confidence === "high"
                            ? "bg-green-100 text-green-700"
                            : analysisResult.confidence === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {analysisResult.confidence.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {roleCategory === "viewer" && <div />}
          </div>
        )}
      </div>
    </div>
  );
}


