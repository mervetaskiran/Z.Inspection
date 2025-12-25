import React, { useState } from 'react';
import { X, Mail, Phone, MessageCircle } from 'lucide-react';
import { User } from '../types';
import { roleColors } from '../utils/constants';
import { formatRoleName } from '../utils/helpers';

interface ContactUserModalProps {
  user: User;
  onClose: () => void;
}

export function ContactUserModal({ user, onClose }: ContactUserModalProps) {
  const [message, setMessage] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'message'>('message');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock contact functionality
    alert(`${contactMethod === 'email' ? 'Email sent' : 'Message sent'} to ${user.name}!`);
    onClose();
  };

  const userColor = roleColors[user.role as keyof typeof roleColors];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl text-gray-900">Contact {user.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* User Info */}
          <div className="flex items-center mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white mr-4"
              style={{ backgroundColor: userColor }}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="text-lg text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-600">{formatRoleName(user.role)}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>

          {/* Contact Method */}
          <div className="mb-4">
            <label className="block text-sm mb-2 text-gray-700">Contact Method</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="contactMethod"
                  value="message"
                  checked={contactMethod === 'message'}
                  onChange={(e) => setContactMethod(e.target.value as 'email' | 'message')}
                  className="mr-2"
                />
                <MessageCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">Platform Message</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="contactMethod"
                  value="email"
                  checked={contactMethod === 'email'}
                  onChange={(e) => setContactMethod(e.target.value as 'email' | 'message')}
                  className="mr-2"
                />
                <Mail className="h-4 w-4 mr-2" />
                <span className="text-sm">Email</span>
              </label>
            </div>
          </div>

          {/* Message */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm mb-2 text-gray-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Send a ${contactMethod} to ${user.name}...`}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: userColor }}
              >
                {contactMethod === 'email' ? 'Send Email' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}