import React, { useState, useMemo, useEffect } from 'react';
import { Account, Currency, TransactionType, TransactionStatus, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { X, Calendar, Check, Clock, Tag } from 'lucide-react';
import { TRANSLATIONS, Language } from '../translations';

interface TransactionFormProps {
  accounts: Account[];
  onSave: (data: any) => void;
  onClose: () => void;
  language: Language;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ accounts, onSave, onClose, language }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(Currency.CNY);
  
  // Category State
  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [tags, setTags] = useState<string>('');

  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  
  // Dates
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // Transaction/Earning Date
  const [expectedDate, setExpectedDate] = useState<string>(''); // Arrival/Settlement Date

  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.COMPLETED);
  
  // Amortization (Long-term)
  const [isAmortized, setIsAmortized] = useState(false);
  const [amortizationMonths, setAmortizationMonths] = useState<number>(12);

  const t = TRANSLATIONS[language];

  // Auto-select Account based on Currency Logic
  useEffect(() => {
    // Find the first account that matches the selected currency
    // Prioritize accounts that are NOT investment or loan for default transaction usage
    const match = accounts.find(a => 
        a.currency === currency && 
        a.type !== 'INVESTMENT' && 
        a.type !== 'LOAN'
    ) || accounts.find(a => a.currency === currency);

    if (match) {
        setAccountId(match.id);
    }
  }, [currency, accounts]);

  // Set default category when type changes
  useMemo(() => {
    if (type === TransactionType.EXPENSE) {
      setCategory(EXPENSE_CATEGORIES[0]);
      setIsCustomCategory(false);
    } else if (type === TransactionType.INCOME) {
      setCategory(INCOME_CATEGORIES[0]);
      setIsCustomCategory(false);
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCategory = isCustomCategory ? customCategory : category;
    const finalTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);

    onSave({
      type,
      amount: parseFloat(amount),
      currency,
      category: finalCategory,
      tags: finalTags,
      accountId,
      toAccountId: type === TransactionType.TRANSFER ? toAccountId : undefined,
      date: new Date(date).toISOString(),
      expectedDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
      note,
      status,
      isAmortized,
      amortizationMonths: isAmortized ? amortizationMonths : 0
    });
    onClose();
  };

  const currentCategories = type === TransactionType.EXPENSE ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">{t.form.newTransaction}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Type Toggle */}
          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            {Object.values(TransactionType).map((val) => (
              <button
                key={val}
                type="button"
                className={`py-2.5 text-sm font-bold rounded-lg transition-all ${
                  type === val 
                    ? 'bg-white shadow-sm text-black ring-1 ring-black/5' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                onClick={() => setType(val)}
              >
                {t.type[val]}
              </button>
            ))}
          </div>

          {/* Amount & Currency */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.form.amount}</label>
              <div className="relative">
                 <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-2xl font-bold focus:border-black focus:ring-0 outline-none text-gray-800 placeholder-gray-200 transition-colors"
                    placeholder="0.00"
                    step="0.01"
                    autoFocus
                 />
              </div>
            </div>
            <div className="w-1/3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.form.currency}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full border-2 border-gray-100 rounded-xl px-3 py-3.5 bg-white font-semibold focus:border-black outline-none text-gray-800"
              >
                {Object.values(Currency).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status (Pending/Completed) */}
          {(type === TransactionType.INCOME || type === TransactionType.EXPENSE) && (
             <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setStatus(status === TransactionStatus.PENDING ? TransactionStatus.COMPLETED : TransactionStatus.PENDING)}>
                   <div className="flex items-center gap-2">
                      <Clock size={16} className={status === TransactionStatus.PENDING ? "text-orange-500" : "text-gray-400"} />
                      <label className={`text-sm font-bold cursor-pointer ${status === TransactionStatus.PENDING ? "text-orange-800" : "text-gray-600"}`}>
                          {status === TransactionStatus.PENDING ? t.form.statusPending : t.form.statusCompleted}
                      </label>
                   </div>
                   <div className={`w-10 h-6 rounded-full p-1 transition-colors ${status === TransactionStatus.PENDING ? 'bg-orange-400' : 'bg-gray-300'}`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${status === TransactionStatus.PENDING ? 'translate-x-4' : ''}`}></div>
                   </div>
                </div>
                {status === TransactionStatus.PENDING && (
                    <p className="text-[10px] text-orange-600 mt-2 pl-6">
                        {type === TransactionType.INCOME ? t.form.pendingHintIncome : t.form.pendingHintExpense}
                    </p>
                )}
             </div>
          )}

          {/* Category */}
          {type !== TransactionType.TRANSFER && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.form.category}</label>
              <div className="flex gap-2">
                  <div className="relative flex-1">
                    {!isCustomCategory ? (
                        <select
                            value={category}
                            onChange={(e) => {
                                if (e.target.value === 'CUSTOM') {
                                    setIsCustomCategory(true);
                                } else {
                                    setCategory(e.target.value);
                                }
                            }}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-white font-medium focus:border-black outline-none appearance-none text-gray-700"
                        >
                            {currentCategories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="CUSTOM">+ {t.form.customCategory}</option>
                        </select>
                    ) : (
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                placeholder="Type Category Name"
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-white font-medium focus:border-black outline-none text-gray-700"
                            />
                            <button 
                                type="button" 
                                onClick={() => setIsCustomCategory(false)}
                                className="px-3 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    {!isCustomCategory && <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>}
                  </div>
              </div>
            </div>
          )}
          
          {/* Custom Tags */}
          <div>
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.form.tags}</label>
             <div className="relative">
                 <Tag className="absolute left-4 top-3.5 text-gray-400" size={16} />
                 <input 
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. Travel, Gift, 2024"
                    className="w-full border-2 border-gray-100 rounded-xl pl-10 pr-4 py-3 bg-white font-medium focus:border-black outline-none text-gray-700"
                 />
             </div>
          </div>

          {/* Accounts */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {type === TransactionType.TRANSFER ? t.form.fromAccount : t.form.account}
            </label>
            <div className="relative">
                <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-white font-medium focus:border-black outline-none appearance-none text-gray-700"
                >
                <option value="" disabled>Select Account</option>
                {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                    {a.name} ({a.currency}) - {a.type}
                    </option>
                ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
            </div>
          </div>

          {type === TransactionType.TRANSFER && (
             <div>
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.form.toAccount}</label>
             <div className="relative">
                <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-white font-medium focus:border-black outline-none appearance-none text-gray-700"
                >
                <option value="">Select Account</option>
                {accounts.filter(a => a.id !== accountId).map((a) => (
                    <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                    </option>
                ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
             </div>
           </div>
          )}

          {/* Date Logic */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {type === TransactionType.INCOME ? t.form.earningDate : t.form.purchaseDate}
                </label>
                <div className="relative">
                <Calendar className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-xl pl-10 pr-2 py-3 bg-white font-medium focus:border-black outline-none text-gray-700 text-sm"
                />
                </div>
            </div>
            
            {status === TransactionStatus.PENDING && (
                <div className="animate-in fade-in">
                    <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                        {type === TransactionType.INCOME ? t.form.expectedDate : t.form.settlementDate}
                    </label>
                    <div className="relative">
                    <Clock className="absolute left-4 top-3.5 text-orange-400" size={18} />
                    <input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full border-2 border-orange-100 rounded-xl pl-10 pr-2 py-3 bg-orange-50/30 font-medium focus:border-orange-300 outline-none text-gray-700 text-sm"
                    />
                    </div>
                </div>
            )}
          </div>

          {/* Amortization Feature (Rule 4) */}
          {type === TransactionType.EXPENSE && (
            <div className="border-2 border-indigo-100 bg-indigo-50/50 rounded-xl p-4 transition-all">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsAmortized(!isAmortized)}>
                <label className="text-sm font-bold text-indigo-900 flex items-center gap-2 cursor-pointer">
                  {t.form.longTermQuestion}
                </label>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isAmortized ? 'bg-indigo-600 border-indigo-600' : 'border-indigo-200 bg-white'}`}>
                    {isAmortized && <Check size={14} className="text-white" />}
                </div>
              </div>
              {isAmortized && (
                <div className="mt-3 animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-indigo-700 mb-1.5">{t.form.spreadCost}:</label>
                  <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="2"
                        max="24"
                        value={amortizationMonths}
                        onChange={(e) => setAmortizationMonths(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="font-bold text-indigo-700 w-8 text-right">{amortizationMonths}</span>
                  </div>
                  <p className="text-[10px] font-medium text-indigo-500 mt-2 leading-tight">
                    {t.form.stockpileHint}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.form.note}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-white font-medium focus:border-black outline-none resize-none text-gray-700"
              rows={2}
              placeholder={t.form.placeholderNote}
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
          >
            {t.form.saveButton}
          </button>
        </form>
      </div>
    </div>
  );
};