import React, { useState } from 'react';
import { Logo } from './ui/Logo';
import { TRANSLATIONS } from '../translations';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Hardcoded language for auth screen simplicity, or could pass it in
  const t = TRANSLATIONS['zh'].auth;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate Authentication
    if (email && password) {
      // In a real app, this would verify with backend
      // Here we simulate getting a user object
      const user: User = {
        id: email.replace(/[^a-zA-Z0-9]/g, '_'), // Simple ID generation
        email,
        username: name || email.split('@')[0],
      };
      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-black text-white p-8 text-center">
            <div className="flex justify-center mb-4">
                <Logo className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{t.welcome}</h1>
            <p className="text-gray-400 text-sm mt-2">{t.subtitle}</p>
        </div>

        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t.name}</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 font-bold focus:bg-white focus:border-black outline-none transition-all"
                            placeholder="Your Name"
                        />
                    </div>
                )}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t.email}</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 font-bold focus:bg-white focus:border-black outline-none transition-all"
                        placeholder="name@example.com"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t.password}</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 font-bold focus:bg-white focus:border-black outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-transform active:scale-[0.98] shadow-lg shadow-black/20"
                >
                    {isLogin ? t.submitLogin : t.submitRegister}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm font-bold text-gray-400 hover:text-black transition-colors"
                >
                    {isLogin ? t.switchRegister : t.switchLogin}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};