import React, { useState } from "react";
// Updated link targeting the renamed stylesheet
import "./admin.css";

export default function ModulePreview() {
  const mockModule = {
    title: "Protocol for Flash Floods & Severe Inundation",
    description: "Standard operating procedures for localized structural checking, high-risk community deployment, and multi-level communication routes during flash flood conditions.",
    riskLevel: "High",
    flows: [
      {
        type: "text",
        title: "Step 1: Early-Phase Risk Assessment and Mobilization Matrix",
        textContent: "Upon receiving critical rainfall gauges matching heavy or intense rainfall vectors (exceeding 30mm/hr), operations personnel must immediately declare a localized Alert Condition. Identify safe high-ground rallying points and distribute baseline emergency response equipment within 15 minutes of the signal code dispatch."
      },
      {
        type: "video",
        title: "Step 2: Practical Field Deployment Operations",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
      },
      {
        type: "assessment",
        title: "Step 3: Protocol Compliance Knowledge Verification",
        assessmentType: "quiz",
        quizQuestions: [
          {
            questionText: "What is the critical rainfall threshold required to trigger immediate localized emergency unit deployment?",
            options: [
              "Rainfall levels approaching 5mm per hour",
              "Sustained precipitation data recording over 30mm per hour",
              "An average rain threshold of 10mm over an 8-hour window",
              "Any recorded weather activity showing visual overcast skies"
            ],
            correctAnswerIndex: 1
          }
        ]
      },
      {
        type: "assessment",
        title: "Step 4: Comms Isolation Field Decision Scenario",
        assessmentType: "situational",
        situationalScenario: "A rapid-onset flash flood event has physically isolated low-lying clusters within Barangay Cabalantian. The localized cellular relay towers have experienced total grid failure, shutting down your team's primary radio routing channels. Detail your backup tactical comms channel implementation.",
        situationalGuide: "Officer Evaluation Rubric: Ensure response highlights low-band VHF line-of-sight simplex channels."
      }
    ]
  };

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = mockModule.flows[currentStepIndex];
  const [selectedOption, setSelectedOption] = useState(null);

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#111827] flex flex-col items-center">
      
      {/* Central Alignment Engine */}
      <div id="center" className="max-w-3xl w-full p-4 sm:p-12">
        
        {/* Portal Location Breadcrumb Badge */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 text-[11px] text-gray-600 font-semibold mb-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          Bacolor, Pampanga — DRRM Incident Training Portal
        </div>

        {/* Primary Clean White Module Card */}
        <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          
          {/* Header Block Layout */}
          <header className="p-6 sm:p-8 border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <span className="counter">
                {mockModule.riskLevel} Urgency Protocol
              </span>
              <span className="text-xs text-gray-500 font-mono bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">
                Step {currentStepIndex + 1} of {mockModule.flows.length}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{mockModule.title}</h1>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">{mockModule.description}</p>
          </header>

          {/* Core Dynamic Content Block */}
          <main className="p-6 sm:p-8 min-h-[280px]">
            <div className="space-y-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                {currentStep.title}
              </h2>

              {/* RENDER TEXT MATERIAL */}
              {currentStep.type === "text" && (
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-xl border border-gray-200/80">
                  {currentStep.textContent}
                </p>
              )}

              {/* RENDER VIDEO CONTENT */}
              {currentStep.type === "video" && (
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-200 bg-black shadow-md">
                  <iframe
                    className="w-full h-full"
                    src={currentStep.videoUrl}
                    title="Training Video Asset"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* RENDER ASSESSMENTS */}
              {currentStep.type === "assessment" && (
                <div className="space-y-4">
                  {currentStep.assessmentType === "quiz" ? (
                    <div className="space-y-4">
                      {currentStep.quizQuestions.map((quiz, qIdx) => (
                        <div key={qIdx} className="space-y-3">
                          <p className="text-sm font-semibold text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200/60">{quiz.questionText}</p>
                          <div className="grid grid-cols-1 gap-2">
                            {quiz.options.map((option, oIdx) => (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => setSelectedOption(oIdx)}
                                className={`w-full text-left p-4 rounded-xl text-xs transition-all border ${
                                  selectedOption === oIdx 
                                    ? "bg-red-50 border-red-500 text-red-700 font-bold shadow-sm" 
                                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50/50"
                                }`}
                              >
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md mr-3 font-mono text-[10px] font-bold ${selectedOption === oIdx ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl space-y-1.5">
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-mono">Simulated Crisis Environment Context:</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{currentStep.situationalScenario}</p>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-2">Your Strategic Action Plan Input:</label>
                        <textarea 
                          rows="4" 
                          placeholder="Type out your emergency deployment radio path and procedures detail..." 
                          className="w-full p-3 bg-white border border-gray-200 text-xs text-gray-800 rounded-lg focus:outline-none focus:border-red-500 transition-colors shadow-inner"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* Visual Separation Line Accent */}
          <div className="ticks" />

          {/* Next Steps Layout Footer Components */}
          <footer id="next-steps">
            <div id="docs">
              <button
                type="button"
                onClick={() => {
                  setCurrentStepIndex((prev) => Math.max(0, prev - 1));
                  setSelectedOption(null);
                }}
                disabled={currentStepIndex === 0}
                className="w-full py-3 bg-white hover:bg-gray-50 border border-gray-300 text-xs font-bold rounded-xl transition-all disabled:opacity-40 text-center text-gray-700 shadow-sm"
              >
                ← Previous Step
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  if (currentStepIndex < mockModule.flows.length - 1) {
                    setCurrentStepIndex((prev) => prev + 1);
                    setSelectedOption(null);
                  } else {
                    alert("Mock Module Completed Successfully!");
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-bold rounded-xl transition-all shadow-md text-white text-center tracking-wide"
              >
                {currentStepIndex === mockModule.flows.length - 1 ? "Finish Training" : "Next Step →"}
              </button>
            </div>
          </footer>
        </div>
      </div>
      
      <div id="spacer" />
    </div>
  );
}