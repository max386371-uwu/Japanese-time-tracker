// Small, dependency-free typo-tolerant matching. Used by Search so a
// misspelled query ("Genki" -> "Genky") still finds the right result.
// Kept cheap on purpose: exact substring is tried first (the common
// case), and the Levenshtein fallback only runs over short strings
// (names/titles), never over large collections like session notes, so
// it stays fast even with thousands of sessions.

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

// True if `text` contains `query` exactly, or something close enough to
// it (small typo/transposition/missing letter) at the word level.
export function fuzzyMatch(text, query) {
  if (!query) return false;
  const t = String(text || "").toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (t.includes(q)) return true;
  if (q.length < 3) return false; // too short for fuzzy matching to be meaningful

  const maxDist = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3;
  const words = t.split(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/i).filter(Boolean);
  for (const w of words) {
    if (Math.abs(w.length - q.length) <= maxDist && levenshtein(w, q) <= maxDist) return true;
  }
  return false;
}
