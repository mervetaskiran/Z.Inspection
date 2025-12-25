export const roleColors = {
  admin: '#1F2937',
  'ethical-expert': '#1E40AF', 
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED'
};

export const statusColors = {
  ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  proven: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  disproven: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
};

export const stageLabels = {
  initiate: 'Initiate',
  assess: 'Assess', 
  conclude: 'Conclude'
};

// Mock user details for demonstration
export const mockUserDetails = {
  admin1: { isOnline: true, lastSeen: null, currentProjects: ['1', '2', '3'] },
  user1: { isOnline: true, lastSeen: null, currentProjects: ['1', '2'] },
  user2: { isOnline: false, lastSeen: '2024-01-22T08:30:00Z', currentProjects: ['1', '3'] },
  user3: { isOnline: true, lastSeen: null, currentProjects: ['1'] },
  user4: { isOnline: false, lastSeen: '2024-01-21T16:45:00Z', currentProjects: ['2'] }
};