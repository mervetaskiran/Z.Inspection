import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Tension } from '../types';
import { calculateSeverityDistribution } from '../utils/helpers';
import { BarChart3 } from 'lucide-react';

interface SeverityDistributionChartProps {
  tensions: Tension[];
}

const COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981'
};

export function SeverityDistributionChart({ tensions }: SeverityDistributionChartProps) {
  const distribution = calculateSeverityDistribution(tensions);

  const data = [
    { name: 'High', value: distribution.high.count, color: COLORS.high },
    { name: 'Medium', value: distribution.medium.count, color: COLORS.medium },
    { name: 'Low', value: distribution.low.count, color: COLORS.low }
  ].filter(item => item.value > 0);

  if (tensions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No tensions data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm text-gray-700 mb-2 flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          Tension Severity Distribution
        </h3>
      </div>

      <div className="flex items-center">
        <div className="flex-shrink-0" style={{ width: '200px', height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 ml-6 space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
              <span className="text-sm text-gray-700">High Concern</span>
            </div>
            <div className="text-right">
              <div className="text-lg text-gray-900">{distribution.high.count}</div>
              <div className="text-xs text-gray-600">{distribution.high.percentage}%</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
              <span className="text-sm text-gray-700">Medium Concern</span>
            </div>
            <div className="text-right">
              <div className="text-lg text-gray-900">{distribution.medium.count}</div>
              <div className="text-xs text-gray-600">{distribution.medium.percentage}%</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              <span className="text-sm text-gray-700">Low Concern</span>
            </div>
            <div className="text-right">
              <div className="text-lg text-gray-900">{distribution.low.count}</div>
              <div className="text-xs text-gray-600">{distribution.low.percentage}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
