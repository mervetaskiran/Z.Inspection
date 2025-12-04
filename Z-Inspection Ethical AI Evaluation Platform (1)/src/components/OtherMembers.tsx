import React, { useState } from 'react';
import { ArrowLeft, Search, Users, Globe, Mail } from 'lucide-react';
import { User, Project } from '../types';
import { ContactUserModal } from './ContactUserModal';
import { roleColors } from '../utils/constants';
import { getUserProjects, formatRoleName, formatLastSeen } from '../utils/helpers';

interface OtherMembersProps {
  currentUser: User;
  users: User[];
  projects: Project[];
  onBack: () => void;
}

export function OtherMembers({ currentUser, users, projects, onBack }: OtherMembersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Kendim hariç diğer kullanıcılar
  const otherUsers = users.filter((user) => user.id !== currentUser.id);

  const filteredUsers = otherUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    const isOnline = (user as any).isOnline as boolean | undefined;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && isOnline) ||
      (statusFilter === 'offline' && !isOnline);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleContactUser = (user: User) => {
    setSelectedUser(user);
    setShowContactModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <div>
                <h1 className="text-xl text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Team Members
                </h1>
                <p className="text-gray-600">
                  Connect with other experts on the platform
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredUsers.length} of {otherUsers.length} members
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="ethical-expert">Ethical Expert</option>
            <option value="medical-expert">Medical Expert</option>
            <option value="use-case-owner">Use Case Owner</option>
            <option value="education-expert">Education Expert</option>
            <option value="technical-expert">Technical Expert</option>
            <option value="legal-expert">Legal Expert</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Members List */}
      <div className="px-6 py-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const userColor =
              roleColors[user.role as keyof typeof roleColors] || '#1F2937';

            // Backend tarafında projeler id üzerinden atanıyorsa helper'ı kullan
            const userProjects = getUserProjects(user.id, projects);

            const isOnline = (user as any).isOnline as boolean | undefined;
            const lastSeen = (user as any).lastSeen;

            return (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
                      style={{ backgroundColor: userColor }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg text-gray-900 truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>

                    <div className="flex items-center mt-1 space-x-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 border capitalize"
                        style={{
                          color: userColor,
                          borderColor: `${userColor}30`,
                          backgroundColor: `${userColor}10`
                        }}
                      >
                        {formatRoleName(user.role)}
                      </span>
                      <div className="flex items-center text-xs text-gray-500">
                        <Globe className="h-3 w-3 mr-1" />
                        {isOnline ? (
                          <span className="text-green-600">Online</span>
                        ) : lastSeen ? (
                          <span>
                            Last seen {formatLastSeen(lastSeen)}
                          </span>
                        ) : (
                          <span>Last seen unknown</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Active Projects ({userProjects.length})
                  </div>
                  <div className="space-y-1">
                    {userProjects.length > 0 ? (
                      userProjects.slice(0, 2).map((project) => (
                        <div
                          key={project.id}
                          className="text-xs text-gray-700 bg-gray-50 px-2 py-1.5 rounded border border-gray-100 truncate"
                        >
                          {project.title}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 italic">
                        No active projects assigned
                      </div>
                    )}

                    {userProjects.length > 2 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{userProjects.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleContactUser(user)}
                  className="w-full flex items-center justify-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: userColor }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Member
                </button>
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'No members match your search criteria.'
                : 'There are no other members on the platform yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Basit İstatistikler */}
      <div className="bg-white border-t px-6 py-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'admin').length}
            </div>
            <div className="text-sm text-gray-600">Admins</div>
          </div>
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'ethical-expert').length}
            </div>
            <div className="text-sm text-gray-600">Ethical Experts</div>
          </div>
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'technical-expert').length}
            </div>
            <div className="text-sm text-gray-600">Technical Experts</div>
          </div>
          <div>
            <div className="text-2xl text-gray-900">
              {users.filter((u) => u.role === 'medical-expert').length}
            </div>
            <div className="text-sm text-gray-600">Medical Experts</div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && selectedUser && (
        <ContactUserModal
          user={selectedUser}
          onClose={() => {
            setShowContactModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
