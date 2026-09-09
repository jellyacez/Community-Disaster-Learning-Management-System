import { useParams, useNavigate } from "react-router-dom";
import useDocumentTitle from "../../../hooks/useDocumentTitle";

import { useModuleViewer } from "../../../hooks/useModuleViewer";
import ModuleViewerSidebar from "../../../components/ui/modules/viewer/ModuleViewerSidebar";
import ModuleViewerContent from "../../../components/ui/modules/viewer/ModuleViewerContent";
import Spinner from "../../../components/ui/Spinner";

export default function ModuleViewer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const {
    moduleData,
    levels,
    allSteps,
    completedStepIds,
    activeStepId,
    activeStep,
    isSidebarOpen,
    setIsSidebarOpen,
    isLoading,
    error,
    isDataMissing,
    isCompleting,
    handleStepClick,
    handleCompleteAndContinue,
    handlePrevious,
    getAssessmentForStep,
    loopBackData,
    acknowledgeLoopBack
  } = useModuleViewer(moduleId);

  useDocumentTitle(moduleData?.title ? `${moduleData.title} | Bacolor LMS` : 'Module Viewer');

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Spinner className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Loading course material...</p>
      </div>
    );
  }

  if (error || isDataMissing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
         <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-red-100 max-w-md">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-6 text-sm">{error?.response?.data?.message || "Failed to fetch module data."}</p>
            <button onClick={() => navigate("/userDashboard")} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition">Return to Dashboard</button>
         </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col md:flex-row">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <ModuleViewerSidebar 
        module={moduleData}
        levels={levels}
        completedStepIds={completedStepIds}
        activeStepId={activeStepId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleStepClick={handleStepClick}
        navigate={navigate}
      />

      <ModuleViewerContent 
        levels={levels}
        completedStepIds={completedStepIds}
        handleStepClick={handleStepClick}
        activeStep={activeStep}
        totalSteps={allSteps.length}
        handlePrevious={handlePrevious}
        handleCompleteAndContinue={handleCompleteAndContinue}
        isCompleting={isCompleting}
        getAssessmentForStep={getAssessmentForStep}
        loopBackData={loopBackData}
        acknowledgeLoopBack={acknowledgeLoopBack}
        navigate={navigate}
        setIsSidebarOpen={setIsSidebarOpen}
      />

    </div>
  );
}
