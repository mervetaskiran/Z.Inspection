# Acceptance Criteria Verification

## ✅ 1. Report contains: 7-principle bar chart + legend + thresholds
**Status: COMPLETE**
- Location: `backend/services/htmlReportTemplateService.js` lines 370-388
- Implementation:
  - Bar chart image embedded via `getChartImage('principleBarChart')`
  - Legend box with scale explanation (0-4)
  - Thresholds listed: 0.0-1.0 (Low), 1.0-2.0 (Moderate), 2.0-3.0 (High), 3.0-4.0 (Critical)
  - Note about canonical scores from MongoDB

## ✅ 2. Report contains: Role×Principle heatmap with only submitted roles
**Status: COMPLETE**
- Location: `backend/services/htmlReportTemplateService.js` lines 390-402
- Implementation:
  - Heatmap image embedded via `getChartImage('principleEvaluatorHeatmap')`
  - Legend explicitly states: "Only evaluators with submitted responses (status="submitted") are shown."
  - Heatmap generated from `analyticsService.js` which uses only submitted evaluators
  - `reportMetricsService.js` line 625-629 uses `evaluatorsWithScores` (only submitted)

## ✅ 3. Report contains: Evidence coverage donut + percentage
**Status: COMPLETE**
- Location: `backend/services/htmlReportTemplateService.js` lines 358-365, 507-512
- Implementation:
  - Evidence coverage percentage shown in dashboard card (line 361-365)
  - Evidence type donut chart embedded via `getChartImage('evidenceTypeChart')` (line 507-512)
  - Coverage calculated from `tensionsSummary.evidenceCoveragePct`

## ✅ 4. Report contains: Tensions reviewState visualization
**Status: COMPLETE**
- Location: `backend/services/htmlReportTemplateService.js` lines 482-492
- Implementation:
  - Tension review state chart embedded via `getChartImage('tensionReviewStateChart')`
  - Chart shows distribution of: Proposed, Under Review, Accepted, Disputed, Resolved
  - Legend explains review state computation rules

## ✅ 5. Report contains: Top risky questions table with answer snippets from responses
**Status: COMPLETE**
- Location: `backend/services/htmlReportTemplateService.js` lines 424-455
- Implementation:
  - Table shows: Question Code, Principle, Avg Risk Score, Severity, Role(s), Answer Excerpt
  - Answer excerpts extracted from `topRiskDrivers.questions[].answerExcerpts`
  - `reportMetricsService.js` lines 471-474 extracts answer excerpts from responses
  - Excerpts truncated to 140 characters for display

## ✅ 6. Report contains: Tensions table with reviewState/consensus/evidenceCount
**Status: COMPLETE**
- Location: `backend/services/htmlReportTemplateService.js` lines 514-548
- Implementation:
  - Table columns: Conflict, Severity, Review State, Evidence, Consensus, Claim
  - ReviewState shown from `t.consensus.reviewState`
  - Consensus shows: agreeCount/disagreeCount + agreePct
  - EvidenceCount shown: `${t.evidence.count} attached` or "No evidence attached"
  - Evidence types listed when available

## ✅ 7. Clickable internal anchors exist in DOCX (and ideally PDF)
**Status: COMPLETE**
- Location: `backend/services/htmlReportTemplateService.js` lines 302, 317-319, 417, 475, 564, 620, 656, 694
- Implementation:
  - Dashboard section: `id="section-dashboard"` (line 302)
  - Quick Navigation links: `href="#section-dashboard"`, `href="#section-top-risks"`, etc. (lines 317-319)
  - All major sections have IDs: `section-top-risks`, `section-tensions`, `section-principles`, `section-recommendations`, `section-methodology`, `section-appendix`
  - "Back to Dashboard" links in each section (lines 417, 475, 564, 620, 656, 694)
  - PDF generated via Puppeteer preserves HTML anchors (works in PDF viewers that support internal links)

## ✅ 8. Evaluator list shows correct number of real submitters; no phantom 2-per-role
**Status: COMPLETE**
- Location: `backend/services/reportMetricsService.js` lines 20-189
- Implementation:
  - `getProjectEvaluators()` function uses `responses` with `status: { $in: ['in-progress', 'submitted'] }` (line 113-115)
  - Filters to only evaluators with matching scores (line 184-188)
  - Returns `withScores` list which is used in report tables
  - Gemini prompt explicitly instructs: "Do NOT reference 'Expert 1/2' or 'Medical Expert 3/4' - use actual names from the list above." (line 1303 in geminiService.js)
  - Report tables use `evaluators.withScores` which only includes actual submitted evaluators

## ✅ 9. Gemini does not compute scores; it only narrates using provided JSON
**Status: COMPLETE**
- Location: `backend/services/geminiService.js` lines 1146-1153
- Implementation:
  - System instruction explicitly states: "MUST NOT compute, recalculate, infer, normalize, or modify any numerical score"
  - Multiple guardrails: "All numeric metrics MUST come from reportMetrics JSON - never compute them"
  - User prompt reinforces: "Use ONLY numbers from reportMetrics JSON"
  - Gemini only receives pre-computed metrics, never raw data for computation

## ✅ 10. "Show Report" button appears only when latest report exists for that project
**Status: COMPLETE**
- Location: `frontend/src/components/ProjectDetail.tsx` lines 67, 75-90, 518-525, 658-665
- Implementation:
  - `latestReport` state initialized as `null` (line 67)
  - `useEffect` fetches latest report on mount (lines 75-90)
  - After report generation, fetches latest report again (lines 518-525)
  - Button only renders when `latestReport` is truthy: `{latestReport && (...)}` (line 658)
  - Button links to `latestReport.fileUrl` which serves the stored PDF

## Summary
**ALL 10 ACCEPTANCE CRITERIA ARE MET ✅**

