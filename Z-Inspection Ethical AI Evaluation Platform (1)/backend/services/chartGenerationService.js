const https = require('https');
const http = require('http');

/**
 * Chart Generation Service
 * Generates deterministic charts as PNG images for embedding in DOCX reports
 * Uses QuickChart API (free, no API key required)
 */

/**
 * Generate a bar chart for ethical principles with average scores
 * @param {Object} principleData - Object with principle names as keys and avgScore as values
 * @param {Object} options - Chart options (width, height, colors)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generatePrincipleBarChart(principleData, options = {}) {
  const width = options.width || 800;
  const height = options.height || 400;
  
  // Map principles to data arrays
  const principles = Object.keys(principleData);
  const avgScores = principles.map(p => principleData[p].avgScore || 0);
  const minScores = principles.map(p => principleData[p].min || 0);
  const maxScores = principles.map(p => principleData[p].max || 0);
  
  // Color mapping based on risk level (Higher score = Higher risk)
  // Score 0-1: Low risk (best) = green
  // Score 1-2: Moderate risk = amber
  // Score 2-3: High risk = red
  // Score 3-4: Critical risk (worst) = dark red
  const colors = principles.map(p => {
    const avg = principleData[p].avgScore || 0;
    if (avg <= 1.0) return '#10b981'; // emerald-500 (Low risk)
    if (avg <= 2.0) return '#f59e0b'; // amber-500 (Moderate risk)
    if (avg <= 3.0) return '#ef4444'; // red-500 (High risk)
    return '#dc2626'; // red-600 (Critical risk)
  });
  
  // Build chart config
  const chartConfig = {
    type: 'bar',
    data: {
      labels: principles.map(p => p.length > 20 ? p.substring(0, 20) + '...' : p),
      datasets: [
        {
          label: 'Average Score',
          data: avgScores,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('500', '600').replace('600', '700')),
          borderWidth: 2
        },
        {
          label: 'Min',
          data: minScores,
          type: 'line',
          borderColor: '#6b7280',
          borderWidth: 1,
          pointRadius: 3,
          fill: false
        },
        {
          label: 'Max',
          data: maxScores,
          type: 'line',
          borderColor: '#6b7280',
          borderWidth: 1,
          pointRadius: 3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Ethical Principles Score Overview (0-4 scale)',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 4,
          title: {
            display: true,
            text: 'Score (0 = Critical, 4 = Best)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Ethical Principles'
          }
        }
      }
    }
  };
  
  return generateChartImage(chartConfig, width, height);
}

/**
 * Generate a heatmap table image (Principle x Evaluator matrix)
 * @param {Object} byPrincipleTable - From reportMetrics.scoring.byPrincipleTable
 * @param {Array} evaluators - List of evaluators with userId, name, role
 * @param {Object} options - Chart options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generatePrincipleEvaluatorHeatmap(byPrincipleTable, evaluators, options = {}) {
  const width = options.width || 1000;
  const height = options.height || 600;
  
  if (!evaluators || evaluators.length === 0) {
    throw new Error('No evaluators provided for heatmap');
  }
  
  const principles = Object.keys(byPrincipleTable);
  const evaluatorIds = evaluators.map(e => e.userId || e._id?.toString() || e.toString());
  
  // Build data matrix: principles (rows) x evaluators (columns)
  const dataMatrix = principles.map(principle => {
    const principleData = byPrincipleTable[principle];
    if (!principleData || !principleData.evaluators) {
      return evaluatorIds.map(() => null);
    }
    return evaluatorIds.map(evaluatorId => {
      const evaluatorScore = principleData.evaluators.find(e => 
        (e.userId || e._id?.toString() || e.toString()) === evaluatorId
      );
      return evaluatorScore ? (evaluatorScore.score !== null && evaluatorScore.score !== undefined ? evaluatorScore.score : null) : null;
    });
  });
  
  // Build labels
  const principleLabels = principles.map(p => {
    const label = p.length > 25 ? p.substring(0, 25) + '...' : p;
    return label;
  });
  const evaluatorLabels = evaluators.map(e => {
    const name = e.name || 'Unknown';
    const role = e.role || 'unknown';
    return `${name} (${role})`;
  });
  
  // Color scale: 0-4 score mapped to colors
  const getColorForScore = (score) => {
    if (score === null) return '#f3f4f6'; // gray-100 for N/A
    if (score >= 3.0) return '#10b981'; // emerald-500
    if (score >= 2.0) return '#f59e0b'; // amber-500
    if (score >= 1.0) return '#ef4444'; // red-500
    return '#dc2626'; // red-600
  };
  
  // Build chart config for heatmap (using bar chart with custom colors)
  const datasets = evaluatorLabels.map((label, idx) => ({
    label: label,
    data: principles.map((_, pIdx) => dataMatrix[pIdx][idx]),
    backgroundColor: principles.map((_, pIdx) => {
      const score = dataMatrix[pIdx][idx];
      return getColorForScore(score);
    })
  }));
  
  const chartConfig = {
    type: 'bar',
    data: {
      labels: principleLabels,
      datasets: datasets.map((ds, idx) => ({
        label: evaluatorLabels[idx],
        data: ds.data,
        backgroundColor: ds.backgroundColor,
        borderColor: '#ffffff',
        borderWidth: 1
      }))
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Principle-by-Principle Scores: Evaluator Matrix',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'right'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 4,
          title: {
            display: true,
            text: 'Score (0-4)'
          }
        },
        x: {
          stacked: false,
          title: {
            display: true,
            text: 'Ethical Principles'
          }
        }
      }
    }
  };
  
  return generateChartImage(chartConfig, width, height);
}

/**
 * Generate a donut chart for team completion
 * @param {Object} coverage - From reportMetrics.coverage
 * @param {Object} options - Chart options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateTeamCompletionDonut(coverage, options = {}) {
  const width = options.width || 500;
  const height = options.height || 500;
  
  const assigned = coverage.assignedExpertsCount || 0;
  const submitted = coverage.expertsSubmittedCount || 0;
  const notSubmitted = assigned - submitted;
  
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: ['Submitted', 'Not Submitted'],
      datasets: [{
        data: [submitted, notSubmitted],
        backgroundColor: ['#10b981', '#e5e7eb'], // emerald-500, gray-200
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Team Completion: ${submitted}/${assigned} Experts`,
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  };
  
  return generateChartImage(chartConfig, width, height);
}

/**
 * Generate tension review state distribution pie chart
 * @param {Object} tensionsSummary - From reportMetrics.tensions.summary
 * @param {Object} options - Chart options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateTensionReviewStateChart(tensionsSummary, options = {}) {
  const width = options.width || 500;
  const height = options.height || 500;
  
  const chartConfig = {
    type: 'pie',
    data: {
      labels: ['Accepted', 'Under Review', 'Disputed', 'Resolved', 'Proposed'],
      datasets: [{
        data: [
          tensionsSummary.accepted || 0,
          tensionsSummary.underReview || 0,
          tensionsSummary.disputed || 0,
          tensionsSummary.resolved || 0,
          tensionsSummary.total - (tensionsSummary.accepted + tensionsSummary.underReview + tensionsSummary.disputed + tensionsSummary.resolved)
        ],
        backgroundColor: [
          '#10b981', // emerald-500 (Accepted)
          '#3b82f6', // blue-500 (Under Review)
          '#ef4444', // red-500 (Disputed)
          '#8b5cf6', // violet-500 (Resolved)
          '#f59e0b'  // amber-500 (Proposed)
        ],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Tension Review State Distribution',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'right'
        }
      }
    }
  };
  
  return generateChartImage(chartConfig, width, height);
}

/**
 * Generate evidence type distribution bar chart
 * @param {Object} evidenceTypeDistribution - From reportMetrics.tensions.summary.evidenceTypeDistribution
 * @param {Object} options - Chart options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateEvidenceTypeChart(evidenceTypeDistribution, options = {}) {
  const width = options.width || 600;
  const height = options.height || 400;
  
  const types = Object.keys(evidenceTypeDistribution);
  const counts = types.map(t => evidenceTypeDistribution[t]);
  
  const chartConfig = {
    type: 'bar',
    data: {
      labels: types,
      datasets: [{
        label: 'Evidence Count',
        data: counts,
        backgroundColor: '#3b82f6', // blue-500
        borderColor: '#2563eb', // blue-600
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Evidence Type Distribution',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Count'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Evidence Type'
          }
        }
      }
    }
  };
  
  return generateChartImage(chartConfig, width, height);
}

/**
 * Generate evidence coverage donut chart
 * @param {Object} evidenceMetrics - From analytics.evidenceMetrics with coveragePct and totalEvidenceCount
 * @param {Object} options - Chart options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateEvidenceCoverageChart(evidenceMetrics, options = {}) {
  const width = options.width || 500;
  const height = options.height || 500;
  
  const coveragePct = evidenceMetrics.coveragePct || 0;
  const notCoveredPct = 100 - coveragePct;
  
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: ['With Evidence', 'No Evidence'],
      datasets: [{
        data: [coveragePct, notCoveredPct],
        backgroundColor: ['#10b981', '#e5e7eb'], // emerald-500, gray-200
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Evidence Coverage: ${coveragePct.toFixed(1)}%`,
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  };
  
  return generateChartImage(chartConfig, width, height);
}

/**
 * Generate severity distribution bar chart
 * @param {Array} tensionsList - From reportMetrics.tensions.list
 * @param {Object} options - Chart options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateSeverityChart(tensionsList, options = {}) {
  const width = options.width || 500;
  const height = options.height || 400;
  
  const severityCounts = {
    'Low': 0,
    'Medium': 0,
    'High': 0,
    'Critical': 0
  };
  
  tensionsList.forEach(t => {
    const severity = t.severityLevel || 'Unknown';
    if (severityCounts.hasOwnProperty(severity)) {
      severityCounts[severity]++;
    } else {
      severityCounts['Low']++; // Default to Low for unknown
    }
  });
  
  const chartConfig = {
    type: 'bar',
    data: {
      labels: Object.keys(severityCounts),
      datasets: [{
        label: 'Tension Count',
        data: Object.values(severityCounts),
        backgroundColor: [
          '#10b981', // emerald-500 (Low)
          '#f59e0b', // amber-500 (Medium)
          '#ef4444', // red-500 (High)
          '#dc2626'  // red-600 (Critical)
        ],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Tension Severity Distribution',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Count'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Severity Level'
          }
        }
      }
    }
  };
  
  return generateChartImage(chartConfig, width, height);
}

/**
 * Helper: Generate chart image from Chart.js config using QuickChart API
 * @param {Object} chartConfig - Chart.js configuration object
 * @param {Number} width - Image width in pixels
 * @param {Number} height - Image height in pixels
 * @returns {Promise<Buffer>} PNG image buffer
 */
function generateChartImage(chartConfig, width = 800, height = 400) {
  return new Promise((resolve, reject) => {
    try {
      // QuickChart API endpoint
      const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
      const url = `https://quickchart.io/chart?c=${encodedConfig}&width=${width}&height=${height}`;
      
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Z-Inspection-Report-Generator/1.0'
        }
      };
      
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`QuickChart API returned status ${res.statusCode}`));
          return;
        }
        
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`QuickChart API request failed: ${error.message}`));
      });
      
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('QuickChart API request timeout'));
      });
      
      req.end();
    } catch (error) {
      reject(new Error(`Chart generation error: ${error.message}`));
    }
  });
}

module.exports = {
  generatePrincipleBarChart,
  generatePrincipleEvaluatorHeatmap,
  generateTeamCompletionDonut,
  generateTensionReviewStateChart,
  generateEvidenceTypeChart,
  generateEvidenceCoverageChart,
  generateSeverityChart
};

