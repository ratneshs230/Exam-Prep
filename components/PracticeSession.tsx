import React, { useState, useEffect, useRef } from 'react';
import { Question, Attempt, QuizSession } from '../types';
import { GeminiService } from '../services/geminiService';
import { ChevronRight, ChevronLeft, HelpCircle, Check, X, MessageSquare, Lightbulb, Clock, Loader2 } from 'lucide-react';

interface PracticeSessionProps {
  session: QuizSession;
  onComplete: (attempts: Attempt[]) => void;
  onExit: () => void;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({ session, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState<number | undefined>(session.timeLimit);
  
  // AI State
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  const currentQuestion = session.questions[currentIndex];
  const isExamMode = session.mode === 'EXAM';

  useEffect(() => {
    // Reset state on question change
    setSelectedOption(null);
    setIsChecked(false);
    setAiMessage(null);
    setHintUsed(false);
    setStartTime(Date.now());
  }, [currentIndex]);

  // Timer Effect
  useEffect(() => {
    if (timeLeft === undefined) return;
    if (timeLeft <= 0) {
      onComplete(attempts);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== undefined && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, attempts, onComplete]);

  const handleOptionSelect = (idx: number) => {
    if (isChecked && !isExamMode) return; // Prevent changing after check in practice mode
    setSelectedOption(idx);
  };

  const handleCheck = () => {
    if (selectedOption === null) return;
    
    setIsChecked(true);

    const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;
    const timeTaken = (Date.now() - startTime) / 1000;

    const newAttempt: Attempt = {
      questionId: currentQuestion.id,
      userAnswerIndex: selectedOption,
      isCorrect,
      timeTaken,
      timestamp: Date.now()
    };

    setAttempts(prev => {
      // Remove previous attempt for this question if exists (in case of navigation)
      const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
      return [...filtered, newAttempt];
    });

    // Auto explain if wrong in practice mode
    if (!isCorrect && !isExamMode) {
      askAi('WHY_WRONG');
    }
  };

  const handleNext = () => {
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(attempts);
    }
  };

  const askAi = async (type: 'EXPLAIN' | 'HINT' | 'WHY_WRONG') => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    
    // Optimistic UI for Hint
    if (type === 'HINT') setHintUsed(true);

    const response = await GeminiService.getTutorResponse(
      currentQuestion, 
      selectedOption, 
      type
    );
    setAiMessage(response);
    setIsAiLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getOptionStyle = (idx: number) => {
    const baseStyle = "w-full p-4 text-left rounded-lg border-2 transition-all duration-200 flex justify-between items-center group ";
    
    if (isExamMode) {
      // Exam Mode: Just show selected state
      if (selectedOption === idx) return baseStyle + "border-blue-500 bg-blue-50 text-blue-900";
      return baseStyle + "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
    }

    // Practice Mode: Show Right/Wrong immediately after check
    if (isChecked) {
      if (idx === currentQuestion.correctAnswerIndex) {
        return baseStyle + "border-green-500 bg-green-50 text-green-900 font-medium";
      }
      if (selectedOption === idx && idx !== currentQuestion.correctAnswerIndex) {
        return baseStyle + "border-red-500 bg-red-50 text-red-900";
      }
      return baseStyle + "border-slate-100 opacity-60";
    }

    // Practice Mode: Selection state
    if (selectedOption === idx) return baseStyle + "border-indigo-500 bg-indigo-50 text-indigo-900";
    return baseStyle + "border-slate-200 hover:border-indigo-200 hover:bg-slate-50";
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{currentQuestion.subject}</h2>
          <div className="flex gap-2 text-xs mt-1">
             <span className={`px-2 py-0.5 rounded-full ${
               currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
               currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
               'bg-red-100 text-red-700'
             }`}>
               {currentQuestion.difficulty}
             </span>
             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
               Q{currentIndex + 1} of {session.questions.length}
             </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {timeLeft !== undefined && (
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
               <Clock size={16} />
               {formatTime(timeLeft)}
             </div>
          )}
          <button onClick={onExit} className="text-slate-500 hover:text-slate-700 px-3 py-1.5 text-sm font-medium">Exit</button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Question Area */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-lg text-slate-900 font-medium leading-relaxed mb-6">
              {currentQuestion.text}
            </p>

            <div className="space-y-3">
              {currentQuestion.options.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={getOptionStyle(idx)}
                  disabled={isChecked && !isExamMode}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:border-current shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </span>
                  {isChecked && !isExamMode && idx === currentQuestion.correctAnswerIndex && (
                    <Check className="text-green-600 w-5 h-5" />
                  )}
                  {isChecked && !isExamMode && selectedOption === idx && idx !== currentQuestion.correctAnswerIndex && (
                    <X className="text-red-500 w-5 h-5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center py-4">
             {!isChecked ? (
                <button 
                  onClick={handleCheck}
                  disabled={selectedOption === null}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full lg:w-auto"
                >
                  {isExamMode ? (currentIndex === session.questions.length - 1 ? 'Finish Exam' : 'Next Question') : 'Check Answer'}
                </button>
             ) : (
                <button 
                  onClick={handleNext}
                  className="bg-slate-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 w-full lg:w-auto justify-center"
                >
                  {currentIndex === session.questions.length - 1 ? 'Finish Practice' : 'Next Question'}
                  <ChevronRight size={20} />
                </button>
             )}
          </div>
        </div>

        {/* AI Tutor Panel */}
        <div className="lg:col-span-1 bg-indigo-50 rounded-xl border border-indigo-100 p-4 flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4 text-indigo-900">
            <div className="p-1.5 bg-indigo-200 rounded-lg">
              <MessageSquare size={18} />
            </div>
            <h3 className="font-bold">AI Exam Agent</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
            {/* Initial State */}
            {!aiMessage && !isChecked && !hintUsed && (
              <div className="text-sm text-indigo-800 bg-white/50 p-3 rounded-lg">
                I'm here to help! Stuck? Ask for a hint.
              </div>
            )}

            {/* Hint Box */}
            {hintUsed && !aiMessage && !isAiLoading && (
               <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                 Thinking of a hint...
               </div>
            )}

            {/* AI Response */}
            {aiMessage && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 text-sm leading-relaxed text-slate-700 animate-fade-in">
                {isAiLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin w-4 h-4" /> Generating explanation...
                  </div>
                ) : (
                  // Simple markdown-ish rendering
                  aiMessage.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)
                )}
              </div>
            )}

            {/* Explanation from Metadata (Fallback) */}
            {isChecked && !isExamMode && !aiMessage && (
               <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-sm leading-relaxed text-slate-700">
                 <p className="font-semibold text-slate-900 mb-1">Standard Explanation:</p>
                 {currentQuestion.explanation}
               </div>
            )}
          </div>

          {/* AI Controls */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            {!isExamMode && !isChecked && (
              <button 
                onClick={() => askAi('HINT')}
                disabled={hintUsed || isAiLoading}
                className="flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-200 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
              >
                <Lightbulb size={16} /> Get Hint
              </button>
            )}
            {!isExamMode && isChecked && (
              <button 
                onClick={() => askAi('EXPLAIN')}
                disabled={isAiLoading}
                className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-75 disabled:cursor-wait"
              >
                {isAiLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <HelpCircle size={16} />}
                {isAiLoading ? "Analyzing..." : "Deep Explain (AI)"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};