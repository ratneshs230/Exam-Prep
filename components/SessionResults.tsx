import React, { useState } from 'react';
import { Question, Attempt, QuizSession } from '../types';
import { Trophy, Clock, Target, ChevronDown, ChevronUp, Check, X, Home, RotateCcw, BookOpen } from 'lucide-react';

interface SessionResultsProps {
  session: QuizSession;
  attempts: Attempt[];
  questions: Question[];
  onGoHome: () => void;
  onPracticeAgain: () => void;
  onReviewQuestions: () => void;
}

export const SessionResults: React.FC<SessionResultsProps> = ({
  session,
  attempts,
  questions,
  onGoHome,
  onPracticeAgain,
  onReviewQuestions
}) => {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Calculate stats
  const correctCount = attempts.filter(a => a.isCorrect).length;
  const totalQuestions = session.questions.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0);
  const avgTimePerQuestion = attempts.length > 0 ? totalTime / attempts.length : 0;

  // Calculate subject-wise performance
  const subjectStats = session.questions.reduce((acc, q) => {
    const attempt = attempts.find(a => a.questionId === q.id);
    if (!acc[q.subject]) {
      acc[q.subject] = { correct: 0, total: 0 };
    }
    acc[q.subject].total += 1;
    if (attempt?.isCorrect) {
      acc[q.subject].correct += 1;
    }
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  // Get performance message
  const getPerformanceMessage = () => {
    if (accuracy >= 90) return { text: "Outstanding! 🎉", color: "text-green-600" };
    if (accuracy >= 70) return { text: "Great job! 👏", color: "text-blue-600" };
    if (accuracy >= 50) return { text: "Good effort! 💪", color: "text-amber-600" };
    return { text: "Keep practicing! 📚", color: "text-slate-600" };
  };

  const performance = getPerformanceMessage();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getQuestionById = (id: string) => {
    return questions.find(q => q.id === id) || session.questions.find(q => q.id === id);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg mb-6">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
          <p className={`text-xl ${performance.color.replace('text-', 'text-white/')}`}>
            {performance.text}
          </p>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-4xl font-bold">{accuracy}%</div>
            <div className="text-sm text-white/80 mt-1">Accuracy</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-4xl font-bold">{correctCount}/{totalQuestions}</div>
            <div className="text-sm text-white/80 mt-1">Correct</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-4xl font-bold">{formatTime(totalTime)}</div>
            <div className="text-sm text-white/80 mt-1">Total Time</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Average Time */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Clock size={20} />
            </div>
            <h3 className="font-semibold text-slate-900">Time Analysis</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Avg. per question</span>
              <span className="font-medium text-slate-900">{formatTime(avgTimePerQuestion)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Target time</span>
              <span className="font-medium text-slate-500">&lt; 45s</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full mt-2">
              <div
                className={`h-full rounded-full transition-all ${avgTimePerQuestion <= 45 ? 'bg-green-500' : avgTimePerQuestion <= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((avgTimePerQuestion / 90) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Target size={20} />
            </div>
            <h3 className="font-semibold text-slate-900">By Subject</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(subjectStats).map(([subject, stats]) => (
              <div key={subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{subject}</span>
                  <span className="font-medium text-slate-900">
                    {stats.correct}/{stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Question Review</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {session.questions.map((q, idx) => {
            const attempt = attempts.find(a => a.questionId === q.id);
            const fullQuestion = getQuestionById(q.id) || q;
            const isExpanded = expandedQuestion === q.id;

            return (
              <div key={q.id} className="p-4">
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      attempt?.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {attempt?.isCorrect ? <Check size={16} /> : <X size={16} />}
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Q{idx + 1}.</span>
                      <span className="ml-2 text-slate-900 line-clamp-1">
                        {fullQuestion.text.substring(0, 80)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {attempt ? formatTime(attempt.timeTaken) : '-'}
                    </span>
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 pl-11 animate-fade-in">
                    <p className="text-slate-700 mb-4">{fullQuestion.text}</p>
                    <div className="space-y-2 mb-4">
                      {fullQuestion.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-lg text-sm ${
                            optIdx === fullQuestion.correctAnswerIndex
                              ? 'bg-green-50 border border-green-200 text-green-800'
                              : attempt?.userAnswerIndex === optIdx
                                ? 'bg-red-50 border border-red-200 text-red-800'
                                : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                          {opt}
                          {optIdx === fullQuestion.correctAnswerIndex && (
                            <span className="ml-2 text-green-600 font-medium">(Correct)</span>
                          )}
                          {attempt?.userAnswerIndex === optIdx && optIdx !== fullQuestion.correctAnswerIndex && (
                            <span className="ml-2 text-red-600 font-medium">(Your answer)</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {fullQuestion.explanation && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                        <span className="font-medium">Explanation: </span>
                        {fullQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <button
          onClick={onGoHome}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
        >
          <Home size={20} />
          Go to Dashboard
        </button>
        <button
          onClick={onPracticeAgain}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          <RotateCcw size={20} />
          Practice Again
        </button>
        <button
          onClick={onReviewQuestions}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
        >
          <BookOpen size={20} />
          Question Bank
        </button>
      </div>
    </div>
  );
};
