import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Trash2, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { api } from '../api';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
  onLogout: () => void;
}

export function ProfileModal({ user, onClose, onUpdate, onLogout }: ProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [profileImage, setProfileImage] = useState<string | null>((user as any).profileImage || null);
  
  // Update local state when user prop changes
  useEffect(() => {
    setName(user.name);
    setProfileImage((user as any).profileImage || null);
  }, [user]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');

  useEffect(() => {
    // Fetch user data to get lastSeen
    const fetchUser = async () => {
      try {
        const response = await fetch(api(`/api/users`));
        if (response.ok) {
          const users = await response.json();
          const currentUser = users.find((u: any) => u._id === user.id || u.id === user.id);
          if (currentUser?.lastSeen) {
            setLastSeen(new Date(currentUser.lastSeen).toLocaleString());
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, [user.id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfileImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      const userId = user.id || (user as any)._id;
      
      if (!userId) {
        setError('User ID not found');
        setSaving(false);
        return;
      }
      
      // Update name
      if (name !== user.name) {
        const response = await fetch(api(`/api/users/${userId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (!response.ok) {
          throw new Error('Failed to update name');
        }
        const updated = await response.json();
        onUpdate({ ...user, name: updated.name });
      }

      // Update profile image (or remove if null)
      const currentImage = (user as any).profileImage || null;
      if (profileImage !== currentImage) {
        console.log('Updating profile image:', { userId, hasImage: !!profileImage, imageLength: profileImage?.length });
        const response = await fetch(api(`/api/users/${userId}/profile-image`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: profileImage || null })
        });
        
        console.log('Profile image response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Profile image error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Failed to update profile image' };
          }
          throw new Error(errorData.error || 'Failed to update profile image');
        }
        const updated = await response.json();
        console.log('Profile image updated successfully');
        // Transform backend response to frontend format
        const updatedUser: User = {
          ...user,
          name: updated.name || user.name,
          id: updated._id || updated.id || user.id,
          email: updated.email || user.email,
          role: updated.role || user.role
        };
        (updatedUser as any).profileImage = updated.profileImage;
        onUpdate(updatedUser);
      }

      // Change password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError('New passwords do not match');
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          setError('Password must be at least 6 characters');
          setSaving(false);
          return;
        }

        const response = await fetch(api(`/api/users/${userId}/change-password`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword, newPassword })
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to change password');
          setSaving(false);
          return;
        }

        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      alert('Profile updated successfully!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const userId = user.id || (user as any)._id;
      const response = await fetch(api(`/api/users/${userId}/delete-account`), {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Account deleted successfully');
        onLogout();
      } else {
        alert('Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account');
    }
  };

  const getInitials = () => {
    return user.name.charAt(0).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-900 flex items-center justify-center text-white text-4xl font-medium border-4 border-gray-200">
                  {getInitials()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {profileImage ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleRemoveImage}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-2 text-sm font-semibold shadow-md border-2 border-red-700"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  <Trash2 className="h-5 w-5" />
                  Remove Picture
                </button>
                <p className="text-xs text-red-600 font-medium">Delete picture</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                Click upload to add profile image
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <input
              type="text"
              value={user.role}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed capitalize"
            />
          </div>

          {/* Last Seen */}
          {lastSeen && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Seen</label>
              <input
                type="text"
                value={lastSeen}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          {/* Password Change Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Old Password</label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Enter old password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showOldPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

