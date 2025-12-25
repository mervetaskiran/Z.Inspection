import React, { useMemo } from 'react';
import { User as UserIcon } from 'lucide-react';
import { User, Project } from '../types';

interface UseCaseOwnersProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  onViewOwner: (owner: User) => void;
}

export function UseCaseOwners({ currentUser, projects, users, onViewOwner }: UseCaseOwnersProps) {
  // Use already-loaded app users (DB-backed) instead of refetching.
  const owners = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    return list.filter((u) => u?.role === 'use-case-owner');
  }, [users]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl text-gray-900">Use Case Owners</h3>
          <p className="text-gray-600 mt-1">
            Users with role: <span className="font-medium">use-case-owner</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {owners.map(owner => (
          <div
            key={owner.id}
            onClick={() => onViewOwner(owner)}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white mr-3">
                <span className="text-lg">{owner.name.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 mb-1">{owner.name}</h4>
                <p className="text-sm text-gray-600">{owner.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Role</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {owner.role}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {owners.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
          <p className="mb-2">
            No use case owners found
          </p>
        </div>
      )}

    </div>
  );
}
