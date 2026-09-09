export default function QuizHeader({ currentQIndex, totalQuestions, timeLeft }) {
  const progressPercent = ((currentQIndex + 1) / totalQuestions) * 100;
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Question {currentQIndex + 1} of {totalQuestions}
        </span>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 font-mono text-xs ${timeLeft <= 5 ? 'text-red-600 font-bold animate-pulse' : 'text-gray-500 font-medium'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>
      
      {/* Subtle Progress Bar Line */}
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-red-600 transition-all duration-300 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
