const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun,
  Media
} = require("docx");

/**
 * Generate professional DOCX report from reportMetrics and geminiNarrative
 * This creates a structured, verifiable report with tables, charts, and proper formatting
 */
async function generateProfessionalDOCX(reportMetrics, geminiNarrative, generatedAt = new Date(), chartBuffers = null) {
  const children = [];
  
  // Helper to add chart image to document
  const addChartImage = async (chartBuffer, title, width = 500, height = 300) => {
    if (!chartBuffer) return;
    
    try {
      // Create image run from buffer (docx library format)
      const imageRun = new ImageRun({
        data: chartBuffer,
        transformation: {
          width: width * 9525, // Convert to EMU (1/914400 inch)
          height: height * 9525
        }
      });
      
      children.push(createParagraph(''));
      if (title) {
        children.push(createParagraph(title, { bold: true }));
      }
      children.push(new Paragraph({
        children: [imageRun],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 }
      }));
    } catch (error) {
      console.warn(`Failed to add chart image: ${error.message}`);
      // Continue without chart - add placeholder text
      if (title) {
        children.push(createParagraph(`[Chart: ${title} - Image generation failed]`, { italics: true }));
      }
    }
  };

  // Helper to create a paragraph with text runs
  const createParagraph = (text, options = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      spacing: { after: options.spacingAfter || 120 },
      ...options
    });
  };

  // Helper to create a heading
  const createHeading = (text, level = 1) => {
    const headingLevel = level === 1 ? HeadingLevel.HEADING_1 :
                        level === 2 ? HeadingLevel.HEADING_2 :
                        HeadingLevel.HEADING_3;
    return new Paragraph({
      heading: headingLevel,
      children: [new TextRun({ text, bold: true })],
      spacing: { before: level === 1 ? 0 : 200, after: 120 }
    });
  };

  // ============================================================
  // 1) COVER PAGE
  // ============================================================
  children.push(createHeading(reportMetrics.project.title || 'Ethical AI Evaluation Report', 1));
  children.push(createParagraph(''));
  children.push(createParagraph(`Category: ${reportMetrics.project.category || 'Not provided'}`));
  children.push(createParagraph(`Questionnaire: ${reportMetrics.project.questionnaireKey || 'general-v1'}`));
  children.push(createParagraph(`Version: ${reportMetrics.project.questionnaireVersion || 1}`));
  children.push(createParagraph(`Generated on: ${generatedAt.toISOString().split('T')[0]}`));
  children.push(createParagraph(''));

  // ============================================================
  // 2) METHODOLOGY & DATA SOURCES
  // ============================================================
  children.push(createHeading('Methodology & Data Sources', 1));
  children.push(createParagraph('This report is generated using the Z-Inspection methodology for ethical AI evaluation.'));
  children.push(createParagraph(''));
  children.push(createParagraph('Data Sources:', { bold: true }));
  children.push(createParagraph('• responses collection: All expert answers and qualitative context'));
  children.push(createParagraph('• scores collection: Canonical computed metrics (ONLY source of quantitative scores)'));
  children.push(createParagraph('• tensions collection: Ethical tensions, claims, evidence, mitigations, and consensus'));
  children.push(createParagraph('• projectassignments collection: Expert assignments and participation tracking'));
  children.push(createParagraph(''));
  children.push(createParagraph('IMPORTANT: Quantitative scores come from the scores collection and are NOT computed by Gemini AI. All numeric metrics are deterministic and traceable to MongoDB data.', { italics: true }));

  // Risk mapping explanation
  children.push(createParagraph(''));
  children.push(createParagraph('Risk Score Mapping:', { bold: true }));
  children.push(createParagraph('• Score 4 = Best/Low risk'));
  children.push(createParagraph('• Score 3 = Good/Acceptable risk'));
  children.push(createParagraph('• Score 2 = Moderate risk'));
  children.push(createParagraph('• Score 1 = High risk'));
  children.push(createParagraph('• Score 0 = Critical/Worst risk'));
  children.push(createParagraph(''));
  children.push(createParagraph('Risk Percentage Formula: Percentage of responses with score < 3.0 (indicating risk)'));
  children.push(createParagraph(''));

  // ============================================================
  // 3) EVALUATION COVERAGE (Team Progress)
  // ============================================================
  children.push(createHeading('Evaluation Coverage', 1));
  children.push(createParagraph(`Assigned Experts: ${reportMetrics.coverage.assignedExpertsCount}`));
  children.push(createParagraph(`Experts Started: ${reportMetrics.coverage.expertsStartedCount}`));
  children.push(createParagraph(`Experts Submitted: ${reportMetrics.coverage.expertsSubmittedCount}`));
  children.push(createParagraph(''));

  // Add team completion donut chart
  if (chartBuffers && chartBuffers.teamCompletionDonut) {
    await addChartImage(
      chartBuffers.teamCompletionDonut,
      'Team Completion Status',
      500,
      500
    );
  }

  // Role breakdown table
  if (Object.keys(reportMetrics.coverage.roles).length > 0) {
    children.push(createParagraph('Role Breakdown:', { bold: true }));
    
    const roleTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [createParagraph('Role', { bold: true })] }),
          new TableCell({ children: [createParagraph('Assigned', { bold: true })] }),
          new TableCell({ children: [createParagraph('Started', { bold: true })] }),
          new TableCell({ children: [createParagraph('Submitted', { bold: true })] })
        ]
      })
    ];

    Object.entries(reportMetrics.coverage.roles).forEach(([role, stats]) => {
      roleTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [createParagraph(role)] }),
            new TableCell({ children: [createParagraph(String(stats.assigned || 0))] }),
            new TableCell({ children: [createParagraph(String(stats.started || 0))] }),
            new TableCell({ children: [createParagraph(String(stats.submitted || 0))] })
          ]
        })
      );
    });

    children.push(
      new Table({
        rows: roleTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    );
    children.push(createParagraph(''));
  }

  children.push(createParagraph(`Core 12 Questions Started: ${reportMetrics.coverage.core12Completion.startedPct.toFixed(1)}%`));
  children.push(createParagraph(`Core 12 Questions Submitted: ${reportMetrics.coverage.core12Completion.submittedPct.toFixed(1)}%`));
  children.push(createParagraph(''));

  // ============================================================
  // 4) EXECUTIVE SUMMARY
  // ============================================================
  children.push(createHeading('Executive Summary', 1));
  
  if (geminiNarrative && Array.isArray(geminiNarrative.executiveSummary)) {
    geminiNarrative.executiveSummary.forEach(point => {
      children.push(createParagraph(`• ${point}`));
    });
  } else {
    // Fallback: generate from metrics
    const overallAvg = reportMetrics.scoring.totalsOverall?.avg || 0;
    const riskLevel = overallAvg >= 3.0 ? 'Low' : overallAvg >= 2.0 ? 'Medium' : 'High';
    children.push(createParagraph(`• Overall ethical risk level: ${riskLevel} (Average score: ${overallAvg.toFixed(2)}/4.0)`));
    children.push(createParagraph(`• ${reportMetrics.coverage.expertsSubmittedCount} of ${reportMetrics.coverage.assignedExpertsCount} assigned experts completed evaluations`));
    children.push(createParagraph(`• ${reportMetrics.tensions.summary.total} ethical tensions identified`));
  }

  children.push(createParagraph(''));

  // ============================================================
  // 5) ETHICS PRINCIPLES DASHBOARD
  // ============================================================
  children.push(createHeading('Ethics Principles Dashboard', 1));

  const principleTableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [createParagraph('Principle', { bold: true })] }),
        new TableCell({ children: [createParagraph('Avg Score', { bold: true })] }),
        new TableCell({ children: [createParagraph('Risk %', { bold: true })] }),
        new TableCell({ children: [createParagraph('Safe %', { bold: true })] }),
        new TableCell({ children: [createParagraph('Safe/Not Safe', { bold: true })] }),
        new TableCell({ children: [createParagraph('Notes', { bold: true })] })
      ]
    })
  ];

  const principles = [
    'TRANSPARENCY',
    'HUMAN AGENCY & OVERSIGHT',
    'TECHNICAL ROBUSTNESS & SAFETY',
    'PRIVACY & DATA GOVERNANCE',
    'DIVERSITY, NON-DISCRIMINATION & FAIRNESS',
    'SOCIETAL & INTERPERSONAL WELL-BEING',
    'ACCOUNTABILITY'
  ];

  principles.forEach(principle => {
    const principleData = reportMetrics.scoring.byPrincipleOverall[principle];
    if (principleData) {
      const notes = [];
      if (geminiNarrative && Array.isArray(geminiNarrative.principleFindings)) {
        const finding = geminiNarrative.principleFindings.find(f => f.principle === principle);
        if (finding && finding.keyRisks && finding.keyRisks.length > 0) {
          notes.push(finding.keyRisks[0]);
        }
      }

      principleTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [createParagraph(principle)] }),
            new TableCell({ children: [createParagraph(principleData.avgScore.toFixed(2))] }),
            new TableCell({ children: [createParagraph(`${principleData.riskPct.toFixed(1)}%`)] }),
            new TableCell({ children: [createParagraph(`${principleData.safePct.toFixed(1)}%`)] }),
            new TableCell({ children: [createParagraph(`${principleData.safeCount}/${principleData.notSafeCount}`)] }),
            new TableCell({ children: [createParagraph(notes[0] || '')] })
          ]
        })
      );
    }
  });

  children.push(
    new Table({
      rows: principleTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  );
  children.push(createParagraph(''));

  // Add principle bar chart
  if (chartBuffers && chartBuffers.principleBarChart) {
    await addChartImage(
      chartBuffers.principleBarChart,
      'Ethical Principles Score Overview',
      700,
      400
    );
  }

  // ============================================================
  // 5.1) PRINCIPLE-BY-PRINCIPLE TABLE (Dynamic Evaluator Columns)
  // ============================================================
  if (reportMetrics.scoring.byPrincipleTable && Object.keys(reportMetrics.scoring.byPrincipleTable).length > 0) {
    children.push(createHeading('Principle-by-Principle Scores (Per Evaluator)', 2));
    children.push(createParagraph('This table shows individual evaluator scores for each principle. Columns are dynamically generated based on actual evaluators who submitted responses.', { italics: true }));
    children.push(createParagraph(''));

    // Get all unique evaluators across all principles
    const allEvaluators = new Set();
    Object.values(reportMetrics.scoring.byPrincipleTable).forEach(principleData => {
      principleData.evaluators.forEach(e => {
        allEvaluators.add(`${e.userId}_${e.name}_${e.role}`);
      });
    });

    const evaluatorList = Array.from(allEvaluators).map(key => {
      const [userId, name, role] = key.split('_');
      return { userId, name, role };
    });

    // Build table header
    const dynamicTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [createParagraph('Principle', { bold: true })] }),
          ...evaluatorList.map(e => 
            new TableCell({ children: [createParagraph(`${e.name}\n(${e.role})`, { bold: true })] })
          ),
          new TableCell({ children: [createParagraph('Range\n(Min-Max)', { bold: true })] }),
          new TableCell({ children: [createParagraph('Average', { bold: true })] })
        ]
      })
    ];

    // Build table rows for each principle
    Object.entries(reportMetrics.scoring.byPrincipleTable).forEach(([principle, principleData]) => {
      const rowCells = [
        new TableCell({ children: [createParagraph(principle)] })
      ];

      // Add evaluator scores (or N/A if they don't have a score for this principle)
      evaluatorList.forEach(evaluator => {
        const evaluatorScore = principleData.evaluators.find(e => e.userId === evaluator.userId);
        const scoreText = evaluatorScore 
          ? evaluatorScore.score.toFixed(2)
          : 'N/A';
        rowCells.push(
          new TableCell({ children: [createParagraph(scoreText)] })
        );
      });

      // Add range and average
      rowCells.push(
        new TableCell({ children: [createParagraph(`${principleData.range.min.toFixed(2)} - ${principleData.range.max.toFixed(2)}`)] }),
        new TableCell({ children: [createParagraph(principleData.average.toFixed(2))] })
      );

      dynamicTableRows.push(new TableRow({ children: rowCells }));
    });

    children.push(
      new Table({
        rows: dynamicTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    );
    children.push(createParagraph(''));
  }

  // Add principle-evaluator heatmap chart
  if (chartBuffers && chartBuffers.principleEvaluatorHeatmap) {
    await addChartImage(
      chartBuffers.principleEvaluatorHeatmap,
      'Principle-by-Principle Scores: Evaluator Matrix',
      900,
      500
    );
  }

  // ============================================================
  // 6) TOP RISK DRIVERS (Question-level)
  // ============================================================
  children.push(createHeading('Top Risk Drivers', 1));

  if (reportMetrics.topRiskDrivers.questions.length > 0) {
    const riskTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [createParagraph('Question ID', { bold: true })] }),
          new TableCell({ children: [createParagraph('Principle', { bold: true })] }),
          new TableCell({ children: [createParagraph('Avg Risk Score', { bold: true })] }),
          new TableCell({ children: [createParagraph('Role(s)', { bold: true })] }),
          new TableCell({ children: [createParagraph('Answer Excerpt', { bold: true })] })
        ]
      })
    ];

    reportMetrics.topRiskDrivers.questions.slice(0, 10).forEach(q => {
      const excerpt = q.answerExcerpts && q.answerExcerpts.length > 0 
        ? q.answerExcerpts[0].substring(0, 100) + '...'
        : 'No text answer provided';
      
      riskTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [createParagraph(q.questionCode || q.questionId)] }),
            new TableCell({ children: [createParagraph(q.principle)] }),
            new TableCell({ children: [createParagraph(q.avgRiskScore.toFixed(2))] }),
            new TableCell({ children: [createParagraph(q.rolesMostAtRisk.join(', ') || 'N/A')] }),
            new TableCell({ children: [createParagraph(excerpt)] })
          ]
        })
      );
    });

    children.push(
      new Table({
        rows: riskTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    );
    children.push(createParagraph(''));

    // Narrative from Gemini
    if (geminiNarrative && Array.isArray(geminiNarrative.topRiskDriversNarrative)) {
      children.push(createParagraph('Analysis:', { bold: true }));
      geminiNarrative.topRiskDriversNarrative.slice(0, 3).forEach(narrative => {
        children.push(createParagraph(`• ${narrative.whyRisky}`));
        children.push(createParagraph(`  Recommended: ${narrative.recommendedAction}`));
      });
      children.push(createParagraph(''));
    }
  } else {
    children.push(createParagraph('No risk drivers identified.'));
    children.push(createParagraph(''));
  }

  // ============================================================
  // 7) ETHICAL TENSIONS (Z-Inspection style)
  // ============================================================
  children.push(createHeading('Ethical Tensions', 1));

  // Add tension visualizations
  if (chartBuffers) {
    if (chartBuffers.tensionReviewStateChart) {
      await addChartImage(
        chartBuffers.tensionReviewStateChart,
        'Tension Review State Distribution',
        500,
        500
      );
    }
    
    if (chartBuffers.severityChart) {
      await addChartImage(
        chartBuffers.severityChart,
        'Tension Severity Distribution',
        500,
        400
      );
    }
    
    if (chartBuffers.evidenceTypeChart) {
      await addChartImage(
        chartBuffers.evidenceTypeChart,
        'Evidence Type Distribution',
        600,
        400
      );
    }
  }

  if (reportMetrics.tensions.list.length > 0) {
    reportMetrics.tensions.list.forEach((tension, idx) => {
      const header = `Conflict: ${tension.conflict.principle1} ↔ ${tension.conflict.principle2} | Severity: ${tension.severityLevel} | Review State: ${tension.consensus.reviewState}`;
      children.push(createHeading(`Tension ${idx + 1}: ${header}`, 2));
      
      children.push(createParagraph('Claim:', { bold: true }));
      children.push(createParagraph(tension.claim || 'Not provided'));
      children.push(createParagraph(''));
      
      if (tension.argument) {
        children.push(createParagraph('Argument:', { bold: true }));
        children.push(createParagraph(tension.argument));
        children.push(createParagraph(''));
      }

      if (tension.impactArea.length > 0 || tension.affectedGroups.length > 0 || tension.impactDescription) {
        children.push(createParagraph('Impact:', { bold: true }));
        if (tension.impactArea.length > 0) {
          children.push(createParagraph(`Areas: ${tension.impactArea.join(', ')}`));
        }
        if (tension.affectedGroups.length > 0) {
          children.push(createParagraph(`Affected Groups: ${tension.affectedGroups.join(', ')}`));
        }
        if (tension.impactDescription) {
          children.push(createParagraph(`Description: ${tension.impactDescription}`));
        }
        children.push(createParagraph(''));
      }

      // Evidence section
      children.push(createParagraph('Evidence:', { bold: true }));
      children.push(createParagraph(`Evidence Count: ${tension.evidence.count}`));
      if (tension.evidence.count > 0) {
        children.push(createParagraph(`Evidence Types: ${tension.evidence.types.join(', ')}`));
        tension.evidence.items.forEach((item, i) => {
          children.push(createParagraph(`  ${i + 1}. [${item.evidenceType}] ${item.text.substring(0, 150)}${item.text.length > 150 ? '...' : ''}`));
          if (item.attachmentsCount > 0) {
            children.push(createParagraph(`     Attachments: ${item.attachmentsCount}`));
          }
        });
      } else {
        children.push(createParagraph('No evidence attached', { italics: true }));
      }
      children.push(createParagraph(''));

      // Mitigation
      children.push(createParagraph('Mitigation/Resolution:', { bold: true }));
      if (tension.mitigation.proposedMitigations) {
        children.push(createParagraph(`Proposed: ${tension.mitigation.proposedMitigations}`));
      }
      if (tension.mitigation.tradeOffDecision) {
        children.push(createParagraph(`Trade-off Decision: ${tension.mitigation.tradeOffDecision}`));
      }
      if (tension.mitigation.tradeOffRationale) {
        children.push(createParagraph(`Rationale: ${tension.mitigation.tradeOffRationale}`));
      }
      if (!tension.mitigation.proposedMitigations && !tension.mitigation.tradeOffDecision) {
        children.push(createParagraph('No mitigation proposed', { italics: true }));
      }
      children.push(createParagraph(''));

      // Consensus
      children.push(createParagraph('Consensus:', { bold: true }));
      children.push(createParagraph(`Votes: ${tension.consensus.agreeCount} agree, ${tension.consensus.disagreeCount} disagree`));
      children.push(createParagraph(`Participation: ${tension.consensus.votesTotal}/${tension.consensus.assignedExpertsCount} (${tension.consensus.participationPct.toFixed(1)}%)`));
      children.push(createParagraph(`Agree %: ${tension.consensus.agreePct.toFixed(1)}%`));
      children.push(createParagraph(''));

      // Next step from narrative
      if (geminiNarrative && Array.isArray(geminiNarrative.tensionsNarrative)) {
        const narrative = geminiNarrative.tensionsNarrative.find(n => n.tensionId === tension.tensionId);
        if (narrative && narrative.nextStep) {
          children.push(createParagraph('Next Step:', { bold: true }));
          children.push(createParagraph(narrative.nextStep));
          children.push(createParagraph(''));
        }
      }

      children.push(createParagraph('---'));
      children.push(createParagraph(''));
    });
  } else {
    children.push(createParagraph('No ethical tensions identified.'));
    children.push(createParagraph(''));
  }

  // ============================================================
  // 8) ACTION PLAN
  // ============================================================
  children.push(createHeading('Action Plan', 1));

  if (geminiNarrative && Array.isArray(geminiNarrative.recommendations) && geminiNarrative.recommendations.length > 0) {
    const actionTableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [createParagraph('Recommendation', { bold: true })] }),
          new TableCell({ children: [createParagraph('Priority', { bold: true })] }),
          new TableCell({ children: [createParagraph('Owner Role', { bold: true })] }),
          new TableCell({ children: [createParagraph('Timeline', { bold: true })] }),
          new TableCell({ children: [createParagraph('Success Metric', { bold: true })] }),
          new TableCell({ children: [createParagraph('Linked To', { bold: true })] })
        ]
      })
    ];

    geminiNarrative.recommendations.forEach(rec => {
      actionTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [createParagraph(rec.title || '')] }),
            new TableCell({ children: [createParagraph(rec.priority || '')] }),
            new TableCell({ children: [createParagraph(rec.ownerRole || '')] }),
            new TableCell({ children: [createParagraph(rec.timeline || '')] }),
            new TableCell({ children: [createParagraph(rec.successMetric || '')] }),
            new TableCell({ children: [createParagraph(rec.linkedTo ? rec.linkedTo.join(', ') : '')] })
          ]
        })
      );
    });

    children.push(
      new Table({
        rows: actionTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    );
  } else {
    children.push(createParagraph('No specific recommendations generated.'));
  }
  children.push(createParagraph(''));

  // ============================================================
  // 9) LIMITATIONS & ASSUMPTIONS
  // ============================================================
  children.push(createHeading('Limitations & Assumptions', 1));

  if (geminiNarrative && Array.isArray(geminiNarrative.limitations)) {
    geminiNarrative.limitations.forEach(limitation => {
      children.push(createParagraph(`• ${limitation}`));
    });
  } else {
    // Fallback limitations
    const tensionsWithoutEvidence = reportMetrics.tensions.list.filter(t => t.evidence.count === 0).length;
    if (tensionsWithoutEvidence > 0) {
      children.push(createParagraph(`• ${tensionsWithoutEvidence} tensions lack evidence attachments`));
    }
    if (reportMetrics.coverage.expertsSubmittedCount < reportMetrics.coverage.assignedExpertsCount) {
      children.push(createParagraph(`• Not all assigned experts have submitted evaluations (${reportMetrics.coverage.expertsSubmittedCount}/${reportMetrics.coverage.assignedExpertsCount})`));
    }
  }
  children.push(createParagraph(''));

  // ============================================================
  // 10) APPENDIX
  // ============================================================
  children.push(createHeading('Appendix', 1));

  children.push(createParagraph('Glossary:', { bold: true }));
  children.push(createParagraph('• Risk Score: 0-4 scale where 4 = best/low risk, 0 = worst/high risk'));
  children.push(createParagraph('• Risk %: Percentage of responses with score < 3.0'));
  children.push(createParagraph('• Safe %: Percentage of responses with score >= 3.0'));
  children.push(createParagraph('• Severity Levels: Critical, High, Medium, Low (based on avgRiskScore)'));
  children.push(createParagraph(''));

  children.push(createParagraph('Data Snapshot:', { bold: true }));
  children.push(createParagraph(`Report Generation Timestamp: ${generatedAt.toISOString()}`));
  children.push(createParagraph(`Questionnaire Key: ${reportMetrics.project.questionnaireKey}`));
  children.push(createParagraph(`Questionnaire Version: ${reportMetrics.project.questionnaireVersion}`));
  children.push(createParagraph(''));

  if (geminiNarrative && Array.isArray(geminiNarrative.appendixNotes)) {
    geminiNarrative.appendixNotes.forEach(note => {
      children.push(createParagraph(`• ${note}`));
    });
  }

  // ============================================================
  // BUILD DOCUMENT
  // ============================================================
  const doc = new Document({
    creator: "Z-Inspection Platform",
    title: reportMetrics.project.title || "Ethical AI Evaluation Report",
    sections: [
      {
        properties: {},
        children: children
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  generateProfessionalDOCX
};

