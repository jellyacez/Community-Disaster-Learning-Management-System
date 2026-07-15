export default function QuizHeader({ currentQIndex, totalQuestions, timeLeft }) {
  const progressPercent = ((currentQIndex + 1) / totalQuestions) * 100;
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-red-700 tracking-wide">
          Question {currentQIndex + 1} of {totalQuestions}
        </span>
        <div className={`flex items-center gap-1.5 font-bold text-sm ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>
      
      {/* Purple Progress Bar Line */}
      <div className="w-full h-1 bg-red-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-red-600 transition-all duration-500 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
