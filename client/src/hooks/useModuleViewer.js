import { useState, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";

export function useModuleViewer(moduleId) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    mutationFn: async ({ stepId, answers }) => {
      const response = await apiClient.post(`/modules/${moduleId}/steps/${stepId}/complete`, { answers });
      return response.data;
    },
    onSuccess: (responseData) => {
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
