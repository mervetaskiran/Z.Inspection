import React, { useState } from 'react';
import { Mail, Lock, User, CheckCircle2, Users, FileText, BarChart3 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, password: string, role: string) => Promise<void> | void;
}

const roleColors = {
  admin: '#1F2937',
  'ethical-expert': '#1E40AF',
  'medical-expert': '#9D174D',
  'use-case-owner': '#065F46',
  'education-expert': '#7C3AED',
  'technical-expert': '#0891B2',
  'legal-expert': '#B45309'
} as const;

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('admin');

  // Login + Register birleşik handleSubmit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validasyonu
    if (!email || !password || !role) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    if (isLogin) {
      // Giriş işlemi (App.tsx'teki handleLogin tetiklenir)
      onLogin(email, password, role);
    } else {
      // Kayıt olma işlemi
      if (!name) {
        alert('Lütfen adınızı girin.');
        return;
      }
      
      try {
        const response = await fetch('http://127.0.0.1:5000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            role: role
          })
        });

        if (response.ok) {
          alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
          setIsLogin(true); // Giriş ekranına dön
          // Formu temizle
          setName('');
          setEmail('');
          setPassword('');
        } else {
          const errorData = await response.json().catch(() => ({}));
          alert('Kayıt hatası: ' + (errorData.message || 'Bilinmeyen hata'));
        }
      } catch (error) {
        console.error('Kayıt hatası:', error);
        alert("Sunucuya bağlanılamadı. Backend'in açık olduğundan emin olun.");
      }
    }
  };

  const demoCredentials = [
    { role: 'admin',             email: 'admin@zinspection.com',     name: 'Admin User',         displayName: 'Admin' },
    { role: 'ethical-expert',    email: 'ethical@zinspection.com',   name: 'Sarah Johnson',      displayName: 'Ethical Expert' },
    { role: 'medical-expert',    email: 'medical@zinspection.com',   name: 'Dr. Emily Smith',    displayName: 'Medical Expert' },
    { role: 'use-case-owner',    email: 'usecase@zinspection.com',   name: 'John Davis',         displayName: 'Use Case Expert' },
    { role: 'education-expert',  email: 'education@zinspection.com', name: 'Prof. Maria Garcia', displayName: 'Education Expert' },
    { role: 'technical-expert',  email: 'technical@zinspection.com', name: 'Alex Chen',          displayName: 'Technical Expert' },
    { role: 'legal-expert',      email: 'legal@zinspection.com',     name: 'Robert Martinez',    displayName: 'Legal Expert' }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Form */}
      <div className="w-1/2 flex flex-col justify-center px-12 bg-white">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl mb-2 text-gray-900">Z-Inspection Platform</h1>
            <p className="text-gray-600">Ethical AI Evaluation System</p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl mb-2">{isLogin ? 'Sign In' : 'Create Account'}</h2>
            <p className="text-gray-600">
              {isLogin
                ? 'Welcome back! Please sign in to continue.'
                : 'Join the ethical AI evaluation platform.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm mb-2 text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm mb-2 text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  color: roleColors[role as keyof typeof roleColors] || '#111827'
                }}
              >
                <option value="admin">Admin</option>
                <option value="ethical-expert">Ethical Expert</option>
                <option value="medical-expert">Medical Expert</option>
                <option value="use-case-owner">Use Case Expert</option>
                <option value="education-expert">Education Expert</option>
                <option value="technical-expert">Technical Expert</option>
                <option value="legal-expert">Legal Expert</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg text-white transition-colors hover:opacity-90 cursor-pointer font-medium"
              style={{
                backgroundColor: roleColors[role as keyof typeof roleColors] || '#1F2937'
              }}
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {isLogin && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-sm mb-3 text-blue-900">Demo Credentials</h3>
              <div className="space-y-2 text-xs">
                {demoCredentials.map((cred) => (
                  <div key={cred.role} className="flex justify-between items-center py-1">
                    <span
                      className="font-medium"
                      style={{
                        color: roleColors[cred.role as keyof typeof roleColors]
                      }}
                    >
                      {cred.displayName}:
                    </span>
                    <span className="text-gray-700">{cred.email}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-3 pt-3 border-t border-blue-200">
                Password: <span className="font-medium">any text</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Promotional Panel */}
      <div
        className="w-1/2 flex flex-col justify-center items-center text-white px-12"
        style={{
          backgroundColor: roleColors[role as keyof typeof roleColors] || '#1F2937'
        }}
      >
        <div className="text-center max-w-lg">
          {/* Logo */}
          <div className="mb-6 flex items-center justify-center">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-5xl">🔍</span>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl mb-4">Ethical AI Evaluation</h2>
          <p className="text-xl opacity-90 mb-10 leading-relaxed">
            Comprehensive platform for conducting Z-Inspection methodology on AI systems.
          </p>

          {/* Feature Icons */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-15 backdrop-blur-sm p-5 rounded-xl hover:bg-opacity-25 transition-all">
              <CheckCircle2 className="h-8 w-8 mb-3 mx-auto" />
              <p className="font-medium text-center text-[rgb(21,21,21)]">
                Structured Evaluation
              </p>
            </div>
            <div className="bg-white bg-opacity-15 backdrop-blur-sm p-5 rounded-xl hover:bg-opacity-25 transition-all">
              <Users className="h-8 w-8 mb-3 mx-auto" />
              <p className="font-medium text-center text-[rgb(13,13,13)]">
                Multi-Role Collaboration
              </p>
            </div>
            <div className="bg-white bg-opacity-15 backdrop-blur-sm p-5 rounded-xl hover:bg-opacity-25 transition-all">
              <BarChart3 className="h-8 w-8 mb-3 mx-auto" />
              <p className="font-medium text-center text-[rgb(22,22,22)]">
                Tensions Management
              </p>
            </div>
            <div className="bg-white bg-opacity-15 backdrop-blur-sm p-5 rounded-xl hover:bg-opacity-25 transition-all">
              <FileText className="h-8 w-8 mb-3 mx-auto" />
              <p className="font-medium text-center text-[rgb(17,17,17)]">
                Comprehensive Reports
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
