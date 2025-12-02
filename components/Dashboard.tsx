import React, { useMemo } from 'react';
import { AppState, Subject } from '../types';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  LineChart, Line, Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Legend 
} from 'recharts';
import { AlertCircle, CheckCircle, TrendingUp, BookOpen, Upload, Activity, Clock, Zap } from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onUploadClick: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const PIE_COLORS = ['#10b981', '#ef4444', '#e2e8f0']; // Correct, Wrong, Unattempted

export const Dashboard: React.FC<DashboardProps> = ({ state, onUploadClick }) => {
  
  const stats = useMemo(() => {
    const totalQuestions = state.questions.length;
    const totalAttempts = state.attempts.length;
    const correctAttempts = state.attempts.filter(a => a.isCorrect).length;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    
    // Average Time per Question
    const avgTime = totalAttempts > 0 
      ? Math.round(state.attempts.reduce((acc, curr) => acc + curr.timeTaken, 0) / totalAttempts) 
      : 0;

    // Current Streak (consecutive correct answers at the end of the array)
    let streak = 0;
    for (let i = state.attempts.length - 1; i >= 0; i--) {
      if (state.attempts[i].isCorrect) streak++;
      else break;
    }

    // --- Data for Charts ---

    // 1. Subject Proficiency (Radar Data)
    const subjectStats: Record<string, { total: number; correct: number }> = {};
    Object.values(Subject).forEach(s => { subjectStats[s] = { total: 0, correct: 0 }; });

    state.attempts.forEach(a => {
      const q = state.questions.find(q => q.id === a.questionId);
      if (q && subjectStats[q.subject]) {
        subjectStats[q.subject].total += 1;
        if (a.isCorrect) subjectStats[q.subject].correct += 1;
      }
    });

    const radarData = Object.keys(subjectStats).map(subject => ({
      subject,
      score: subjectStats[subject].total > 0 
        ? Math.round((subjectStats[subject].correct / subjectStats[subject].total) * 100) 
        : 0,
      fullMark: 100
    }));

    // 2. Accuracy Trend (Line Data - grouped by every 5 attempts for smoothing)
    const trendData = [];
    let chunkSum = 0;
    let chunkCount = 0;
    const chunkSize = 5;
    
    state.attempts.forEach((a, index) => {
      chunkSum += a.isCorrect ? 1 : 0;
      chunkCount++;
      if (chunkCount === chunkSize || index === state.attempts.length - 1) {
        trendData.push({
          attempt: index + 1,
          accuracy: Math.round((chunkSum / chunkCount) * 100)
        });
        chunkSum = 0;
        chunkCount = 0;
      }
    });

    // 3. Question Distribution (Pie Data)
    const uniqueAttemptedIds = new Set(state.attempts.map(a => a.questionId));
    const unattemptedCount = Math.max(0, totalQuestions - uniqueAttemptedIds.size);
    // Note: This logic counts total correct/wrong attempts, not unique questions correct/wrong status.
    // For a cleaner pie chart, let's use unique questions status
    let uniqueCorrect = 0;
    let uniqueWrong = 0;
    
    uniqueAttemptedIds.forEach(id => {
       const attemptsForQ = state.attempts.filter(a => a.questionId === id);
       // Consider it "mastered" if the last attempt was correct
       const lastAttempt = attemptsForQ[attemptsForQ.length - 1];
       if (lastAttempt.isCorrect) uniqueCorrect++;
       else uniqueWrong++;
    });

    const pieData = [
      { name: 'Mastered', value: uniqueCorrect },
      { name: 'Needs Review', value: uniqueWrong },
      { name: 'Unseen', value: unattemptedCount }
    ];

    // Weakest Subject
    const weakestSubject = radarData
      .filter(d => subjectStats[d.subject].total > 0)
      .sort((a, b) => a.score - b.score)[0];

    return { 
      totalQuestions, 
      totalAttempts, 
      accuracy, 
      avgTime, 
      streak, 
      radarData, 
      trendData, 
      pieData, 
      weakestSubject 
    };
  }, [state.attempts, state.questions]);

  if (state.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center space-y-8 animate-fade-in">
         <div className="p-8 bg-indigo-50 rounded-full shadow-inner ring-4 ring-indigo-50/50">
            <Upload size={64} className="text-indigo-600" />
         </div>
         <div className="max-w-lg">
           <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome to AI Prep!</h2>
           <p className="text-slate-500 text-lg">
             Your intelligent question bank is currently empty. Upload your study materials (Markdown/Text) to let the AI agent build your personalized practice set.
           </p>
         </div>
         <button 
           onClick={onUploadClick} 
           className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 transform hover:-translate-y-1"
         >
           Upload Documents
         </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<BookOpen size={24} />} 
          label="Total Questions" 
          value={stats.totalQuestions.toString()} 
          subValue={`${stats.pieData[2].value} unseen`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard 
          icon={<Activity size={24} />} 
          label="Accuracy Rate" 
          value={`${stats.accuracy}%`} 
          subValue={`${stats.totalAttempts} total attempts`}
          color={stats.accuracy >= 70 ? "bg-emerald-50 text-emerald-600" : "bg-yellow-50 text-yellow-600"}
        />
        <StatCard 
          icon={<Clock size={24} />} 
          label="Avg. Time / Q" 
          value={`${stats.avgTime}s`} 
          subValue="Target: < 45s"
          color="bg-purple-50 text-purple-600"
        />
        <StatCard 
          icon={<Zap size={24} />} 
          label="Current Streak" 
          value={stats.streak.toString()} 
          subValue="Consecutive correct"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart: Accuracy Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Performance Trend</h3>
              <p className="text-sm text-slate-500">Your accuracy over recent practice sessions</p>
            </div>
            <TrendingUp className="text-slate-300" />
          </div>
          <div className="h-[300px]">
            {stats.trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="attempt" stroke="#94a3b8" tick={{fontSize: 12}} />
                  <YAxis stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    dot={{ fill: '#6366f1', strokeWidth: 2 }} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message="Complete more practice sessions to see your trend line." />
            )}
          </div>
        </div>

        {/* Radar Chart: Subject Proficiency */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Subject Proficiency</h3>
          <p className="text-sm text-slate-500 mb-6">Skill balance across topics</p>
          <div className="h-[300px]">
             {stats.totalAttempts > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Accuracy"
                      dataKey="score"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="#8b5cf6"
                      fillOpacity={0.4}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
             ) : (
                <EmptyChartState message="Attempt questions in different subjects to see proficiency." />
             )}
          </div>
        </div>

        {/* Pie Chart: Question Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Bank Status</h3>
          <p className="text-sm text-slate-500 mb-4">Coverage of your question bank</p>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
               <span className="text-3xl font-bold text-slate-800">{Math.round((stats.pieData[0].value / stats.totalQuestions) * 100) || 0}%</span>
               <span className="text-xs text-slate-500 uppercase font-semibold">Mastery</span>
            </div>
          </div>
        </div>

        {/* Insights / Action Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
           {/* Decorative circles */}
           <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
           <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-400 opacity-20 rounded-full blur-2xl"></div>

           <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
             <div>
               <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                 <Zap size={20} className="text-yellow-300" /> AI Insights
               </h3>
               {stats.weakestSubject ? (
                 <p className="text-indigo-100 leading-relaxed max-w-xl">
                   Based on your recent performance, you're struggling with <strong className="text-white underline decoration-yellow-400 decoration-2">{stats.weakestSubject.subject}</strong> ({stats.weakestSubject.score}% accuracy). 
                   We recommend a focused practice session to strengthen this area.
                 </p>
               ) : (
                 <p className="text-indigo-100 leading-relaxed">
                   Great start! Keep practicing across different subjects to let our AI build a detailed performance profile for you.
                 </p>
               )}
             </div>
             
             {stats.weakestSubject && (
               <button className="px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg hover:bg-indigo-50 transition-colors whitespace-nowrap">
                 Practice {stats.weakestSubject.subject}
               </button>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subValue, color }: { icon: React.ReactNode, label: string, value: string, subValue: string, color: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        <p className="text-xs text-slate-400 mt-1">{subValue}</p>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const EmptyChartState = ({ message }: { message: string }) => (
  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
    <Activity size={24} className="opacity-50" />
    <span className="text-sm">{message}</span>
  </div>
);
