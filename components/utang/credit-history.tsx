'use client';

import { useState, useEffect } from 'react';
import { Customer, CreditEntry } from '@/lib/db/idb';
import { X, ArrowUpRight, ArrowDownLeft, History, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreditHistoryProps {
  customer: Customer;
  getHistory: (id: string) => Promise<CreditEntry[]>;
  onClose: () => void;
}

export function CreditHistory({ customer, getHistory, onClose }: CreditHistoryProps) {
  const [history, setHistory] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (customer.id) {
        const data = await getHistory(customer.id);
        setHistory(data);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [customer.id, getHistory]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[80vh]"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-xl text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{customer.name}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Credit History</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin border-4 border-blue-200 border-t-blue-600 rounded-full w-12 h-12 mb-4" />
              <p className="text-gray-500 font-medium">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No transactions yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${entry.type === 'credit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {entry.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{entry.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.timestamp).toLocaleDateString('en-PH', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-black ${entry.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>
                    {entry.type === 'credit' ? '+' : '-'} ₱{Math.abs(entry.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Current Balance</span>
          <span className={`text-3xl font-black ${customer.totalUtang > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₱{customer.totalUtang.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
