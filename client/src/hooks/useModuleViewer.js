import { useState, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";
import { authClient } from "../lib/auth-client";
import { saveOfflineStepProgress, saveOfflineResult, recalculateModuleProgress } from '../lib/LocalSave/progressService';
export function useModuleViewer(moduleId) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [activeStepId, setActiveStepId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loopBackData, setLoopBackData] = useState(null); // { message, score, percentage, loopBackStepId }

  // Fetch module data
  const { data, isLoading, error } = useQuery({
    queryKey: ['moduleViewer', moduleId],
    queryFn: async () => {
      const response = await apiClient.get(`/modules/${moduleId}/viewer`);
      return response.data.data;
    },
    retry: false
  });

  const moduleData = data?.module || {};
  const completedStepIds = data?.completedStepIds || [];

  const enhancedLevels = useMemo(() => {
    const levels = data?.levels || [];
    const passedLevelIds = data?.passedLevelIds || [];

    return levels.map((lvl, index) => {
       const previousLvl = index > 0 ? levels[index - 1] : null;
       const isUnlocked = lvl.level_order === 1 || !lvl.is_locked_by_default || (previousLvl && passedLevelIds.includes(previousLvl.id));
       return { ...lvl, isUnlocked };
    });
  }, [data?.levels, data?.passedLevelIds]);

  const allSteps = useMemo(() => {
    return enhancedLevels.reduce((acc, lvl) => [...acc, ...(lvl.steps || [])], []);
  }, [enhancedLevels]);

  // Default to Map View (activeStepId = null)
  // User selects a step/level from the Map or Sidebar.
  const activeStep = useMemo(() => allSteps.find(s => s.id === activeStepId), [allSteps, activeStepId]);

  // Preload assessments lazily
  const isAssessmentStepType = (type) => {
    return ['quiz', 'situational', 'priority_action', 'hazard_identification', 'action_sequence'].includes(type);
  };

  const assessmentQueries = useQueries({
    queries: allSteps.map(step => ({
      queryKey: ['stepAssessment', step.id],
      queryFn: async () => {
        const res = await apiClient.get(`/modules/steps/${step.id}/assessment`);
        return { stepId: step.id, questions: res.data.data };
      },
      enabled: step.id === activeStepId && isAssessmentStepType(step.type),
      staleTime: Infinity,
    }))
  });

  const getAssessmentForStep = (stepId) => {
    const query = assessmentQueries.find(q => String(q.data?.stepId) === String(stepId));
    return {
      questions: query?.data?.questions || [],
      isLoading: query?.isLoading || (query?.isFetching && query?.status === 'pending')
    };
  };

  // Step completion mutation
  const completeStepMutation = useMutation({
      networkMode: 'always',
      mutationFn: async ({ stepId, answers }) => {
        if (!userId) {
          throw new Error("User session is not fully loaded. Please wait a moment and try again.");
        }

        const endpoint = `/modules/${moduleId}/steps/${stepId}/complete`;
        const isQuiz = answers && Array.isArray(answers);

        // 1. OFFLINE HANDLING
        if (!navigator.onLine) {

          if (isQuiz) {

            await saveOfflineResult(moduleId, userId, true, answers);
            await recalculateModuleProgress(moduleId, userId);
          } else {
            await saveOfflineStepProgress(moduleId, stepId, userId);
          }

          return { queuedOffline: true, message: "You are offline. Progress saved locally and will sync when reconnected." };
        }

        // 2. ONLINE HANDLING
        try {
          const response = await apiClient.post(endpoint, { answers });
          return response.data;
        } catch (error) {
          const isNetworkFailure = !error.response;
          const isServiceWorkerOffline = error.response?.status === 503 && error.response?.data?.error === 'Network Error / Offline';

          if (isNetworkFailure || isServiceWorkerOffline) {

            if (isQuiz) {
              await saveOfflineResult(moduleId, userId, true, answers);
              await recalculateModuleProgress(moduleId, userId);
            } else {
              await saveOfflineStepProgress(moduleId, stepId, userId);
            }
            return { queuedOffline: true, message: "Connection lost. Progress saved locally and will sync when reconnected." };
          }
          throw error;
        }
      },
      onSuccess: (responseData) => {

        if (responseData.queuedOffline) {
          toast.success(responseData.message, { icon: '📦', duration: 4000 });

          queryClient.invalidateQueries(['moduleViewer', moduleId]);
          queryClient.invalidateQueries(['userDashboard']);

          if (activeStep) {
            const currentIndex = allSteps.findIndex(s => s.id === activeStep.id);
            const nextStep = allSteps[currentIndex + 1];
            if (nextStep) {
                setActiveStepId(nextStep.id);
            } else {
                toast.success("You have reached the end of the module offline.");
                navigate("/userDashboard");
            }
          }
          return;
        }

      queryClient.invalidateQueries(['moduleViewer', moduleId]);
      queryClient.invalidateQueries(['userDashboard']);

      if (responseData.passed === false) {
          setLoopBackData({
              message: responseData.message,
              score: responseData.score,
              percentage: responseData.percentage,
              loopBackStepId: responseData.loop_back_step_id,
              isFinalAssessment: responseData.is_final_assessment
          });
          return;
      }

      if (responseData.moduleCompleted) {
          toast.success("Congratulations! You have completed the entire module!", { duration: 5000 });
          navigate("/userDashboard");
          return;
      }

      if (activeStep) {
        toast.success(responseData.message || "Step completed!");
        const currentIndex = allSteps.findIndex(s => s.id === activeStep.id);
        const nextStep = allSteps[currentIndex + 1];
        if (nextStep) {
            setActiveStepId(nextStep.id);
        } else {
            // No next step means they finished the end of the module map
            toast.success("You have reached the end of the module.");
            queryClient.invalidateQueries(["userDashboard"]);
            navigate("/userDashboard");
        }
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to complete step.");
    }
  });

  const handleStepClick = (step) => {
    if (!step) {
      setActiveStepId(null);
      return;
    }

    const isCompleted = completedStepIds.includes(step.id);
    const currentIndex = allSteps.findIndex(s => s.id === step.id);
    const previousStep = allSteps[currentIndex - 1];
    const isNextAvailable = !previousStep || completedStepIds.includes(previousStep.id);

    const parentLevel = enhancedLevels.find(l => l.id === step.level_id);

    if (parentLevel?.isUnlocked && (isCompleted || isNextAvailable)) {
      setActiveStepId(step.id);
      setIsSidebarOpen(false);
    } else {
      toast.error("Please complete previous lessons or levels first.", { id: "lock-toast" });
    }
  };

  const handleCompleteAndContinue = (answers = null) => {
    if (!activeStep || completeStepMutation.isPending) return;

    // Only send answers if they were provided (e.g. from quiz)
    completeStepMutation.mutate({ stepId: activeStep.id, answers });
  };

  const handlePrevious = () => {
    if (!activeStep) return;
    const currentIndex = allSteps.findIndex(s => s.id === activeStep.id);
    const prevStep = allSteps[currentIndex - 1];
    if (prevStep) {
      setActiveStepId(prevStep.id);
    }
  };

  const acknowledgeLoopBack = () => {
      if (loopBackData?.loopBackStepId) {
          setActiveStepId(loopBackData.loopBackStepId);
      }
      setLoopBackData(null);
  };

  return {
    moduleData,
    levels: enhancedLevels,
    allSteps,
    completedStepIds,
    activeStepId,
    activeStep,
    isSidebarOpen,
    setIsSidebarOpen,
    isLoading,
    error,
    isDataMissing: !data,
    isCompleting: completeStepMutation.isPending,
    handleStepClick,
    handleCompleteAndContinue,
    handlePrevious,
    getAssessmentForStep,
    loopBackData,
    acknowledgeLoopBack
  };
}
