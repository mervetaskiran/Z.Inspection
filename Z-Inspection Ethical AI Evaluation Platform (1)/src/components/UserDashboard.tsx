import React, { useState } from 'react';
import { Folder, MessageSquare, Users, LogOut, Search, Clock, Play, FileText, BarChart3 } from 'lucide-react';
import { Project, User } from '../types';

interface UserDashboardProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  onViewProject: (project: Project) => void;
  onStartEvaluation: (project: Project) => void;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const statusColors = {
  ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  proven: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  disproven: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
};

const roleColors = {
  admin: '#1F2937',
  'ethical-expert': '#1E40AF', 
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED'
};

export function UserDashboard({
  currentUser,
  projects,
  users,
  onViewProject,
  onStartEvaluation,
  onNavigate,
  onLogout
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'assigned' | 'commented'>('assigned');
  const [searchTerm, setSearchTerm] = useState('');

  // --- LOGIC FIX: Filter projects assigned to current user ---
  const myProjects = projects.filter(project => 
    project.assignedUsers && project.assignedUsers.includes(currentUser.id)
  );

  const filteredProjects = myProjects.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColor = roleColors[currentUser.role as keyof typeof roleColors] || '#1F2937';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* --- SIDEBAR (Restored from your screenshot) --- */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Role Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="text-xl font-bold text-gray-900 mb-1">Z-Inspection Platform</div>
          <span 
            className="px-2 py-1 text-xs text-white rounded-md uppercase font-medium"
            style={{ backgroundColor: roleColor }}
          >
            {currentUser.role.replace('-', ' ')}
          </span>
        </div>

        {/* User Info */}
        <div className="px-6 py-6">
          <div className="text-xs text-gray-500 mb-1">Welcome back,</div>
          <div className="font-medium text-gray-900">{currentUser.name}</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'assigned' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Folder className="h-5 w-5 mr-3" />
            My Projects
          </button>
          
          <button
            onClick={() => onNavigate('shared-area')}
            className="w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <MessageSquare className="h-5 w-5 mr-3" />
            Shared Area
          </button>

          <button
            onClick={() => onNavigate('other-members')}
            className="w-full px-4 py-3 flex items-center rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Users className="h-5 w-5 mr-3" />
            Other Members
          </button>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 flex items-center text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Area */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex flex-col space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 capitalize">
                {currentUser.role.replace('-', ' ')} Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Review and evaluate AI systems from a {currentUser.role.replace('-', ' ')} perspective
              </p>
            </div>

            {/* Tabs & Search */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex space-x-6 border-b border-transparent">
                <button
                  onClick={() => setActiveTab('assigned')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
                    activeTab === 'assigned'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Assigned Projects ({myProjects.length})
                </button>
                <button
                  onClick={() => setActiveTab('commented')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
                    activeTab === 'commented'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Commented Projects (0)
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Project List Area */}
        <div className="flex-1 overflow-auto p-8">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned projects found</h3>
              <p className="text-gray-500">
                You have not been assigned to any projects yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div key={project.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{project.shortDescription}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status].bg} ${statusColors[project.status].text}`}>
                      {project.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {project.stage}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'No date'}
                    </div>
                    <button
                      onClick={() => onStartEvaluation(project)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play className="h-3 w-3 mr-2" />
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}