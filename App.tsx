import React, { useState, useEffect } from 'react';
import { AppState, Question, QuizSession, Attempt, Subject } from './types';
import { Dashboard } from './components/Dashboard';
import { DocumentUpload } from './components/DocumentUpload';
import { QuestionBank } from './components/QuestionBank';
import { PracticeSession } from './components/PracticeSession';
import { GeminiService } from './services/geminiService';
import { StorageService } from './services/storageService';
import { LayoutDashboard, BookOpen, Upload, PlayCircle, Settings, Menu, BrainCircuit, Sliders, ArrowLeft, Clock, Loader2, Sparkles, Key, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_STATE: AppState = {
  questions: [],
  attempts: [],
  documents: []
};

// Main App Component
const App: React.FC = () => {
  // --- Global State (loaded from localStorage) ---
  const [state, setState] = useState<AppState>(() => {
    const saved = StorageService.loadState();
    return saved || DEFAULT_STATE;
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // API Key state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return StorageService.loadApiKey() || '';
  });
  const [tempApiKey, setTempApiKey] = useState('');

  const handleSaveApiKey = () => {
    StorageService.saveApiKey(tempApiKey);
    setApiKey(tempApiKey);
    setShowApiKeyModal(false);
  };

  const handleOpenApiKeyModal = () => {
    setTempApiKey(apiKey);
    setShowApiKeyModal(true);
  };

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      StorageService.saveState(state);
    }
  }, [state, isHydrated]);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'UPLOAD' | 'BANK' | 'PRACTICE'>('DASHBOARD');
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Practice sub-state
  const [practiceView, setPracticeView] = useState<'MENU' | 'CUSTOM_SETUP'>('MENU');
  const [isCurating, setIsCurating] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    subject: 'All',
    questionCount: 10,
    duration: 0, // minutes, 0 = unlimited
    focusArea: '' // New field for AI context
  });

  // --- Handlers ---

  const handleDocumentParsed = (newQuestions: Question[]) => {
    setState(prev => ({
      ...prev,
      questions: [...newQuestions, ...prev.questions]
    }));
  };

  const handleStartPractice = (mode: 'STANDARD' | 'ADAPTIVE' | 'EXAM') => {
    if (state.questions.length === 0) {
      alert("Your question bank is empty! Please upload some documents first.");
      setActiveTab('UPLOAD');
      return;
    }

    let selectedQuestions = [...state.questions];
    let timeLimit = undefined;
    
    // Adaptive Logic (Simple Simulation): Prioritize questions not attempted or incorrect
    if (mode === 'ADAPTIVE') {
       const incorrectIds = new Set(state.attempts.filter(a => !a.isCorrect).map(a => a.questionId));
       selectedQuestions = selectedQuestions.sort((a, b) => {
          const aW = incorrectIds.has(a.id) ? 1 : 0;
          const bW = incorrectIds.has(b.id) ? 1 : 0;
          return bW - aW; // Incorrect ones first
       });
    } else if (mode === 'EXAM') {
      // Shuffle for exam
      selectedQuestions = selectedQuestions.sort(() => Math.random() - 0.5);
      timeLimit = 120 * 60; // 2 hours for Exam mode default
    } else {
       // Shuffle for standard
       selectedQuestions = selectedQuestions.sort(() => Math.random() - 0.5);
    }

    const session: QuizSession = {
      id: uuidv4(),
      mode,
      questions: selectedQuestions.slice(0, 10),
      currentQuestionIndex: 0,
      attempts: [],
      startTime: Date.now(),
      timeLimit,
      isComplete: false
    };
    setActiveSession(session);
    setActiveTab('PRACTICE');
  };

  const handleStartCustomPractice = async () => {
    if (state.questions.length === 0) {
      alert("Your question bank is empty! Please upload some documents first.");
      setActiveTab('UPLOAD');
      return;
    }

    setIsCurating(true);

    try {
      // Use AI Service to curate questions based on requirements
      const selectedIds = await GeminiService.curatePracticeSet(state.questions, {
        count: customConfig.questionCount,
        subject: customConfig.subject,
        focus: customConfig.focusArea
      });

      const selectedQuestions = state.questions.filter(q => selectedIds.includes(q.id));

      if (selectedQuestions.length === 0) {
        alert("Could not find enough questions matching your criteria.");
        setIsCurating(false);
        return;
      }

      const session: QuizSession = {
        id: uuidv4(),
        mode: 'CUSTOM',
        questions: selectedQuestions,
        currentQuestionIndex: 0,
        attempts: [],
        startTime: Date.now(),
        timeLimit: customConfig.duration > 0 ? customConfig.duration * 60 : undefined,
        isComplete: false
      };

      setActiveSession(session);
      setPracticeView('MENU'); // Reset view for next time
    } catch (error) {
      console.error("Failed to curate session:", error);
      alert("Something went wrong while curating your session.");
    } finally {
      setIsCurating(false);
    }
  };

  const handleSessionComplete = (newAttempts: Attempt[]) => {
    setState(prev => ({
      ...prev,
      attempts: [...prev.attempts, ...newAttempts]
    }));
    setActiveSession(null);
    setActiveTab('DASHBOARD');
  };

  // --- Render Helpers ---

  const renderContent = () => {
    if (activeSession) {
      return (
        <PracticeSession 
          session={activeSession} 
          onComplete={handleSessionComplete} 
          onExit={() => setActiveSession(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'DASHBOARD':
        return <Dashboard state={state} onUploadClick={() => setActiveTab('UPLOAD')} />;
      case 'UPLOAD':
        return (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Document Upload & Parsing</h2>
            <DocumentUpload 
              onQuestionsParsed={handleDocumentParsed} 
              onUploadComplete={(name, count) => {
                 setState(prev => ({
                   ...prev,
                   documents: [...prev.documents, {
                     id: uuidv4(),
                     name,
                     uploadDate: Date.now(),
                     status: 'READY',
                     questionCount: count
                   }]
                 }));
              }}
            />
            {state.documents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Recent Uploads</h3>
                <ul className="space-y-3">
                  {state.documents.map(doc => (
                    <li key={doc.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">{doc.name}</span>
                      <span className="text-slate-500">{doc.questionCount} Questions Extracted</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'BANK':
        return <QuestionBank questions={state.questions} onDelete={(id) => setState(prev => ({...prev, questions: prev.questions.filter(q => q.id !== id)}))} />;
      case 'PRACTICE':
        if (practiceView === 'CUSTOM_SETUP') {
          return (
            <div className="max-w-2xl mx-auto animate-fade-in">
               <button 
                 onClick={() => setPracticeView('MENU')}
                 className="flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
               >
                 <ArrowLeft size={18} className="mr-2" /> Back to Menu
               </button>

               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                     <BrainCircuit size={24} />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-slate-900">AI-Powered Practice</h2>
                     <p className="text-sm text-slate-500">Customize your session and let AI pick the best questions.</p>
                   </div>
                 </div>

                 <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                        <select 
                          className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          value={customConfig.subject}
                          onChange={(e) => setCustomConfig({...customConfig, subject: e.target.value})}
                        >
                          <option value="All">All Subjects</option>
                          {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Questions</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100"
                          className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          value={customConfig.questionCount}
                          onChange={(e) => setCustomConfig({...customConfig, questionCount: parseInt(e.target.value) || 10})}
                        />
                      </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
                       <span>Specific Focus Area (Optional)</span>
                       <span className="text-xs text-indigo-600 flex items-center gap-1"><Sparkles size={12}/> AI Filter</span>
                     </label>
                     <input 
                       type="text" 
                       placeholder="e.g., 'Fiscal Policy', 'Recent Amendments', 'Hard questions only'"
                       className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                       value={customConfig.focusArea}
                       onChange={(e) => setCustomConfig({...customConfig, focusArea: e.target.value})}
                     />
                     <p className="text-xs text-slate-500 mt-2">
                       Our AI agent will analyze your request and pick the most relevant questions from your bank.
                     </p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">
                       Duration (Minutes) 
                       <span className="text-slate-400 font-normal ml-2">(Optional, 0 for unlimited)</span>
                     </label>
                     <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                          type="number" 
                          min="0"
                          className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          value={customConfig.duration}
                          onChange={(e) => setCustomConfig({...customConfig, duration: parseInt(e.target.value) || 0})}
                        />
                     </div>
                   </div>

                   <button 
                     onClick={handleStartCustomPractice}
                     disabled={isCurating}
                     className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 transition-all shadow-md hover:shadow-lg mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                   >
                     {isCurating ? (
                       <>
                         <Loader2 className="animate-spin" /> Curating Questions...
                       </>
                     ) : (
                       "Generate Practice Set"
                     )}
                   </button>
                 </div>
               </div>
            </div>
          );
        }

        return (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             <div className="text-center space-y-2">
               <h2 className="text-3xl font-bold text-slate-900">Start Practice Session</h2>
               <p className="text-slate-500">Choose a mode to begin your preparation for LDCE SO Grade B</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Standard Mode */}
                <button onClick={() => handleStartPractice('STANDARD')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left group">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <PlayCircle size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900">Standard Practice</h3>
                   <p className="text-sm text-slate-500 mt-2">Randomized questions from all subjects. Immediate feedback enabled. Great for quick revisions.</p>
                </button>

                {/* Adaptive Mode */}
                <button onClick={() => handleStartPractice('ADAPTIVE')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all text-left group relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">AI POWERED</div>
                   <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <BrainCircuit size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900">Adaptive Mode</h3>
                   <p className="text-sm text-slate-500 mt-2">AI selects questions based on your weak areas and past mistakes. The best way to improve.</p>
                </button>

                {/* Exam Mode */}
                <button onClick={() => handleStartPractice('EXAM')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-red-500 hover:shadow-md transition-all text-left group">
                   <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Settings size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900">Exam Simulation</h3>
                   <p className="text-sm text-slate-500 mt-2">Timed environment. No explanations until submission. Simulates the real exam pressure.</p>
                </button>

                {/* Custom Mode */}
                <button onClick={() => setPracticeView('CUSTOM_SETUP')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left group">
                   <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Sliders size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900">Custom Practice</h3>
                   <p className="text-sm text-slate-500 mt-2">Define your own rules. Use AI to pick questions based on specific topics or tags.</p>
                </button>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Static Position */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 shrink-0">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
               <BrainCircuit className="text-white w-5 h-5" />
             </div>
             <span className="font-bold text-lg tracking-tight">Grade B Prep</span>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} />
            <NavItem icon={<PlayCircle size={20} />} label="Practice Now" active={activeTab === 'PRACTICE'} onClick={() => setActiveTab('PRACTICE')} />
            <NavItem icon={<Upload size={20} />} label="Upload Docs" active={activeTab === 'UPLOAD'} onClick={() => setActiveTab('UPLOAD')} />
            <NavItem icon={<BookOpen size={20} />} label="Question Bank" active={activeTab === 'BANK'} onClick={() => setActiveTab('BANK')} />
          </nav>

          <div className="p-4 border-t border-slate-100 shrink-0">
             {/* API Key Button */}
             <button
               onClick={handleOpenApiKeyModal}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900 mb-3"
             >
               <Key size={20} />
               <span>API Key</span>
               {apiKey && <span className="ml-auto w-2 h-2 bg-green-500 rounded-full"></span>}
             </button>
             <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-xs font-bold text-indigo-800 uppercase mb-1">Your Stats</p>
                <div className="flex justify-between items-end">
                   <div>
                     <span className="text-2xl font-bold text-indigo-900">{state.questions.length}</span>
                     <p className="text-xs text-indigo-600">Total Questions</p>
                   </div>
                   <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-indigo-600">
                        {state.attempts.length > 0 ? Math.round((state.attempts.filter(a => a.isCorrect).length / state.attempts.length) * 100) : 0}%
                      </span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 lg:hidden p-4 flex items-center gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg">Grade B Prep</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
           {renderContent()}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Configure API Key</h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Enter your Gemini API key to enable AI features. You can get a free API key from{' '}
              <a 
                href="https://aistudio.google.com/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Google AI Studio
              </a>.
            </p>

            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save Key
              </button>
            </div>

            {apiKey && (
              <button
                onClick={() => {
                  StorageService.clearApiKey();
                  setApiKey('');
                  setTempApiKey('');
                }}
                className="w-full mt-3 text-sm text-red-600 hover:text-red-700"
              >
                Remove saved key
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
  >
    {icon}
    {label}
  </button>
);

export default App;