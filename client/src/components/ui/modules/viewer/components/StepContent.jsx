import { useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import InteractiveQuiz from "../quiz/InteractiveQuiz";

export default function StepContent({
  activeStep,
  totalSteps,
  isVideoMedia,
  isAssessment,
  assessmentData,
  completedStepIds = [],
  handleCompleteAndContinue,
  isPreviewMode = false,
  onVideoProgress,
}) {
  const mediaUrl = activeStep?.media_url || "";
  const isPdf = Boolean(
    mediaUrl && (mediaUrl.match(/\.pdf($|\?)/i) || activeStep?.step_type === "pdf" || activeStep?.type === "pdf")
  );
  const isVideo = Boolean(
    isVideoMedia ||
    activeStep?.type === "video" ||
    activeStep?.step_type === "video" ||
    activeStep?.type === "situational" ||
    (mediaUrl && mediaUrl.match(/\.(mp4|webm|ogg|mov)($|\?)/i))
  );
  const isImage = Boolean(
    !isPdf &&
    !isVideo &&
    mediaUrl &&
    mediaUrl.match(/\.(jpe?g|png|webp|gif|svg)($|\?)/i)
  );

  const isAlreadyCompleted = Boolean(
    isPreviewMode || (activeStep && completedStepIds.includes(activeStep.id))
  );

  const maxWatchedRef = useRef(0);
  const lastPlayTimeRef = useRef(0);
  const hasMetNinetyRef = useRef(false);

  // Initialize or reset tracking whenever activeStep changes
  useEffect(() => {
    if (!isVideo) return;
    if (isAlreadyCompleted) {
      hasMetNinetyRef.current = true;
      maxWatchedRef.current = Infinity;
      onVideoProgress?.({ stepId: activeStep?.id, watchedRatio: 1, canContinue: true });
    } else {
      hasMetNinetyRef.current = false;
      maxWatchedRef.current = 0;
      lastPlayTimeRef.current = 0;
      onVideoProgress?.({ stepId: activeStep?.id, watchedRatio: 0, canContinue: false });
    }
  }, [activeStep?.id, isVideo, isAlreadyCompleted]);

  const handleTimeUpdate = (e) => {
    if (!isVideo || isAlreadyCompleted || hasMetNinetyRef.current) return;
    const video = e.currentTarget;
    const currentTime = video.currentTime;
    const duration = video.duration;

    if (!duration || isNaN(duration) || duration <= 0) return;

    // Scrub protection: only advance maxWatched if time advanced smoothly (normal playback delta < 2.0s)
    const delta = currentTime - lastPlayTimeRef.current;
    if (currentTime > maxWatchedRef.current) {
      if (delta > 0 && delta < 2.0) {
        maxWatchedRef.current = currentTime;
      }
    }
    lastPlayTimeRef.current = currentTime;

    const ratio = Math.min(1, maxWatchedRef.current / duration);
    if (ratio >= 0.9) {
      hasMetNinetyRef.current = true;
      onVideoProgress?.({ stepId: activeStep?.id, watchedRatio: ratio, canContinue: true });
    } else {
      onVideoProgress?.({ stepId: activeStep?.id, watchedRatio: ratio, canContinue: false });
    }
  };

  const handleSeeking = (e) => {
    if (isAlreadyCompleted || hasMetNinetyRef.current) return;
    const video = e.currentTarget;
    // Disallow scrubbing forward beyond what has actually been watched
    if (video.currentTime > maxWatchedRef.current + 0.5) {
      video.currentTime = maxWatchedRef.current;
    }
  };

  const handleSeeked = (e) => {
    if (isAlreadyCompleted || hasMetNinetyRef.current) return;
    const video = e.currentTarget;
    if (video.currentTime > maxWatchedRef.current + 0.5) {
      video.currentTime = maxWatchedRef.current;
    }
    lastPlayTimeRef.current = video.currentTime;
  };

  const handleEnded = (e) => {
    if (isAlreadyCompleted) return;
    const video = e.currentTarget;
    const duration = video.duration || maxWatchedRef.current;
    maxWatchedRef.current = duration;
    hasMetNinetyRef.current = true;
    onVideoProgress?.({ stepId: activeStep?.id, watchedRatio: 1, canContinue: true });
  };

  return (
    <div className="max-w-3xl mx-auto w-full pb-12">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
        {activeStep.title}
      </h1>

      {/* MEDIA COMPONENT: EXPLICIT BRANCHING FOR PDF, VIDEO, AND IMAGE */}
      {mediaUrl && (
        <>
          {isPdf ? (
            <div className="w-full mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Document Guide</span>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-red-600 transition-colors"
                >
                  <span>View document</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div className="w-full h-[620px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src={mediaUrl}
                  title={activeStep.title || "PDF Document"}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : isVideo ? (
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black mb-8">
              <video
                key={activeStep.id}
                controls
                preload="metadata"
                className="w-full h-full object-contain"
                controlsList="nodownload"
                poster="/offline-video-placeholder.svg"
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onSeeked={handleSeeked}
                onEnded={handleEnded}
              >
                <source src={mediaUrl} />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isImage ? (
            <div className="w-full rounded-lg overflow-hidden mb-8 border border-gray-100">
              <img
                src={mediaUrl}
                alt={activeStep.title || "Step Media"}
                className="w-full max-h-[500px] object-cover"
              />
            </div>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between mb-8">
              <span className="text-sm font-medium text-gray-700">Reference Material Attachment</span>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                <span>Open document</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </>
      )}

      {/* RICH TEXT CONTENT */}
      {activeStep.content && activeStep.content !== "<p></p>" && (
        <div
          className="prose prose-neutral max-w-none text-gray-800 leading-relaxed font-normal mb-8 prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-base prose-p:leading-relaxed prose-li:marker:text-gray-400 prose-a:text-red-600 hover:prose-a:text-red-700"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeStep.content) }}
        />
      )}

      {/* INTERACTIVE QUIZ COMPONENT */}
      {isAssessment && (
        <div className="mt-6">
          {!isPreviewMode && completedStepIds.includes(activeStep.id) ? (
            <div className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-6 text-center">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-emerald-900 mb-1">Assessment Completed</h3>
              <p className="text-sm text-emerald-700">You have completed this assessment.</p>
            </div>
          ) : (
            <InteractiveQuiz
              key={activeStep.id}
              stepType={activeStep.type}
              questions={assessmentData.questions}
              isLoading={assessmentData.isLoading}
              onCompleteStep={handleCompleteAndContinue}
              isPreviewMode={isPreviewMode}
            />
          )}
        </div>
      )}
    </div>
  );
}
