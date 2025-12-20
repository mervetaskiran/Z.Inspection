import { Project, User, Tension, TensionSeverity, EthicalPrinciple } from '../types';
import { mockUserDetails } from './constants';

export const formatRoleName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'admin': 'Admin',
    'ethical-expert': 'Ethical Expert',
    'medical-expert': 'Medical Expert',
    'use-case-owner': 'Use Case Owner'
  };
  return roleMap[role] || role;
};

// Tension Severity Utilities
export const getSeverityColor = (severity: TensionSeverity) => {
  const colors = {
    'high': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', badge: 'bg-red-500', icon: '🔴' },
    'medium': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', badge: 'bg-yellow-500', icon: '🟡' },
    'low': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', badge: 'bg-green-500', icon: '🟢' }
  };
  return colors[severity];
};

export const getSeverityWeight = (severity: TensionSeverity): number => {
  const weights = { 'high': 3, 'medium': 2, 'low': 1 };
  return weights[severity];
};

export const getSeverityLabel = (severity: TensionSeverity): string => {
  const labels = { 'high': 'High', 'medium': 'Medium', 'low': 'Low' };
  return labels[severity];
};

// Calculate average risk for a principle based on tensions
export const calculatePrincipleRisk = (tensions: Tension[], principle: EthicalPrinciple): number => {
  const relevantTensions = tensions.filter(t => t.principle1 === principle || t.principle2 === principle);
  if (relevantTensions.length === 0) return 0;
  
  const totalWeight = relevantTensions.reduce((sum, tension) => sum + tension.weight, 0);
  return totalWeight / relevantTensions.length;
};

// Calculate severity distribution for pie chart
export const calculateSeverityDistribution = (tensions: Tension[]) => {
  const distribution = { high: 0, medium: 0, low: 0 };
  tensions.forEach(tension => {
    distribution[tension.severity]++;
  });
  
  const total = tensions.length;
  return {
    high: { count: distribution.high, percentage: total > 0 ? Math.round((distribution.high / total) * 100) : 0 },
    medium: { count: distribution.medium, percentage: total > 0 ? Math.round((distribution.medium / total) * 100) : 0 },
    low: { count: distribution.low, percentage: total > 0 ? Math.round((distribution.low / total) * 100) : 0 }
  };
};

// Get tension pairs for visualization
export const getTensionPairs = (tensions: Tension[]): Map<string, { count: number, avgSeverity: number, tensions: Tension[] }> => {
  const tensionMap = new Map<string, { count: number, avgSeverity: number, tensions: Tension[] }>();
  
  tensions.forEach(tension => {
    if (tension.principle1 && tension.principle2) {
      const pair = [tension.principle1, tension.principle2].sort().join(' ↔ ');
      
      if (!tensionMap.has(pair)) {
        tensionMap.set(pair, { count: 0, avgSeverity: 0, tensions: [] });
      }
      
      const entry = tensionMap.get(pair)!;
      entry.count++;
      entry.tensions.push(tension);
    }
  });
  
  // Calculate average severity for each tension pair
  tensionMap.forEach((value, key) => {
    const totalWeight = value.tensions.reduce((sum, tension) => sum + tension.weight, 0);
    value.avgSeverity = totalWeight / value.tensions.length;
  });
  
  return tensionMap;
};

export const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

export const formatLastSeen = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'Less than an hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  return date.toLocaleDateString();
};

export const getUserProjects = (userId: string, projects: Project[]) => {
  // Get projects where user is assigned and project is not completed
  return projects.filter(project => {
    const projectId = project.id || (project as any)._id;
    const assignedUsers = project.assignedUsers || [];
    const userIdStr = String(userId);
    
    // Check if user is assigned to this project
    const isAssigned = assignedUsers.some((assignedId: any) => {
      const assignedIdStr = String(assignedId?.id || assignedId?._id || assignedId);
      return assignedIdStr === userIdStr;
    });
    
    if (!isAssigned) return false;
    
    // Exclude completed projects (evolutionCompleted: true or progress: 100)
    const isCompleted = (project as any).evolutionCompleted === true ||
                        (project.progress !== undefined && project.progress >= 100);
    
    return !isCompleted;
  });
};

export const getUserById = (userId: string, users: User[]) => {
  return users.find(u => u.id === userId);
};

export const getProjectById = (projectId: string, projects: Project[]) => {
  return projects.find(p => p.id === projectId);
};

export const getAssignedUserNames = (userIds: string[], users: User[]) => {
  return userIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
};