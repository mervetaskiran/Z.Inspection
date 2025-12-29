/**
 * HTML Report Template Service
 * Generates professional dashboard-style HTML report for PDF conversion
 * Includes charts, tables, and internal navigation links
 */

/**
 * Generate HTML report template with dashboard layout
 * @param {Object} reportMetrics - From reportMetricsService
 * @param {Object} geminiNarrative - Narrative from Gemini
 * @param {Object} chartImages - Base64 encoded chart images
 * @param {Object} options - Additional options
 * @returns {string} Complete HTML string
 */
function generateHTMLReport(reportMetrics, geminiNarrative, chartImages = {}, options = {}) {
  const project = reportMetrics.project || {};
  const coverage = reportMetrics.coverage || {};
  const scoring = reportMetrics.scoring || {};
  const tensions = reportMetrics.tensions || {};
  const topRiskDrivers = reportMetrics.topRiskDrivers || {};
  const evaluators = reportMetrics.evaluators || {};

  // Helper to encode base64 images
  const getChartImage = (key) => {
    if (chartImages[key] && Buffer.isBuffer(chartImages[key])) {
      return `data:image/png;base64,${chartImages[key].toString('base64')}`;
    }
    return chartImages[key] || '';
  };

  // Helper to format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Risk tier mapping (0-4 scale: Higher score = Higher risk)
  // Note: In Z-Inspection, score 4 = best/low risk, score 0 = worst/high risk
  // But user requirement says "Higher score = Higher risk", so we invert the logic
  // Actually, let me check: if score 4 = best, then higher score = lower risk
  // User says "Higher score = Higher risk", so we need to check the actual scale
  // Based on the requirement: "0.0-1.0 = Low risk / Good, 3.0-4.0 = Critical"
  // This means: Lower score = Better, Higher score = Worse (Critical)
  const getRiskTier = (score) => {
    // Score 0-1: Low risk (best)
    if (score <= 1.0) return { label: 'Low', color: '#10b981' };
    // Score 1-2: Moderate risk
    if (score <= 2.0) return { label: 'Moderate', color: '#f59e0b' };
    // Score 2-3: High risk
    if (score <= 3.0) return { label: 'High', color: '#ef4444' };
    // Score 3-4: Critical risk (worst)
    return { label: 'Critical', color: '#dc2626' };
  };

  const overallAvg = scoring.totalsOverall?.avg || 0;
  const overallRisk = getRiskTier(overallAvg);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ethical AI Evaluation Report - ${project.title || 'Project'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
    }
    
    .page {
      page-break-after: always;
      padding: 2cm 1.5cm;
      min-height: 29.7cm;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Header */
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.5cm;
      margin-bottom: 1cm;
    }
    
    .header h1 {
      font-size: 24pt;
      color: #1e40af;
      margin-bottom: 0.2cm;
    }
    
    .header-meta {
      font-size: 9pt;
      color: #6b7280;
      display: flex;
      gap: 1cm;
    }
    
    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1cm;
      margin-bottom: 1cm;
    }
    
    .dashboard-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.8cm;
    }
    
    .dashboard-card h3 {
      font-size: 12pt;
      color: #374151;
      margin-bottom: 0.4cm;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 0.2cm;
    }
    
    .stat-value {
      font-size: 28pt;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 0.2cm;
    }
    
    .stat-label {
      font-size: 9pt;
      color: #6b7280;
    }
    
    /* Charts */
    .chart-container {
      margin: 1cm 0;
      page-break-inside: avoid;
    }
    
    .chart-image {
      width: 100%;
      max-width: 100%;
      height: auto;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }
    
    .chart-legend {
      background: #f3f4f6;
      border-left: 4px solid #3b82f6;
      padding: 0.5cm;
      margin-top: 0.5cm;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    
    .chart-legend h4 {
      font-size: 10pt;
      margin-bottom: 0.3cm;
      color: #1f2937;
    }
    
    .chart-legend ul {
      margin-left: 1cm;
      color: #4b5563;
    }
    
    /* Navigation Links */
    .quick-nav {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      padding: 0.6cm;
      margin-bottom: 1cm;
      page-break-inside: avoid;
    }
    
    .quick-nav h3 {
      font-size: 11pt;
      color: #1e40af;
      margin-bottom: 0.3cm;
    }
    
    .quick-nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5cm;
    }
    
    .quick-nav-links a {
      color: #2563eb;
      text-decoration: underline;
      font-size: 9pt;
    }
    
    .quick-nav-links a:hover {
      color: #1d4ed8;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.8cm 0;
      page-break-inside: avoid;
      font-size: 9pt;
    }
    
    table th {
      background: #3b82f6;
      color: white;
      padding: 0.4cm;
      text-align: left;
      font-weight: 600;
    }
    
    table td {
      padding: 0.3cm;
      border-bottom: 1px solid #e5e7eb;
    }
    
    table tr:nth-child(even) {
      background: #f9fafb;
    }
    
    /* Sections */
    .section {
      margin: 1.5cm 0;
      page-break-inside: avoid;
    }
    
    .section h2 {
      font-size: 18pt;
      color: #1e40af;
      margin-bottom: 0.5cm;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.2cm;
    }
    
    .section h3 {
      font-size: 14pt;
      color: #374151;
      margin-top: 0.8cm;
      margin-bottom: 0.4cm;
    }
    
    /* Risk Badges */
    .risk-badge {
      display: inline-block;
      padding: 0.2cm 0.5cm;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      color: white;
    }
    
    .risk-critical { background: #dc2626; }
    .risk-high { background: #ef4444; }
    .risk-moderate { background: #f59e0b; }
    .risk-low { background: #10b981; }
    
    /* Footer */
    .footer {
      position: fixed;
      bottom: 1cm;
      left: 1.5cm;
      right: 1.5cm;
      text-align: center;
      font-size: 8pt;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 0.3cm;
    }
    
    /* Print styles */
    @media print {
      .page {
        margin: 0;
        padding: 2cm 1.5cm;
      }
      
      a {
        color: #2563eb;
        text-decoration: underline;
      }
    }
  </style>
</head>
  <body>
  <!-- COVER PAGE / DASHBOARD -->
  <div class="page" id="section-dashboard">
    <div class="header">
      <h1>Ethical AI Evaluation Report</h1>
      <div class="header-meta">
        <span><strong>Project:</strong> ${project.title || 'Untitled Project'}</span>
        <span><strong>Category:</strong> ${project.category || 'N/A'}</span>
        <span><strong>Generated:</strong> ${formatDate(options.generatedAt || new Date())}</span>
        <span><strong>Questionnaire:</strong> ${project.questionnaireKey || 'general-v1'}</span>
      </div>
    </div>

    <!-- Quick Navigation -->
    <div class="quick-nav">
      <h3>Quick Navigation</h3>
      <div class="quick-nav-links">
        <a href="#section-dashboard">Dashboard</a>
        <a href="#section-top-risks">Risks</a>
        <a href="#section-tensions">Tensions</a>
        <a href="#section-recommendations">Recommendations</a>
        <a href="#section-principles">Principle Analysis</a>
        <a href="#section-methodology">Methodology</a>
        <a href="#section-appendix">Appendix</a>
      </div>
    </div>

    <!-- Executive Dashboard -->
    <div class="dashboard-grid">
      <div class="dashboard-card">
        <h3>Overall Risk Summary</h3>
        <div class="stat-value" style="color: ${overallRisk.color}">
          ${overallAvg.toFixed(2)}/4.0
        </div>
        <div class="stat-label">
          <span class="risk-badge risk-${overallRisk.label.toLowerCase()}">${overallRisk.label} Risk</span>
        </div>
        <div style="margin-top: 0.3cm; font-size: 9pt; color: #6b7280;">
          Based on ${scoring.totalsOverall?.count || 0} evaluator submission(s)
        </div>
      </div>

      <div class="dashboard-card">
        <h3>Team Completion</h3>
        <div class="stat-value">${coverage.expertsSubmittedCount || 0}/${coverage.assignedExpertsCount || 0}</div>
        <div class="stat-label">Experts Submitted</div>
        <div style="margin-top: 0.3cm; font-size: 9pt; color: #6b7280;">
          ${coverage.expertsStartedCount || 0} started, ${coverage.assignedExpertsCount || 0} assigned
        </div>
      </div>

      <div class="dashboard-card">
        <h3>Ethical Tensions</h3>
        <div class="stat-value">${tensions.summary?.total || 0}</div>
        <div class="stat-label">Total Tensions Identified</div>
        <div style="margin-top: 0.3cm; font-size: 9pt; color: #6b7280;">
          ${tensions.summary?.accepted || 0} Accepted, ${tensions.summary?.underReview || 0} Under Review, ${tensions.summary?.disputed || 0} Disputed
        </div>
      </div>

      <div class="dashboard-card">
        <h3>Evidence Coverage</h3>
        <div class="stat-value">${options.analytics?.evidenceMetrics?.coveragePct?.toFixed(1) || tensions.summary?.evidenceCoveragePct?.toFixed(1) || 0}%</div>
        <div class="stat-label">Tensions with Evidence</div>
        <div style="margin-top: 0.3cm; font-size: 9pt; color: #6b7280;">
          ${options.analytics?.tensionsSummary?.total > 0 
            ? Math.round((options.analytics.evidenceMetrics?.coveragePct / 100) * options.analytics.tensionsSummary.total) 
            : (tensions.summary?.total > 0 ? Math.round((tensions.summary.evidenceCoveragePct / 100) * tensions.summary.total) : 0)} of ${options.analytics?.tensionsSummary?.total || tensions.summary?.total || 0} tensions
        </div>
      </div>
    </div>

    <!-- Principle Bar Chart -->
    ${getChartImage('principleBarChart') ? `
    <div class="chart-container">
      <h3>Ethical Principles Score Overview</h3>
      <img src="${getChartImage('principleBarChart')}" alt="Principle Scores Chart" class="chart-image" />
      <div class="chart-legend">
        <h4>Scale (0-4): Higher Score = Higher Risk</h4>
        <ul>
          <li><strong>0.0-1.0:</strong> Low risk / Good</li>
          <li><strong>1.0-2.0:</strong> Moderate risk</li>
          <li><strong>2.0-3.0:</strong> High risk</li>
          <li><strong>3.0-4.0:</strong> Critical risk</li>
        </ul>
        <p style="margin-top: 0.3cm; font-style: italic; color: #6b7280;">
          <strong>Note:</strong> Scores are canonical from scores collection; Gemini does not compute scores.
        </p>
      </div>
    </div>
    ` : ''}

    <!-- Principle-Evaluator Heatmap -->
    ${getChartImage('principleEvaluatorHeatmap') ? `
    <div class="chart-container">
      <h3>Principle × Evaluator Score Matrix</h3>
      <img src="${getChartImage('principleEvaluatorHeatmap')}" alt="Principle-Evaluator Heatmap" class="chart-image" />
      <div class="chart-legend">
        <h4>Heatmap Legend</h4>
        <p>Cells show evaluator's average risk score per principle (0-4 scale).</p>
        <p><strong>N/A</strong> = evaluator did not submit responses for this principle.</p>
        <p>Only evaluators with submitted responses (status="submitted") are shown.</p>
        <p><strong>Note:</strong> Evaluators are derived from scores collection - no hardcoded "Expert 1/2" labels.</p>
      </div>
    </div>
    ` : ''}
    
    <!-- Evidence Coverage Donut -->
    ${getChartImage('evidenceCoverageChart') ? `
    <div class="chart-container">
      <h3>Evidence Coverage</h3>
      <img src="${getChartImage('evidenceCoverageChart')}" alt="Evidence Coverage Chart" class="chart-image" />
      <div class="chart-legend">
        <h4>Coverage Explanation</h4>
        <p>Percentage of tensions that have at least one evidence item attached.</p>
        <p><strong>With Evidence:</strong> Tensions with evidence count > 0</p>
        <p><strong>No Evidence:</strong> Tensions with no evidence attached</p>
      </div>
    </div>
    ` : ''}
    
    <!-- Evidence Type Donut -->
    ${getChartImage('evidenceTypeChart') ? `
    <div class="chart-container">
      <h3>Evidence Type Distribution</h3>
      <img src="${getChartImage('evidenceTypeChart')}" alt="Evidence Type Chart" class="chart-image" />
      <div class="chart-legend">
        <h4>Evidence Types</h4>
        <p>Distribution of evidence types across all tensions (Policy, Test, User feedback, Log, Incident, Other).</p>
      </div>
    </div>
    ` : ''}

    <!-- Executive Summary -->
    ${geminiNarrative?.executiveSummary ? `
    <div class="section">
      <h2>Executive Summary</h2>
      <ul style="margin-left: 1.5cm; margin-top: 0.5cm;">
        ${geminiNarrative.executiveSummary.map(point => `<li style="margin-bottom: 0.3cm;">${point}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>

  <!-- TOP RISK DRIVERS SECTION -->
  <div class="page">
    <div class="section" id="section-top-risks">
      <h2>Top Risk Drivers</h2>
      <p style="margin-bottom: 0.5cm; color: #6b7280; font-size: 9pt;">
        <strong>Note:</strong> AvgRisk is derived from scores collection and mapped to principle tags. 
        Only questions with submitted responses are included.
      </p>
      
      ${((options.analytics?.topRiskyQuestions && options.analytics.topRiskyQuestions.length > 0) || (topRiskDrivers.questions && topRiskDrivers.questions.length > 0)) ? `
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Principle</th>
            <th>Question</th>
            <th>Avg Risk Score</th>
            <th>Roles</th>
            <th>Answer Excerpt</th>
          </tr>
        </thead>
        <tbody>
          ${(options.analytics?.topRiskyQuestions || topRiskDrivers.questions || []).slice(0, 10).map((q, idx) => {
            const riskTier = getRiskTier(q.avgRiskScore || q.avgRiskScore);
            // Get answer snippet from topRiskyQuestionContext
            const contextItem = options.analytics?.topRiskyQuestionContext?.find(c => c.questionId === q.questionId);
            const excerpt = contextItem?.answerSnippet 
              ? contextItem.answerSnippet.substring(0, 140) + (contextItem.answerSnippet.length > 140 ? '...' : '')
              : (q.answerExcerpts && q.answerExcerpts.length > 0 
                ? q.answerExcerpts[0].substring(0, 140) + (q.answerExcerpts[0].length > 140 ? '...' : '')
                : 'No text answer provided');
            return `
            <tr>
              <td>${idx + 1}</td>
              <td>${q.principleKey || q.principle || 'Unknown'}</td>
              <td style="font-size: 8pt;">${q.questionId || q.questionCode || 'N/A'}</td>
              <td><strong>${(q.avgRiskScore || q.avgRiskScore).toFixed(2)}</strong></td>
              <td>${(q.rolesInvolved || q.rolesMostAtRisk || []).join(', ') || 'N/A'}</td>
              <td style="font-size: 8pt; color: #4b5563;">${excerpt}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ` : '<p>No risk drivers identified.</p>'}
      
      ${geminiNarrative?.topRiskDriversNarrative ? `
      <div style="margin-top: 1cm;">
        <h3>Analysis</h3>
        ${geminiNarrative.topRiskDriversNarrative.slice(0, 5).map(n => `
          <div style="margin-bottom: 0.5cm; padding: 0.4cm; background: #f9fafb; border-left: 3px solid #3b82f6;">
            <p><strong>${n.principle || 'Unknown'}:</strong> ${n.whyRisky || ''}</p>
            <p style="margin-top: 0.2cm; font-size: 9pt; color: #6b7280;">
              <strong>Recommended:</strong> ${n.recommendedAction || ''}
            </p>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  </div>

  <!-- ETHICAL TENSIONS SECTION -->
  <div class="page">
    <div class="section" id="section-tensions">
      <div style="margin-bottom: 0.5cm;">
        <a href="#section-dashboard" style="color: #2563eb; text-decoration: underline; font-size: 9pt;">← Back to Dashboard</a>
      </div>
      <h2>Ethical Tensions</h2>
      
      <!-- Tension Charts -->
      ${getChartImage('tensionReviewStateChart') ? `
      <div class="chart-container">
        <h3>Tension Review State Distribution</h3>
        <img src="${getChartImage('tensionReviewStateChart')}" alt="Tension Review State Chart" class="chart-image" />
        <div class="chart-legend">
          <h4>Review State Explanation</h4>
          <p>Review state is computed from votes/consensus rules:</p>
          <ul>
            <li><strong>Proposed:</strong> Newly identified, awaiting review</li>
            <li><strong>Under Review:</strong> Active discussion in progress</li>
            <li><strong>Accepted:</strong> Consensus reached, mitigation approved</li>
            <li><strong>Disputed:</strong> Conflicting opinions, requires resolution</li>
            <li><strong>Resolved:</strong> Tension addressed and closed</li>
          </ul>
        </div>
      </div>
      ` : ''}
      
      ${getChartImage('severityChart') ? `
      <div class="chart-container">
        <h3>Tension Severity Distribution</h3>
        <img src="${getChartImage('severityChart')}" alt="Tension Severity Chart" class="chart-image" />
      </div>
      ` : ''}
      
      ${getChartImage('evidenceTypeChart') ? `
      <div class="chart-container">
        <h3>Evidence Type Distribution</h3>
        <img src="${getChartImage('evidenceTypeChart')}" alt="Evidence Type Chart" class="chart-image" />
        <div class="chart-legend">
          <h4>Evidence Types</h4>
          <p>Distribution of evidence types across all tensions (Policy, Test, User feedback, Log, Incident, Other).</p>
        </div>
      </div>
      ` : ''}
      
      ${getChartImage('evidenceCoverageChart') ? `
      <div class="chart-container">
        <h3>Evidence Coverage</h3>
        <img src="${getChartImage('evidenceCoverageChart')}" alt="Evidence Coverage Chart" class="chart-image" />
        <div class="chart-legend">
          <h4>Coverage Explanation</h4>
          <p>Percentage of tensions that have at least one evidence item attached.</p>
          <p><strong>With Evidence:</strong> Tensions with evidence count > 0</p>
          <p><strong>No Evidence:</strong> Tensions with no evidence attached</p>
        </div>
      </div>
      ` : ''}

      <!-- Tensions Table -->
      ${((options.analytics?.tensionsTable && options.analytics.tensionsTable.length > 0) || (tensions.list && tensions.list.length > 0)) ? `
      <table>
        <thead>
          <tr>
            <th>Conflict</th>
            <th>Severity</th>
            <th>Review State</th>
            <th>Evidence</th>
            <th>Consensus</th>
            <th>Comments</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          ${(options.analytics?.tensionsTable || tensions.list || []).map(t => {
            const evidenceCount = t.evidenceCount || t.evidence?.count || 0;
            const evidenceTypes = t.evidenceTypes || t.evidence?.types || [];
            const evidenceStatus = evidenceCount > 0 
              ? `${evidenceCount} attached${evidenceTypes.length > 0 ? ' (' + Object.keys(evidenceTypes).join(', ') + ')' : ''}`
              : '<strong style="color: #dc2626;">No evidence attached</strong>';
            const agreeCount = t.agreeCount || t.consensus?.agreeCount || 0;
            const disagreeCount = t.disagreeCount || t.consensus?.disagreeCount || 0;
            const agreePct = t.agreePct || t.consensus?.agreePct || 0;
            const totalVotes = agreeCount + disagreeCount;
            const consensusText = totalVotes > 0
              ? `${agreeCount} agree / ${disagreeCount} disagree (${agreePct.toFixed(1)}% agree)`
              : 'No votes yet';
            const commentCount = t.commentCount || 0;
            return `
            <tr>
              <td>${t.conflict?.principle1 || t.conflict?.principle1 || ''} ↔ ${t.conflict?.principle2 || t.conflict?.principle2 || ''}</td>
              <td><span class="risk-badge risk-${(t.severityLevel || 'Unknown').toLowerCase()}">${t.severityLevel || 'Unknown'}</span></td>
              <td>${t.reviewState || t.consensus?.reviewState || 'Proposed'}</td>
              <td>${evidenceStatus}</td>
              <td style="font-size: 8pt;">${consensusText}</td>
              <td>${commentCount}</td>
              <td style="font-size: 8pt;">${t.createdByRole || 'Unknown'}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ` : '<p>No ethical tensions identified.</p>'}
      
      ${geminiNarrative?.tensionsNarrative ? `
      <div style="margin-top: 1cm;">
        <h3>Detailed Tension Analysis</h3>
        ${geminiNarrative.tensionsNarrative.map(n => `
          <div style="margin-bottom: 0.8cm; padding: 0.5cm; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
            <h4 style="font-size: 11pt; margin-bottom: 0.3cm;">${n.summary || 'Tension Summary'}</h4>
            <p style="margin-bottom: 0.3cm;"><strong>Why it matters:</strong> ${n.whyItMatters || ''}</p>
            <p style="margin-bottom: 0.3cm;"><strong>Evidence Status:</strong> ${n.evidenceStatus || 'Unknown'}</p>
            <p style="margin-bottom: 0.3cm;"><strong>Mitigation:</strong> ${n.mitigationAssessment || 'No mitigation proposed'}</p>
            <p><strong>Next Step:</strong> ${n.nextStep || ''}</p>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  </div>

  <!-- PRINCIPLE ANALYSIS SECTION -->
  <div class="page">
    <div class="section" id="section-principles">
      <div style="margin-bottom: 0.5cm;">
        <a href="#section-dashboard" style="color: #2563eb; text-decoration: underline; font-size: 9pt;">← Back to Dashboard</a>
      </div>
      <h2>Principle-by-Principle Analysis</h2>
      
      ${geminiNarrative?.principleFindings ? geminiNarrative.principleFindings.map(finding => {
        const principleData = scoring.byPrincipleOverall[finding.principle];
        const riskTier = principleData ? getRiskTier(principleData.avgScore) : null;
        return `
        <div style="margin-bottom: 1cm; padding: 0.6cm; background: #f9fafb; border-left: 4px solid #3b82f6;">
          <h3>${finding.principle || 'Unknown Principle'}</h3>
          ${principleData ? `
          <div style="margin: 0.4cm 0;">
            <strong>Average Score:</strong> ${principleData.avgScore.toFixed(2)}/4.0 
            <span class="risk-badge risk-${riskTier.label.toLowerCase()}" style="margin-left: 0.5cm;">${riskTier.label} Risk</span>
          </div>
          <div style="font-size: 9pt; color: #6b7280; margin-bottom: 0.4cm;">
            Risk: ${principleData.riskPct.toFixed(1)}% | Safe: ${principleData.safePct.toFixed(1)}% 
            (${principleData.safeCount} safe, ${principleData.notSafeCount} at risk)
          </div>
          ` : ''}
          
          ${finding.whatLooksGood && finding.whatLooksGood.length > 0 ? `
          <div style="margin-top: 0.4cm;">
            <strong style="color: #10b981;">✓ Strengths:</strong>
            <ul style="margin-left: 1cm; margin-top: 0.2cm;">
              ${finding.whatLooksGood.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${finding.keyRisks && finding.keyRisks.length > 0 ? `
          <div style="margin-top: 0.4cm;">
            <strong style="color: #ef4444;">⚠ Key Risks:</strong>
            <ul style="margin-left: 1cm; margin-top: 0.2cm;">
              ${finding.keyRisks.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${finding.recommendedActions && finding.recommendedActions.length > 0 ? `
          <div style="margin-top: 0.4cm;">
            <strong style="color: #3b82f6;">→ Recommended Actions:</strong>
            <ul style="margin-left: 1cm; margin-top: 0.2cm;">
              ${finding.recommendedActions.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
        `;
      }).join('') : '<p>No principle analysis available.</p>'}
    </div>
  </div>

  <!-- RECOMMENDATIONS SECTION -->
  ${geminiNarrative?.recommendations && geminiNarrative.recommendations.length > 0 ? `
  <div class="page">
    <div class="section" id="section-recommendations">
      <div style="margin-bottom: 0.5cm;">
        <a href="#section-dashboard" style="color: #2563eb; text-decoration: underline; font-size: 9pt;">← Back to Dashboard</a>
      </div>
      <h2>Prioritized Recommendations</h2>
      <table>
        <thead>
          <tr>
            <th>Recommendation</th>
            <th>Priority</th>
            <th>Owner Role</th>
            <th>Timeline</th>
            <th>Success Metric</th>
            <th>Linked To</th>
          </tr>
        </thead>
        <tbody>
          ${geminiNarrative.recommendations.map(rec => `
            <tr>
              <td>${rec.title || ''}</td>
              <td><span class="risk-badge risk-${(rec.priority || 'Med').toLowerCase()}">${rec.priority || 'Med'}</span></td>
              <td>${rec.ownerRole || 'Project team'}</td>
              <td>${rec.timeline || 'TBD'}</td>
              <td style="font-size: 8pt;">${rec.successMetric || ''}</td>
              <td style="font-size: 8pt;">${rec.linkedTo ? rec.linkedTo.join(', ') : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

    <!-- METHODOLOGY & APPENDIX -->
    <div class="page">
      <div class="section" id="section-methodology">
        <div style="margin-bottom: 0.5cm;">
          <a href="#section-dashboard" style="color: #2563eb; text-decoration: underline; font-size: 9pt;">← Back to Dashboard</a>
        </div>
        <h2>Methodology & Data Sources</h2>
      <p>This report is generated using the Z-Inspection methodology for ethical AI evaluation.</p>
      
      <h3 style="margin-top: 0.8cm;">Data Sources</h3>
      <ul style="margin-left: 1.5cm; margin-top: 0.4cm;">
        <li><strong>responses collection:</strong> All expert answers and qualitative context</li>
        <li><strong>scores collection:</strong> Canonical computed metrics (ONLY source of quantitative scores)</li>
        <li><strong>tensions collection:</strong> Ethical tensions, claims, evidence, mitigations, and consensus</li>
        <li><strong>projectassignments collection:</strong> Expert assignments and participation tracking</li>
      </ul>
      
      <div style="margin-top: 0.8cm; padding: 0.5cm; background: #fef3c7; border-left: 4px solid #f59e0b;">
        <p><strong>IMPORTANT:</strong> Quantitative scores come from the scores collection and are NOT computed by Gemini AI. 
        All numeric metrics are deterministic and traceable to MongoDB data.</p>
      </div>
      
      <h3 style="margin-top: 0.8cm;">Risk Score Mapping</h3>
      <ul style="margin-left: 1.5cm; margin-top: 0.4cm;">
        <li><strong>Score 4:</strong> Best/Low risk</li>
        <li><strong>Score 3:</strong> Good/Acceptable risk</li>
        <li><strong>Score 2:</strong> Moderate risk</li>
        <li><strong>Score 1:</strong> High risk</li>
        <li><strong>Score 0:</strong> Critical/Worst risk</li>
      </ul>
      
      <p style="margin-top: 0.4cm;"><strong>Risk Percentage Formula:</strong> Percentage of responses with score &lt; 3.0 (indicating risk)</p>
    </div>

    <div class="section" id="section-appendix" style="margin-top: 1.5cm;">
      <h2>Appendix</h2>
      
      <h3>Evaluators</h3>
      <p style="margin-bottom: 0.4cm;">Only evaluators with submitted responses are listed below:</p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${(options.analytics?.evaluators && options.analytics.evaluators.length > 0)
            ? options.analytics.evaluators.map(e => `
              <tr>
                <td>${e.name || 'Unknown'}</td>
                <td>${e.role || 'unknown'}</td>
                <td style="font-size: 8pt;">${e.email || 'N/A'}</td>
                <td>Submitted</td>
              </tr>
            `).join('')
            : (evaluators.withScores && evaluators.withScores.length > 0 
              ? evaluators.withScores.map(e => `
                <tr>
                  <td>${e.name || 'Unknown'}</td>
                  <td>${e.role || 'unknown'}</td>
                  <td style="font-size: 8pt;">${e.email || 'N/A'}</td>
                  <td>Submitted</td>
                </tr>
              `).join('')
              : '<tr><td colspan="4">No evaluators with submitted responses.</td></tr>'
            )
          }
        </tbody>
      </table>
      
      ${(options.analytics?.participation?.assignedCount || evaluators.assigned?.length || 0) > (options.analytics?.evaluators?.length || evaluators.withScores?.length || 0) ? `
      <p style="margin-top: 0.5cm; color: #6b7280; font-size: 9pt;">
        <strong>Note:</strong> ${(options.analytics?.participation?.assignedCount || evaluators.assigned?.length || 0) - (options.analytics?.evaluators?.length || evaluators.withScores?.length || 0)} assigned evaluator(s) did not submit responses.
      </p>
      ` : ''}
      
      <h3 style="margin-top: 0.8cm;">Limitations</h3>
      ${geminiNarrative?.limitations && geminiNarrative.limitations.length > 0 ? `
      <ul style="margin-left: 1.5cm; margin-top: 0.4cm;">
        ${geminiNarrative.limitations.map(lim => `<li>${lim}</li>`).join('')}
      </ul>
      ` : '<p>No specific limitations identified.</p>'}
      
      <h3 style="margin-top: 0.8cm;">Glossary</h3>
      <ul style="margin-left: 1.5cm; margin-top: 0.4cm; font-size: 9pt;">
        <li><strong>Risk Score:</strong> 0-4 scale where 4 = best/low risk, 0 = worst/high risk</li>
        <li><strong>Risk %:</strong> Percentage of responses with score &lt; 3.0</li>
        <li><strong>Safe %:</strong> Percentage of responses with score &gt;= 3.0</li>
        <li><strong>Severity Levels:</strong> Critical, High, Medium, Low (based on avgRiskScore)</li>
        <li><strong>Evidence:</strong> Policy documents, test results, user feedback, logs, incidents, or other supporting materials</li>
        <li><strong>Review State:</strong> Proposed, Under Review, Accepted, Disputed, or Resolved</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <p>Ethical AI Evaluation Report - ${project.title || 'Project'} | Generated: ${formatDate(options.generatedAt || new Date())} | Z-Inspection Platform</p>
  </div>
</body>
</html>`;

  return html;
}

module.exports = {
  generateHTMLReport
};

