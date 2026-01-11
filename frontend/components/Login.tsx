
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      onLogin({ id: userId, name: userId });
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="bg-red-600 text-white px-4 py-1 rounded font-black text-2xl italic tracking-tighter">
            OWN GOAL
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-center mb-2">Director Authentication</h2>
        <p className="text-gray-500 text-xs text-center mb-8 uppercase tracking-widest">Enter User ID to start broadcast</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Operator ID</label>
            <input 
              type="text" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-gray-700"
              placeholder="e.g. USER_089"
              autoFocus
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98]"
          >
            INITIALIZE FEED
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] text-gray-600 uppercase tracking-widest">
          <span>Secure Session</span>
          <span>V 2.5.1-PRO</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
