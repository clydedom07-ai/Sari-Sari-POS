'use client';

import { useState } from 'react';
import { useAuth, UserRole } from '@/lib/contexts/auth-context';
import { motion } from 'motion/react';
import { Store, Mail, Lock, Loader2, ArrowRight, Shield, User } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signup(email, password, role);
    } catch (err: any) {
      setError(err.message || 'Failed to signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-[2rem] text-white shadow-2xl shadow-orange-200 mb-6">
            <Store className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Join the POS</h1>
          <p className="text-gray-500 font-medium">Create your store account</p>
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-[2rem] pl-14 pr-8 py-5 font-bold text-gray-900 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-lg"
                  placeholder="name@store.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-[2rem] pl-14 pr-8 py-5 font-bold text-gray-900 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-lg"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Account Role</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('cashier')}
                  className={`p-6 rounded-3xl flex flex-col items-center gap-3 transition-all border-2 ${
                    role === 'cashier'
                      ? 'bg-orange-50 border-orange-600 text-orange-600 shadow-lg shadow-orange-100'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <User className={`w-8 h-8 ${role === 'cashier' ? 'text-orange-600' : 'text-gray-300'}`} />
                  <span className="font-black uppercase tracking-widest text-[10px]">Cashier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-6 rounded-3xl flex flex-col items-center gap-3 transition-all border-2 ${
                    role === 'admin'
                      ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-lg shadow-blue-100'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <Shield className={`w-8 h-8 ${role === 'admin' ? 'text-blue-600' : 'text-gray-300'}`} />
                  <span className="font-black uppercase tracking-widest text-[10px]">Admin</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 hover:bg-black text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 uppercase tracking-widest text-sm mt-8"
            >
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-gray-400 font-medium text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-600 font-black uppercase tracking-widest text-xs hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
