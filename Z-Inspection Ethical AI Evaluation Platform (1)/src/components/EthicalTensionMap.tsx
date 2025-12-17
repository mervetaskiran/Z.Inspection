import React, { useState } from 'react';
import { GitBranch, Info, X } from 'lucide-react';
import { Tension, EthicalPrinciple } from '../types';
import { getTensionPairs, getSeverityColor } from '../utils/helpers';

interface EthicalTensionMapProps {
  tensions: Tension[];
}

const principlePositions: Record<EthicalPrinciple, { x: number; y: number }> = {
  'Fairness': { x: 50, y: 10 },
  'Privacy': { x: 85, y: 35 },
  'Transparency': { x: 85, y: 65 },
  'Accountability': { x: 50, y: 90 },
  'Safety': { x: 15, y: 65 },
  'Human Oversight': { x: 15, y: 35 },
  'Sustainability': { x: 50, y: 50 }
};

const principleColors: Record<EthicalPrinciple, string> = {
  'Fairness': '#a855f7',
  'Privacy': '#3b82f6',
  'Accountability': '#f97316',
  'Transparency': '#06b6d4',
  'Safety': '#ef4444',
  'Human Oversight': '#10b981',
  'Sustainability': '#059669'
};

export function EthicalTensionMap({ tensions }: EthicalTensionMapProps) {
  const [selectedTension, setSelectedTension] = useState<string | null>(null);
  const tensionMap = getTensionPairs(tensions);

  // Convert tension map to array for easier rendering
  const tensionPairs = Array.from(tensionMap.entries()).map(([pair, data]) => {
    const [principle1, principle2] = pair.split(' ↔ ') as EthicalPrinciple[];
    return { pair, principle1, principle2, ...data };
  });

  const selectedTensionData = selectedTension ? tensionMap.get(selectedTension) : null;

  if (tensions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <GitBranch className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No tension data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-gray-900 flex items-center">
          <GitBranch className="h-5 w-5 mr-2" />
          Ethical Tension Map
        </h3>
        <div className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {tensionPairs.length} tensions identified
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
        <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          This map shows ethical principles in tension. Click on connecting lines to see related tensions.
          Thicker lines indicate more frequent tensions.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-96"
          style={{ maxHeight: '400px' }}
        >
          {/* Draw tension lines */}
          {tensionPairs.map(({ pair, principle1, principle2, count, avgSeverity }) => {
            const pos1 = principlePositions[principle1];
            const pos2 = principlePositions[principle2];
            const strokeWidth = Math.min(count * 0.5, 3);
            const severityLevel = avgSeverity >= 2.5 ? 'high' : avgSeverity >= 1.5 ? 'medium' : 'low';
            const lineColor = getSeverityColor(severityLevel).badge.replace('bg-', '');
            const colorMap: Record<string, string> = {
              'red-500': '#ef4444',
              'yellow-500': '#f59e0b',
              'green-500': '#10b981'
            };

            return (
              <g
                key={pair}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedTension(pair)}
              >
                <line
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke={colorMap[lineColor] || '#6b7280'}
                  strokeWidth={strokeWidth}
                  strokeOpacity={selectedTension === pair ? 1 : 0.4}
                  strokeDasharray={selectedTension === pair ? '0' : '2,2'}
                />
              </g>
            );
          })}

          {/* Draw principle nodes */}
          {(Object.keys(principlePositions) as EthicalPrinciple[]).map((principle) => {
            const pos = principlePositions[principle];
            const color = principleColors[principle];

            return (
              <g key={principle}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="5"
                  fill={color}
                  stroke="white"
                  strokeWidth="0.5"
                  className="drop-shadow-md"
                />
                <text
                  x={pos.x}
                  y={pos.y + (pos.y < 50 ? -7 : 9)}
                  textAnchor="middle"
                  fontSize="3.5"
                  fill="#374151"
                  className="select-none"
                  style={{ fontWeight: 500 }}
                >
                  {principle}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tension Details Modal */}
      {selectedTension && selectedTensionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg text-gray-900">Tension Details</h3>
              <button
                onClick={() => setSelectedTension(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-center">
                  <GitBranch className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-lg text-gray-900">{selectedTension}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Average Severity</div>
                  <div className="text-xl text-gray-900">
                    {selectedTensionData.avgSeverity.toFixed(1)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-700 mb-3">
                  {selectedTensionData.count} tensions involve this conflict:
                </div>
                <div className="space-y-2">
                  {selectedTensionData.tensions.map((tension) => {
                    const colors = getSeverityColor(tension.severity);
                    
                    // Consensus yüzdesi hesaplama
                    const agreeCount = tension.consensus?.agree || 0;
                    const disagreeCount = tension.consensus?.disagree || 0;
                    const totalVotes = agreeCount + disagreeCount;
                    const agreePercentage = totalVotes > 0 
                      ? (agreeCount === totalVotes ? 100 : Math.round((agreeCount / totalVotes) * 100))
                      : 0;
                    
                    // Yüzdeye göre yeşil renk hesaplama
                    const getGreenColor = (percentage: number) => {
                      if (percentage === 0) return '#e5f7e5';
                      if (percentage <= 25) return '#86efac';
                      if (percentage <= 50) return '#4ade80';
                      if (percentage <= 75) return '#22c55e';
                      return '#16a34a';
                    };
                    
                    return (
                      <div
                        key={tension.id}
                        className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm text-gray-900">{tension.claimStatement}</span>
                          <span
                            className={`ml-2 w-3 h-3 rounded-full flex-shrink-0 ${colors.badge}`}
                          />
                        </div>
                        
                        {/* Consensus Progress Bar */}
                        {totalVotes > 0 && (
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs text-gray-500 font-medium">Consensus:</span>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner relative">
                              <div 
                                className="h-full transition-all duration-500 ease-out rounded-full"
                                style={{ 
                                  width: `${agreePercentage}%`,
                                  minWidth: agreePercentage > 0 ? '4px' : '0',
                                  backgroundColor: getGreenColor(agreePercentage),
                                  display: agreePercentage > 0 ? 'block' : 'none'
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-20 text-right">
                              {agreePercentage}% agree
                            </span>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-600">
                          Created: {new Date(tension.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tension List */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm text-gray-700 mb-3">All Tensions</h4>
        <div className="space-y-2">
          {tensionPairs.map(({ pair, count, avgSeverity }) => {
            const severityLevel = avgSeverity >= 2.5 ? 'high' : avgSeverity >= 1.5 ? 'medium' : 'low';
            const colors = getSeverityColor(severityLevel);

            return (
              <button
                key={pair}
                onClick={() => setSelectedTension(pair)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <GitBranch className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{pair}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-600">{count} tensions</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                      Avg: {avgSeverity.toFixed(1)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
