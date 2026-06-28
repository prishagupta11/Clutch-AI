import React, { useState } from 'react';
import { auth, provider } from './lib/firebaseAuth';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function App() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in.');
    }
  };

  // Handle Form Submission (Login or Sign Up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in email and password fields.');
      return;
    }

    try {
      if (isSignUp) {
        // Full Registration Flow
        if (!fullName || !phone || !age) {
          setError('Please fill out all profile registration fields.');
          return;
        }
        
        // Register in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Log additional info safely to console for your backend application layer hook
        console.log("Profile Meta Captured:", {
          uid: userCredential.user.uid,
          fullName,
          phone,
          age
        });
      } else {
        // Standard Login Flow
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] flex items-center justify-center font-sans antialiased text-[#e2e8f0] py-12 px-4">
      <div className="w-full max-w-md p-8 bg-[#13151a] rounded-2xl border border-[#22262f] shadow-2xl transition-all duration-300">
        
        {/* Top Branding Section */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/10">
            C
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1.5">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-[#94a3b8]">
            {isSignUp ? 'Get started with your intelligent context workspace' : 'Empower your workflow with intelligent context automation'}
          </p>
        </div>

        {/* Primary OAuth Sign-In */}
        <div className="space-y-4">
          <button 
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 font-medium rounded-xl border border-gray-200 transition-colors shadow-sm text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.435 2.221 15.534 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.746-.08-1.32-.176-1.709H12.24z"/>
            </svg>
            Continue with Google
          </button>

          {/* Clean Divider */}
          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-[#22262f]"></div>
            <span className="px-3 text-xs font-semibold tracking-wider text-[#64748b] uppercase">
              or use email details
            </span>
            <div className="flex-1 border-t border-[#22262f]"></div>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          {/* Form Engine */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Conditional Sign-Up Profile Fields */}
            {isSignUp && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe" 
                    className="w-full px-4 py-2.5 bg-[#1a1d24] border border-[#2a303c] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000" 
                      className="w-full px-4 py-2.5 bg-[#1a1d24] border border-[#2a303c] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1.5">Age</label>
                    <input 
                      type="number" 
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="25" 
                      className="w-full px-4 py-2.5 bg-[#1a1d24] border border-[#2a303c] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Core Credentials Fields */}
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com" 
                className="w-full px-4 py-2.5 bg-[#1a1d24] border border-[#2a303c] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1.5">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-4 py-2.5 bg-[#1a1d24] border border-[#2a303c] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                required
              />
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Create account'}
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-600/15 transition-all text-sm"
              >
                {isSignUp ? 'Sign Up' : 'Continue'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}