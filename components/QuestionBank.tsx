import React, { useState } from 'react';
import { Question, Subject, Difficulty } from '../types';
import { Search, Filter, Trash2 } from 'lucide-react';

interface QuestionBankProps {
  questions: Question[];
  onDelete?: (id: string) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ questions, onDelete }) => {
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = questions.filter(q => {
    const matchesSubject = filterSubject === 'All' || q.subject === filterSubject;
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800">Question Bank ({filtered.length})</h2>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search questions..." 
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select 
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Question</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Subject</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Difficulty</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(q => (
              <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-4">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{q.text}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">Answer: {q.options[q.correctAnswerIndex]}</p>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {q.subject}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${q.difficulty === Difficulty.EASY ? 'bg-green-100 text-green-800' : 
                      q.difficulty === Difficulty.MEDIUM ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="p-4">
                  {onDelete && (
                     <button 
                       onClick={() => onDelete(q.id)}
                       className="text-slate-400 hover:text-red-600 transition-colors p-1"
                     >
                       <Trash2 size={16} />
                     </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No questions found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};