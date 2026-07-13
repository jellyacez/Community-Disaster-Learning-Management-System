export default function QuizHeader({ currentQIndex, totalQuestions, timeLeft }) {
  return (
    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
        Question {currentQIndex + 1} of {totalQuestions}
      </span>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-colors ${timeLeft <= 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {timeLeft}s
      </div>
    </div>
  );
}
