const INCOMPLETE_ANALYSIS_STATUSES = new Set([
  "pending",
  "processing",
  "ai_model_pending",
  "analysis_pending",
  "analysis_waiting",
  "skin_analysis_processing",
  "roi_pending",
  "roi_processing",
  "failed",
  "error",
  "model_missing",
  "invalid_result",
]);

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

export function toAnalysisScoreNumber(score) {
  if (score === null || score === undefined || score === "") {
    return null;
  }

  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

export function isIncompleteAnalysisStatus(status) {
  return INCOMPLETE_ANALYSIS_STATUSES.has(normalizeStatus(status));
}

export function shouldShowAnalysisScore({ score, status, saved } = {}) {
  if (saved === false) {
    return false;
  }

  if (isIncompleteAnalysisStatus(status)) {
    return false;
  }

  return toAnalysisScoreNumber(score) !== null;
}
