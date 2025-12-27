import React, { useState } from 'react';
import { CheckCircle2, Users, FileText, BarChart3 } from 'lucide-react';
import { api } from '../api';

interface LoginScreenProps {
  onLogin: (email: string, password: string, role: string) => Promise<void> | void;
}

type Step = 'email' | 'code';

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
  const [loading, setLoading] = useState(false);

  // Step state for registration flow
  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login handleSubmit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!email || !password || !role) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
      setLoading(true);
      try {
        await onLogin(email, password, role);
      } catch (error) {
        console.error('Login error:', error);
      setError('Login failed. Please check your information.');
      } finally {
        setLoading(false);
      }
  };

  // Registration - Step 1: Send code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !role) {
      setError('Please fill in all fields.');
        return;
      }
      
    setError(null);
    setLoading(true);
      try {
      const response = await fetch(api('/api/auth/request-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        setStep('code');
        setSuccess('Verification code has been sent to your email address. Please check your inbox.');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const data = await response.json().catch(() => ({ message: 'An error occurred.' }));
        setError(data.message || 'An error occurred while sending the code.');
      }
    } catch (error) {
      console.error('Code sending error:', error);
      setError("Could not connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Registration - Step 2: Verify code and register
  const handleVerifyCodeAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch(api('/api/auth/verify-code-and-register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          email,
          code,
          name,
          password,
          role
          })
        });

        if (response.ok) {
        const data = await response.json();
        setSuccess('Registration completed successfully! You can now sign in.');
        // Clear form and return to login screen
        setTimeout(() => {
          setIsLogin(true);
          setStep('email');
          setName('');
          setEmail('');
          setPassword('');
          setCode('');
          setSuccess(null);
        }, 2000);
        } else {
        const data = await response.json().catch(() => ({ message: 'An error occurred.' }));
        setError(data.message || 'Registration failed. Please check your information.');
        }
      } catch (error) {
      console.error('Registration error:', error);
      setError("Could not connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Clear state when leaving registration screen
  const handleToggleLogin = () => {
    setIsLogin(!isLogin);
    setStep('email');
    setError(null);
    setSuccess(null);
    setCode('');
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
            <h1 className="text-4xl mb-2 text-gray-900 font-black">Z-Inspection Platform</h1>
            <p className="text-base text-gray-600">Ethical AI Evaluation System</p>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl mb-2 font-black">
              {isLogin 
                ? 'Sign In' 
                : step === 'email' 
                  ? 'Create Account' 
                  : 'Verify Email'}
            </h2>
            <p className="text-base text-gray-600">
              {isLogin
                ? 'Welcome back! Please sign in to continue.'
                : step === 'email'
                  ? 'Join the ethical AI evaluation platform.'
                  : 'Please enter the verification code sent to your email.'}
            </p>
          </div>

          {/* Error and success messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-base">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-base">
              {success}
            </div>
          )}

            {isLogin ? (
              // LOGIN FORM
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-semibold">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 h-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-semibold">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 h-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-semibold">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 h-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border"
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
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg text-white transition-colors hover:opacity-90 cursor-pointer font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: roleColors[role as keyof typeof roleColors] || '#1F2937'
                }}
              >
                {loading ? 'Loading...' : 'Sign In'}
              </button>
            </form>
          ) : step === 'email' ? (
            // REGISTER STEP 1: Email/User Info
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label className="block text-sm mb-2 text-gray-700 font-semibold">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 h-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border"
                  placeholder="Enter your full name"
                  required
                />
              </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700 font-semibold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 h-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700 font-semibold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 h-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border"
                placeholder="Enter your password"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700 font-semibold">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 h-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border"
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
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white transition-colors hover:opacity-90 cursor-pointer font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: roleColors[role as keyof typeof roleColors] || '#1F2937'
              }}
            >
                {loading ? 'Loading...' : 'Continue / Send Code'}
              </button>
            </form>
          ) : (
            // REGISTER STEP 2: Code Verification
            <form onSubmit={handleVerifyCodeAndRegister} className="space-y-6">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-base">
                <p className="font-medium mb-1">Code sent!</p>
                <p>Enter the 6-digit verification code sent to your email address: <strong>{email}</strong></p>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700 font-semibold">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(value);
                  }}
                  className="w-full px-4 h-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest box-border"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg text-white transition-colors hover:opacity-90 cursor-pointer font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: roleColors[role as keyof typeof roleColors] || '#1F2937'
                }}
              >
                {loading ? 'Loading...' : 'Register / Verify'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
                className="w-full py-2.5 px-4 text-gray-600 hover:text-gray-800 text-base"
              >
                ← Go back
            </button>
          </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={handleToggleLogin}
              className="text-base text-blue-600 hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {isLogin && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-base mb-3 text-blue-900">Demo Credentials</h3>
              <div className="space-y-2 text-sm">
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

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-2xl border border-white border-opacity-30 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-white hover:border-opacity-50 transition-all duration-150 ease-out">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-semibold text-center text-gray-900 text-[15px]">
                  Structured Evaluation
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-2xl border border-white border-opacity-30 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-white hover:border-opacity-50 transition-all duration-150 ease-out">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-semibold text-center text-gray-900 text-[15px]">
                  Multi-Role Collaboration
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-2xl border border-white border-opacity-30 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-white hover:border-opacity-50 transition-all duration-150 ease-out">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <p className="font-semibold text-center text-gray-900 text-[15px]">
                  Tensions Management
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-2xl border border-white border-opacity-30 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-white hover:border-opacity-50 transition-all duration-150 ease-out">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <p className="font-semibold text-center text-gray-900 text-[15px]">
                  Comprehensive Reports
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
