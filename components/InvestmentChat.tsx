import React, { useState, useRef } from 'react';
import { Account, Currency, InvestmentHolding } from '../types';
import { processInvestmentChat } from '../services/geminiService';
import { Send, Image, Loader2, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { TRANSLATIONS, Language } from '../translations';

interface InvestmentChatProps {
    account: Account;
    onUpdateAccount: (updatedAccount: Account) => void;
    onClose: () => void;
    baseCurrency: Currency;
    language: Language;
}

export const InvestmentChat: React.FC<InvestmentChatProps> = ({ account, onUpdateAccount, onClose, baseCurrency, language }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, image?: string }[]>([
        { role: 'ai', content: language === 'zh' ? `欢迎来到 ${account.name} 理财助手！我可以帮您更新持仓或分析理财产品。您可以发文字告诉我买了什么，或者直接上传理财软件的截图。` : `Welcome to ${account.name} Assistant! I can help track your portfolio. Tell me what you bought or upload a screenshot.` }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSendMessage = async (text: string, imageBase64: string | null) => {
        if (!text && !imageBase64) return;

        const newMessage = { role: 'user' as const, content: text, image: imageBase64 || undefined };
        setMessages(prev => [...prev, newMessage]);
        setInputValue('');
        setIsLoading(true);

        const result = await processInvestmentChat(
            account.holdings || [],
            text,
            imageBase64,
            baseCurrency,
            language
        );

        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'ai', content: result.text }]);

        if (result.updatedHoldings) {
            // Calculate new balance based on holdings sum
            const newBalance = result.updatedHoldings.reduce((sum, h) => sum + h.amount, 0);
            onUpdateAccount({
                ...account,
                holdings: result.updatedHoldings,
                balance: newBalance,
                lastCheckIn: new Date().toISOString()
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleSendMessage("Analyzing uploaded portfolio screenshot...", reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const holdings = account.holdings || [];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
                {/* Left Panel: Portfolio View */}
                <div className="w-full md:w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                             <h2 className="text-xl font-bold text-gray-800">{account.name}</h2>
                             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{account.currency} Portfolio</p>
                        </div>
                        <div className="bg-white px-3 py-1 rounded-lg border shadow-sm">
                            <span className="text-lg font-bold">{account.balance.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {holdings.length === 0 ? (
                            <div className="text-center text-gray-400 mt-10">
                                <TrendingUp size={48} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No holdings yet.</p>
                                <p className="text-xs">Tell the AI what you bought!</p>
                            </div>
                        ) : (
                            holdings.map((h, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-800 text-sm line-clamp-1">{h.name}</span>
                                        {h.quantity && <span className="text-xs text-gray-400">{h.quantity} units</span>}
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-bold text-gray-900">{h.amount.toLocaleString()}</span>
                                        {h.dailyChange !== undefined && (
                                            <div className={`flex items-center text-xs font-bold ${h.dailyChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {h.dailyChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                {Math.abs(h.dailyChange)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Chat Interface */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-4 border-b flex justify-between items-center">
                         <h3 className="font-bold flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Investment Assistant
                         </h3>
                         <button onClick={onClose} className="text-gray-400 hover:text-black font-bold text-sm">Close</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-4 ${m.role === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                    {m.image && (
                                        <img src={m.image} alt="User Upload" className="mb-3 rounded-lg max-h-48 border border-white/20" />
                                    )}
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-50 rounded-2xl rounded-bl-none p-4 flex items-center gap-2 text-gray-500 text-sm">
                                    <Loader2 className="animate-spin" size={16} />
                                    Analyzing financial data...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-gray-50">
                        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border focus-within:ring-2 ring-black transition-all">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileChange}
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Image size={20} />
                            </button>
                            <input 
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue, null)}
                                placeholder={language === 'zh' ? "输入交易信息或上传截图..." : "Type transaction info or upload screenshot..."}
                                className="flex-1 outline-none text-sm font-medium"
                            />
                            <button 
                                onClick={() => handleSendMessage(inputValue, null)}
                                disabled={!inputValue.trim()}
                                className="p-2 bg-black text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};