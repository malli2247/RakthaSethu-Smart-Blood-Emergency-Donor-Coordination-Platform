import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Droplets, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login({ email, password });
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        // Redirect according to user role
        switch (user.role) {
          case 'DONOR':
            navigate('/donor/dashboard');
            break;
          case 'PATIENT':
          case 'ATTENDANT':
            navigate('/patient/dashboard');
            break;
          case 'HOSPITAL':
            navigate('/hospital/dashboard');
            break;
          case 'BLOOD_BANK':
            navigate('/bloodbank/dashboard');
            break;
          case 'VOLUNTEER':
            navigate('/volunteer/dashboard');
            break;
          case 'ADMIN':
            navigate('/admin/dashboard');
            break;
          default:
            navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials for quick review
  const fillDemo = (demoEmail: string, demoPass = 'Demo@123456') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Droplets className="w-6 h-6 fill-white text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Raktha<span className="text-rose-600">Sethu</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-800">Sign in to your account</h2>
          <p className="text-xs text-slate-500">
            Access your donor dashboard, hospital requests, or inventory manager.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200 transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo account quick login chips */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick Demo Login:
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => fillDemo('donor.oneg@rakthasethu.org')}
                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 border border-rose-100 truncate"
              >
                Donor (O-)
              </button>
              <button
                type="button"
                onClick={() => fillDemo('donor.bpos@rakthasethu.org')}
                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 border border-rose-100 truncate"
              >
                Donor (B+)
              </button>
              <button
                type="button"
                onClick={() => fillDemo('apollo.hospital@rakthasethu.org')}
                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 border border-indigo-100 truncate"
              >
                Hospital
              </button>
              <button
                type="button"
                onClick={() => fillDemo('redcross.bloodbank@rakthasethu.org')}
                className="p-1.5 rounded-lg bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 border border-purple-100 truncate"
              >
                Blood Bank
              </button>
              <button
                type="button"
                onClick={() => fillDemo('patient@rakthasethu.org')}
                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 border border-amber-100 truncate"
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@rakthasethu.org', 'Admin@123456')}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 border border-slate-300 truncate"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-rose-600 hover:underline">
            Register for free
          </Link>
        </p>
      </div>
    </div>
  );
};
