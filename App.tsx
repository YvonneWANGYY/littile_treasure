import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  BrainCircuit, 
  Plus, 
  TrendingUp,
  CreditCard,
  Repeat,
  Languages,
  Clock,
  CheckCircle2,
  Bell,
  LineChart,
  X,
  PiggyBank,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Cloud,
  LogOut,
  User as UserIcon,
  RefreshCw
} from 'lucide-react';
import { 
  Account, 
  Transaction, 
  Currency, 
  AccountType, 
  EXCHANGE_RATES, 
  TransactionType,
  RecurringRule,
  TransactionStatus,
  User
} from './types';
import { Card } from './components/ui/Card';
import { Logo } from './components/ui/Logo';
import { TransactionForm } from './components/TransactionForm';
import { InvestmentChat } from './components/InvestmentChat';
import { AuthScreen } from './components/AuthScreen';
import { getFinancialAdvice } from './services/geminiService';
import { TRANSLATIONS, Language } from './translations';

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', name: 'Wallet', type: AccountType.SAVINGS, currency: Currency.CNY, balance: 500, color: '#10B981' },
  { 
      id: '2', 
      name: 'Alipay Fund', 
      type: AccountType.INVESTMENT, 
      currency: Currency.CNY, 
      balance: 15200, 
      color: '#3B82F6', 
      lastCheckIn: new Date().toISOString(),
      holdings: [
          { name: 'China CSI 300', amount: 5000, dailyChange: 120 },
          { name: 'Gold ETF', amount: 10200, dailyChange: -50 }
      ]
  },
  { id: '3', name: 'Huabei', type: AccountType.CREDIT, currency: Currency.CNY, balance: -1200, color: '#F59E0B' }, 
  { id: '4', name: 'Chase Checking', type: AccountType.SAVINGS, currency: Currency.USD, balance: 2000, color: '#3B82F6' },
];

function Dashboard({ user, onLogout }: { user: User, onLogout: () => void }) {
  // --- State with User-Scoped Persistence ---
  
  // Helper to generate scoped keys
  const getStorageKey = (key: string) => `lt_${user.id}_${key}`;

  const [accounts, setAccounts] = useState<Account[]>(() => {
      const saved = localStorage.getItem(getStorageKey('accounts'));
      return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
      const saved = localStorage.getItem(getStorageKey('transactions'));
      return saved ? JSON.parse(saved) : [];
  });

  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(() => {
      const saved = localStorage.getItem(getStorageKey('recurringRules'));
      return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'advice'>('dashboard');
  const [baseCurrency, setBaseCurrency] = useState<Currency>(() => {
      return (localStorage.getItem(getStorageKey('baseCurrency')) as Currency) || Currency.CNY;
  });
  
  // Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  
  // Navigation State
  const [selectedInvestmentAccount, setSelectedInvestmentAccount] = useState<Account | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  const [language, setLanguage] = useState<Language>('zh'); 
  
  // Advice State
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [lastAdviceDate, setLastAdviceDate] = useState<string | null>(null);

  const t = TRANSLATIONS[language];

  // --- Persistence & Sync Effects ---
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
        firstRender.current = false;
        return;
    }
    setSyncStatus('syncing');
    
    // Simulate Network Delay
    const timeout = setTimeout(() => {
        localStorage.setItem(getStorageKey('accounts'), JSON.stringify(accounts));
        localStorage.setItem(getStorageKey('transactions'), JSON.stringify(transactions));
        localStorage.setItem(getStorageKey('recurringRules'), JSON.stringify(recurringRules));
        localStorage.setItem(getStorageKey('baseCurrency'), baseCurrency);
        setSyncStatus('synced');
        
        // Reset to idle after a bit
        setTimeout(() => setSyncStatus('idle'), 2000);
    }, 800);

    return () => clearTimeout(timeout);
  }, [accounts, transactions, recurringRules, baseCurrency, user.id]);


  // --- Derived State & Calculations ---

  const totalNetWorth = useMemo(() => {
    return accounts.reduce((acc, account) => {
      const val = account.balance * (EXCHANGE_RATES[account.currency] / EXCHANGE_RATES[baseCurrency]); 
      return acc + val;
    }, 0);
  }, [accounts, baseCurrency]);

  const pendingIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING)
      .reduce((acc, t) => acc + (t.amount * (EXCHANGE_RATES[baseCurrency] / EXCHANGE_RATES[t.currency])), 0);
  }, [transactions, baseCurrency]);

  const monthlyExpenses = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === TransactionType.EXPENSE && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, t) => acc + (t.amount * (EXCHANGE_RATES[baseCurrency] / EXCHANGE_RATES[t.currency])), 0);
  }, [transactions, baseCurrency]);

  const shouldShowAdviceReminder = useMemo(() => {
    if (!lastAdviceDate) return true;
    const diff = new Date().getTime() - new Date(lastAdviceDate).getTime();
    return diff > 7 * 24 * 60 * 60 * 1000; 
  }, [lastAdviceDate]);

  const needsInvestmentCheckIn = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return accounts.some(a => a.type === AccountType.INVESTMENT && (!a.lastCheckIn || !a.lastCheckIn.startsWith(today)));
  }, [accounts]);

  // Grouping Logic
  const accountGroups = useMemo(() => {
      const groups: Record<string, { type: AccountType; currency: Currency; balance: number; count: number; ids: string[] }> = {};
      
      accounts.forEach(acc => {
          const key = `${acc.currency}-${acc.type}`;
          if (!groups[key]) {
              groups[key] = { type: acc.type, currency: acc.currency, balance: 0, count: 0, ids: [] };
          }
          groups[key].balance += acc.balance;
          groups[key].count += 1;
          groups[key].ids.push(acc.id);
      });
      
      return Object.entries(groups).map(([key, data]) => ({ key, ...data }));
  }, [accounts]);

  // --- Handlers ---

  const handleAddTransaction = (data: Transaction) => {
    const newTx = { ...data, id: generateId() };
    setTransactions([newTx, ...transactions]);

    if (newTx.status === TransactionStatus.COMPLETED) {
       updateAccountBalance(newTx);
    }
  };

  const updateAccountBalance = (tx: Transaction) => {
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === tx.accountId) {
        let change = 0;
        if (tx.type === TransactionType.EXPENSE) change = -tx.amount;
        if (tx.type === TransactionType.INCOME) change = tx.amount;
        if (tx.type === TransactionType.TRANSFER) change = -tx.amount;
        return { ...acc, balance: acc.balance + change };
      }
      if (tx.type === TransactionType.TRANSFER && acc.id === tx.toAccountId) {
        const fromCurrency = tx.currency;
        const toCurrency = acc.currency;
        const rate = EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency]; 
        return { ...acc, balance: acc.balance + (tx.amount * rate) };
      }
      return acc;
    });
    setAccounts(updatedAccounts);
  };

  const markAsReceived = (tx: Transaction) => {
    if (confirm(t.common.confirmReceived)) {
        const updatedTransactions = transactions.map(t => 
            t.id === tx.id ? { ...t, status: TransactionStatus.COMPLETED, date: new Date().toISOString() } : t
        );
        setTransactions(updatedTransactions);
        updateAccountBalance({ ...tx, status: TransactionStatus.COMPLETED });
    }
  };

  const handleUpdateInvestmentAccount = (updatedAccount: Account) => {
      setAccounts(accounts.map(a => a.id === updatedAccount.id ? updatedAccount : a));
      setSelectedInvestmentAccount(updatedAccount); 
  };

  const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const newAccount: Account = {
          id: generateId(),
          name: formData.get('name') as string,
          type: formData.get('type') as AccountType,
          currency: formData.get('currency') as Currency,
          balance: parseFloat(formData.get('balance') as string) || 0,
          color: formData.get('color') as string,
          holdings: []
      };
      setAccounts([...accounts, newAccount]);
      setIsAccountModalOpen(false);
  };

  const handleGenerateAdvice = async () => {
    setLoadingAdvice(true);
    const adviceText = await getFinancialAdvice(transactions, accounts, baseCurrency, language);
    setAdvice(adviceText);
    setLastAdviceDate(new Date().toISOString());
    setLoadingAdvice(false);
  };

  const checkRecurring = () => {
    if (recurringRules.length === 0) {
      // Default rule for new users
      const insuranceRule: RecurringRule = {
        id: 'rec_1',
        name: 'Health Insurance',
        amount: 500,
        currency: Currency.CNY,
        category: 'Insurance',
        frequency: 'MONTHLY',
        accountId: accounts[0]?.id || '1',
        nextDueDate: new Date().toISOString()
      };
      setRecurringRules([insuranceRule]);
    }
  };

  useEffect(() => {
    checkRecurring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  // --- Render Sub-Components ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black text-white rounded-2xl p-6 shadow-xl transform transition-transform hover:scale-[1.02]">
          <p className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">{t.common.netWorth}</p>
          <h2 className="text-4xl font-light tracking-tight">{baseCurrency} {totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <div className="mt-8 flex gap-4 text-xs font-medium text-gray-500">
            <div>
                 <span className="block text-gray-400">{t.common.assets}</span>
                 <span className="text-white text-lg">{accounts.filter(a => a.balance > 0).length}</span>
            </div>
            <div className="w-px bg-gray-800"></div>
            <div>
                 <span className="block text-gray-400">{t.common.debts}</span>
                 <span className="text-white text-lg">{accounts.filter(a => a.balance < 0).length}</span>
            </div>
          </div>
        </div>

        {/* Pending Income Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transform transition-transform hover:scale-[1.02] relative overflow-hidden">
            <div className="absolute right-4 top-4 opacity-10">
                <Clock size={48} className="text-orange-600" />
            </div>
            <p className="text-orange-500 text-xs font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
                {t.common.totalPending}
            </p>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{baseCurrency} {pendingIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <div className="mt-6 text-xs text-gray-400 font-medium">
                {t.form.pendingHintIncome}
            </div>
        </div>

        {/* Investment Quick Access Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                    <p className="text-blue-600 text-xs font-bold uppercase tracking-widest">{t.common.investmentCheckIn}</p>
                    {needsInvestmentCheckIn && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </div>
                <p className="text-sm text-gray-600 mb-4">{t.common.checkInTip}</p>
                {accounts.filter(a => a.type === AccountType.INVESTMENT).slice(0, 2).map(acc => (
                     <button 
                        key={acc.id}
                        onClick={() => setSelectedInvestmentAccount(acc)}
                        className="w-full py-2 bg-white border border-blue-200 text-blue-800 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors mb-2 text-left px-4 flex justify-between items-center"
                     >
                        <span>{acc.name}</span>
                        <ArrowUpRight size={14} />
                     </button>
                ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card title={t.common.recentTransactions} className="h-full hover:shadow-md transition-shadow">
          <div className="space-y-4">
            {transactions.length === 0 ? <p className="text-gray-400 text-sm italic">{t.common.noTransactions}</p> : 
              transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full shadow-sm relative ${tx.type === TransactionType.EXPENSE ? 'bg-gray-100 text-gray-600' : 'bg-black text-white'}`}>
                      {tx.type === TransactionType.EXPENSE ? <TrendingUp size={16} /> : <Wallet size={16} />}
                      {tx.status === TransactionStatus.PENDING && (
                         <div className="absolute -top-1 -right-1 bg-orange-500 border-2 border-white w-2.5 h-2.5 rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <p className="font-bold text-gray-800 text-sm">{tx.category}</p>
                         {tx.status === TransactionStatus.PENDING && (
                             <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{t.common.totalPending}</span>
                         )}
                      </div>
                      <div className="flex gap-2 text-xs text-gray-400 font-medium">
                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                        {tx.expectedDate && tx.status === TransactionStatus.PENDING && (
                            <span className="text-orange-400">→ {new Date(tx.expectedDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block ${tx.type === TransactionType.EXPENSE ? 'text-gray-900' : 'text-emerald-600'} ${tx.status === TransactionStatus.PENDING ? 'opacity-40' : ''}`}>
                        {tx.type === TransactionType.EXPENSE ? '-' : '+'}{tx.amount} <span className="text-xs text-gray-400 font-normal">{tx.currency}</span>
                    </span>
                    {tx.tags.length > 0 && <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{tx.tags[0]}</span>}
                  </div>
                </div>
              ))
            }
          </div>
        </Card>

        {/* Assets Distribution (Grouped by Category) */}
        <Card title={t.common.accountBalances} className="h-full hover:shadow-md transition-shadow">
           <div className="space-y-4">
             {accountGroups.length === 0 ? <p className="text-gray-400 text-sm">No accounts yet.</p> : 
               accountGroups.map(group => (
               <div 
                  key={group.key} 
                  className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => { setActiveTab('accounts'); setSelectedGroupKey(group.key); }}
               >
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                        {group.type === AccountType.INVESTMENT ? <LineChart size={18} /> : 
                         group.type === AccountType.CREDIT ? <CreditCard size={18} /> : 
                         <PiggyBank size={18} />}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-gray-800">{t.accountType[group.type]}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{group.count} Accounts</span>
                    </div>
                 </div>
                 <div className="text-right">
                   <span className={`block text-sm font-bold ${group.balance < 0 ? 'text-rose-500' : 'text-gray-800'}`}>
                     {group.balance.toLocaleString()} <span className="text-xs font-normal text-gray-500">{group.currency}</span>
                   </span>
                 </div>
                 <ChevronRight size={16} className="text-gray-300 group-hover:text-black transition-colors" />
               </div>
             ))}
           </div>
        </Card>
      </div>
    </div>
  );

  const renderAdvice = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-2">
      <div className="bg-black rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <BrainCircuit size={120} />
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <BrainCircuit className="text-gray-400" /> {t.nav.advice}
            </h2>
            <p className="text-gray-400 max-w-xl text-sm leading-relaxed">
              {language === 'zh' 
                ? '基于您的多币种资产、消费习惯和长期囤货行为，为您提供个性化财务建议。' 
                : 'Get personalized insights based on your spending habits, multi-currency assets, and long-term stockpiling behavior.'}
            </p>
          </div>
          <button 
            onClick={handleGenerateAdvice}
            disabled={loadingAdvice}
            className="bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
          >
            {loadingAdvice ? (language === 'zh' ? '分析中...' : 'Analyzing...') : (language === 'zh' ? '生成分析报告' : 'Generate Analysis')}
          </button>
        </div>
      </div>

      {advice && (
        <Card className="animate-in slide-in-from-bottom-4 duration-500 border-t-4 border-black">
           <div className="prose prose-slate max-w-none text-gray-700 leading-7">
             {advice.split('\n').map((line, i) => {
               if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-4 mt-6 text-black">{line.replace('# ', '')}</h1>
               if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mb-3 mt-5 text-gray-800 flex items-center gap-2">{line.replace('## ', '')}</h2>
               if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-2 marker:text-gray-400">{line.replace('- ', '')}</li>
               return <p key={i} className="mb-3">{line}</p>
             })}
           </div>
        </Card>
      )}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t.nav.transactions}</h2>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 text-sm font-medium shadow-sm transition-all">
                {t.common.filter}
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">{t.form.date}</th>
                        <th className="px-6 py-4">{t.form.category}</th>
                        <th className="px-6 py-4">{t.form.note}</th>
                        <th className="px-6 py-4">{t.form.account}</th>
                        <th className="px-6 py-4 text-right">{t.form.amount}</th>
                        <th className="px-6 py-4 text-center"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                <div>{new Date(tx.date).toLocaleDateString()}</div>
                                {tx.status === TransactionStatus.PENDING && tx.expectedDate && (
                                    <div className="text-[10px] text-orange-500 font-bold mt-1">Expected: {new Date(tx.expectedDate).toLocaleDateString()}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-800 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${tx.type === TransactionType.EXPENSE ? 'bg-black' : 'bg-emerald-500'}`}></span>
                                    {tx.category}
                                </div>
                                {tx.tags.length > 0 && <div className="text-[10px] text-gray-400 pl-3.5">{tx.tags.join(', ')}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                                {tx.note}
                                {tx.isAmortized && <div className="text-indigo-500 text-xs mt-1 font-medium bg-indigo-50 w-fit px-2 py-0.5 rounded">Stockpile ({tx.amortizationMonths}m)</div>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                                {accounts.find(a => a.id === tx.accountId)?.name}
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold text-right tabular-nums ${tx.type === TransactionType.EXPENSE ? 'text-gray-900' : tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-gray-800'} ${tx.status === TransactionStatus.PENDING ? 'opacity-40' : ''}`}>
                                {tx.type === TransactionType.EXPENSE ? '-' : tx.type === TransactionType.INCOME ? '+' : ''}
                                {tx.amount.toFixed(2)} <span className="text-xs text-gray-400">{tx.currency}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                {tx.status === TransactionStatus.PENDING && (
                                    <button 
                                        onClick={() => markAsReceived(tx)}
                                        className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-1 ml-auto"
                                    >
                                        <CheckCircle2 size={12} /> {t.common.markReceived}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {transactions.length === 0 && <div className="p-12 text-center text-gray-400 italic">{t.common.noTransactions}</div>}
      </div>
    </div>
  );

  const renderAccounts = () => {
    // If a group is selected, show the Drill-down view
    if (selectedGroupKey) {
        const [currency, type] = selectedGroupKey.split('-');
        const groupAccounts = accounts.filter(a => a.currency === currency && a.type === type);
        
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 mb-6">
                    <button 
                        onClick={() => setSelectedGroupKey(null)}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            {currency} {t.accountType[type as AccountType]}
                        </h2>
                        <p className="text-sm text-gray-500">Account Group</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupAccounts.map(acc => (
                        <div key={acc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
                             <div className="flex justify-between items-start mb-6">
                                <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-white group-hover:shadow-sm transition-all text-gray-700">
                                    {acc.type === AccountType.CREDIT ? <CreditCard size={24} /> : 
                                     acc.type === AccountType.INVESTMENT ? <LineChart size={24} /> : 
                                     <Wallet size={24} />}
                                </div>
                                <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-500 uppercase tracking-wide">{acc.currency}</span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-1">{acc.name}</h3>
                            <p className={`text-3xl font-bold tracking-tight ${acc.balance < 0 ? 'text-rose-500' : 'text-gray-900'}`}>
                                 <span className="text-lg align-top mr-1 text-gray-400 font-medium">{acc.currency}</span>{acc.balance.toLocaleString()}
                            </p>
                            
                            {acc.type === AccountType.INVESTMENT && (
                                 <div className="mt-4 pt-4 border-t border-gray-50">
                                    <button 
                                        onClick={() => setSelectedInvestmentAccount(acc)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 w-full"
                                    >
                                        <Clock size={12} /> {t.common.investmentCheckIn}
                                    </button>
                                    <p className="text-[10px] text-gray-400 mt-1">Last update: {acc.lastCheckIn ? new Date(acc.lastCheckIn).toLocaleDateString() : 'Never'}</p>
                                 </div>
                            )}
                      </div>
                    ))}
                    
                    {/* Add Account Card for this group context */}
                     <button 
                        onClick={() => setIsAccountModalOpen(true)}
                        className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black transition-all min-h-[200px]"
                     >
                        <Plus size={32} strokeWidth={1.5} className="mb-2" />
                        <span className="font-bold text-sm">Add {currency} {type} Account</span>
                     </button>
                </div>
            </div>
        );
    }

    // Default View: Show Account Groups
    return (
      <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">{t.nav.accounts}</h2>
              <button 
                onClick={() => setIsAccountModalOpen(true)}
                className="text-white text-sm font-bold bg-black px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
               >
                  <Plus size={16} /> {t.common.addAccount}
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accountGroups.map(group => (
                  <div 
                    key={group.key} 
                    onClick={() => setSelectedGroupKey(group.key)}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
                  >
                      <div className="flex justify-between items-start mb-4">
                            <div className="p-3.5 rounded-xl bg-gray-50 group-hover:bg-black group-hover:text-white transition-all text-gray-700">
                                {group.type === AccountType.CREDIT ? <CreditCard size={24} /> : 
                                 group.type === AccountType.INVESTMENT ? <LineChart size={24} /> : 
                                 group.type === AccountType.SAVINGS ? <PiggyBank size={24} /> : 
                                 <FolderOpen size={24} />}
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                {group.count} Accounts
                                <ChevronRight size={10} />
                            </span>
                        </div>

                        <div className="mb-2">
                             <h3 className="text-lg font-bold text-gray-800">{t.accountType[group.type]}</h3>
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group.currency} Total</p>
                        </div>
                        
                        <p className={`text-3xl font-bold tracking-tight ${group.balance < 0 ? 'text-rose-500' : 'text-gray-900'}`}>
                             <span className="text-lg align-top mr-1 text-gray-400 font-medium">{group.currency}</span>{group.balance.toLocaleString()}
                        </p>
                        
                        <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-black/10 group-hover:bg-black/80 transition-all w-2/3" />
                        </div>
                  </div>
              ))}
          </div>
          
          <Card title={t.common.recurringPayments}>
              <div className="space-y-4">
                  {recurringRules.map(rule => (
                      <div key={rule.id} className="flex justify-between items-center p-4 border rounded-xl hover:border-gray-300 transition-all cursor-pointer group">
                          <div className="flex items-center gap-4">
                              <div className="bg-gray-100 p-2.5 rounded-full text-gray-600 group-hover:bg-black group-hover:text-white transition-colors">
                                  <Repeat size={20} />
                              </div>
                              <div>
                                  <p className="font-bold text-gray-800">{rule.name}</p>
                                  <p className="text-xs text-gray-500 font-medium">Every {rule.frequency.toLowerCase()} • {rule.category}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="font-bold text-gray-800 text-lg">{rule.amount} <span className="text-sm font-normal text-gray-500">{rule.currency}</span></p>
                              <button 
                                onClick={() => {
                                    handleAddTransaction({
                                        id: '', 
                                        date: new Date().toISOString(),
                                        amount: rule.amount,
                                        currency: rule.currency,
                                        type: TransactionType.EXPENSE,
                                        category: rule.category,
                                        tags: ['Recurring'],
                                        accountId: rule.accountId,
                                        note: `Auto-generated: ${rule.name}`,
                                        status: TransactionStatus.COMPLETED,
                                        isAmortized: false,
                                        amortizationMonths: 0,
                                        isRecurring: true
                                    });
                                    alert(`${t.common.save} - ${rule.name}`);
                                }}
                                className="text-xs text-black hover:underline font-bold mt-1"
                              >
                                  {t.common.recordPayment}
                              </button>
                          </div>
                      </div>
                  ))}
                  <button onClick={() => {
                      const name = prompt("Name of expense (e.g. Rent)?");
                      if(name) {
                         const amount = prompt("Amount?");
                         if (amount) {
                             setRecurringRules([...recurringRules, {
                                 id: generateId(),
                                 name,
                                 amount: parseFloat(amount),
                                 currency: baseCurrency,
                                 category: 'Housing',
                                 frequency: 'MONTHLY',
                                 nextDueDate: new Date().toISOString(),
                                 accountId: accounts[0].id
                             }]);
                         }
                      }
                  }} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-bold hover:border-gray-400 hover:text-gray-600 transition-all">
                      + {t.common.addExpense}
                  </button>
              </div>
          </Card>
      </div>
  );};

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-[#111]">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col fixed h-full z-10 shadow-[2px_0_20px_rgba(0,0,0,0.01)]">
        <div className="p-8 border-b border-gray-50">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
                <Logo className="w-8 h-8 text-black" />
                {t.appTitle}
            </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            {[
                { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
                { id: 'transactions', label: t.nav.transactions, icon: Receipt },
                { id: 'accounts', label: t.nav.accounts, icon: Wallet },
                { id: 'advice', label: t.nav.advice, icon: BrainCircuit, badge: shouldShowAdviceReminder },
            ].map(item => (
                <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as any); setSelectedGroupKey(null); }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold relative ${
                        activeTab === item.id 
                        ? 'bg-black text-white shadow-lg shadow-black/10' 
                        : 'text-gray-400 hover:bg-gray-50 hover:text-black'
                    }`}
                >
                    <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-gray-400'} />
                    {item.label}
                    {item.badge && <div className="absolute right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                </button>
            ))}
        </nav>

        <div className="p-6 border-t border-gray-50 space-y-4">
             {/* Sync Status */}
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 px-2">
                {syncStatus === 'syncing' && <RefreshCw size={12} className="animate-spin" />}
                {syncStatus === 'synced' && <Cloud size={12} />}
                <span>
                    {syncStatus === 'syncing' ? t.sync.syncing : t.sync.synced}
                </span>
            </div>

             {/* Language Toggle */}
            <button 
                onClick={toggleLanguage}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors font-medium"
            >
                <div className="flex items-center gap-2">
                    <Languages size={16} />
                    <span>Language</span>
                </div>
                <span className="font-bold text-black bg-gray-100 px-2 py-0.5 rounded text-xs">{language.toUpperCase()}</span>
            </button>

            {/* Profile / Logout */}
            <div className="pt-2 border-t border-gray-100 mt-2">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate">{user.username}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 font-bold hover:bg-rose-50 rounded-lg transition-colors"
                >
                    <LogOut size={16} />
                    {t.auth.logout}
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-10 overflow-y-auto pb-24">
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold flex items-center gap-2">
                 <Logo className="w-8 h-8" />
                {t.appTitle}
            </h1>
             <div className="flex gap-2">
                <button className="p-2 bg-white rounded-lg shadow-sm border text-gray-600" onClick={toggleLanguage}>
                    {language.toUpperCase()}
                </button>
                <button className="p-2 bg-white rounded-lg shadow-sm border text-black relative" onClick={() => setActiveTab('dashboard')}>
                    <LayoutDashboard size={20} />
                    {shouldShowAdviceReminder && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                </button>
            </div>
        </div>

        {shouldShowAdviceReminder && (
            <div className="mb-6 bg-black text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-lg shadow-black/5 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                    <Bell size={18} className="text-gray-300" />
                    <span className="text-sm font-bold">{t.common.adviceReminder}</span>
                </div>
                <button 
                    onClick={() => setActiveTab('advice')}
                    className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                >
                    View
                </button>
            </div>
        )}

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'accounts' && renderAccounts()}
        {activeTab === 'advice' && renderAdvice()}
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-8 right-8 bg-black hover:bg-gray-800 text-white w-16 h-16 rounded-full shadow-2xl shadow-black/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={32} strokeWidth={2} />
      </button>

      {/* Transaction Modal */}
      {isFormOpen && (
        <TransactionForm 
            accounts={accounts} 
            onSave={handleAddTransaction} 
            onClose={() => setIsFormOpen(false)} 
            language={language}
        />
      )}

      {/* Create Account Modal */}
      {isAccountModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">{t.common.createAccount}</h2>
                      <button onClick={() => setIsAccountModalOpen(false)}><X className="text-gray-400" /></button>
                  </div>
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.common.accountName}</label>
                          <input name="name" required className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-black" placeholder="e.g. Robinhood" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.common.accountType}</label>
                          <select name="type" className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-black bg-white">
                              {Object.values(AccountType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.form.currency}</label>
                            <select name="currency" className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-black bg-white">
                                {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                         <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.common.accountColor}</label>
                            <input type="color" name="color" defaultValue="#000000" className="w-full h-[50px] rounded-xl cursor-pointer" />
                        </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.common.initialBalance}</label>
                          <input name="balance" type="number" step="0.01" defaultValue="0" className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:border-black" />
                      </div>
                      <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors mt-2">{t.common.save}</button>
                  </form>
              </div>
          </div>
      )}

      {/* Investment Detail View */}
      {selectedInvestmentAccount && (
          <InvestmentChat 
             account={selectedInvestmentAccount}
             baseCurrency={baseCurrency}
             language={language}
             onClose={() => setSelectedInvestmentAccount(null)}
             onUpdateAccount={handleUpdateInvestmentAccount}
          />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lt_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u: User) => {
    localStorage.setItem('lt_current_user', JSON.stringify(u));
    setUser(u);
  }

  const handleLogout = () => {
    localStorage.removeItem('lt_current_user');
    setUser(null);
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  
  return <Dashboard key={user.id} user={user} onLogout={handleLogout} />;
}
