import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mail, User as UserIcon, FileText, CheckCircle, Eye } from 'lucide-react';
import { User, UseCase } from '../types';
import { api } from '../api';

interface UseCaseOwnerDetailProps {
  owner: User; // user with role: use-case-owner
  currentUser: User;
  onBack: () => void;
  onViewUseCase?: (useCase: UseCase) => void;
}

export function UseCaseOwnerDetail({ owner, currentUser, onBack, onViewUseCase }: UseCaseOwnerDetailProps) {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUseCases = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(api(`/api/use-cases?ownerId=${encodeURIComponent(owner.id)}`));
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to load use cases');
        }
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const normalized = arr.map((uc: any) => ({
          ...uc,
          id: String(uc._id || uc.id)
        }));
        if (!cancelled) setUseCases(normalized);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load use cases');
          setUseCases([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUseCases();
    return () => {
      cancelled = true;
    };
  }, [owner.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        {/* Owner Profile */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white mr-4">
              <span className="text-3xl">{owner.name?.charAt(0) || 'U'}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl text-gray-900 mb-2">{owner.name}</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="text-sm text-gray-900">{owner.email}</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-500">Role</div>
                    <div className="text-sm text-gray-900">{owner.role}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Owned Use Cases */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl text-gray-900 mb-6">Owned Use Cases</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading use cases...</div>
          ) : useCases.length > 0 ? (
            <div className="space-y-4">
              {useCases.map((uc) => (
                <div key={uc.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-500 mb-1">Use Case</div>
                      <div className="text-lg text-gray-900 truncate">{uc.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Status: <span className="font-medium">{uc.status}</span> · Progress: <span className="font-medium">{uc.progress}%</span>
                      </div>
                    </div>
                    {onViewUseCase && (
                      <button
                        onClick={() => onViewUseCase(uc)}
                        className="ml-4 inline-flex items-center px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-3" />
              <p className="mb-2">No use cases found</p>
              <p className="text-sm">This user does not own any use cases yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
