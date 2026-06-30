import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";

export function useModuleViewer(moduleId) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeStepId, setActiveStepId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch module data
  const { data, isLoading, error } = useQuery({
    queryKey: ['moduleViewer', moduleId],
    queryFn: async () => {
      const response = await apiClient.get(`/modules/${moduleId}/viewer`);
      return response.data.data;
    },
    retry: false
  });

  // Initialize default step
  useEffect(() => {
    if (data && data.steps && data.steps.length > 0 && !activeStepId) {
      const currentOrder = data.currentProgressOrder;
      const nextStep = data.steps.find(s => s.step_order === currentOrder + 1) || data.steps[data.steps.length - 1];
      setActiveStepId(nextStep.id);
    }
  }, [data, activeStepId]);

  // Derived state
  const moduleData = data?.module || {};
  const steps = data?.steps || [];
  const currentProgressOrder = data?.currentProgressOrder || 0;
  const activeStep = useMemo(() => steps.find(s => s.id === activeStepId), [steps, activeStepId]);
  const progressPercentage = steps.length > 0 ? Math.round((currentProgressOrder / steps.length) * 100) : 0;

  // Step completion mutation
  const completeStepMutation = useMutation({
    mutationFn: async (stepId) => {
      const response = await apiClient.post(`/modules/${moduleId}/steps/${stepId}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['moduleViewer', moduleId]);
      queryClient.invalidateQueries(['userDashboard']);
      
      if (activeStep) {
        const nextStep = steps.find(s => s.step_order === activeStep.step_order + 1);
        if (nextStep) {
          setActiveStepId(nextStep.id);
          toast.success("Step completed! Unlocked next lesson.");
        } else {
          toast.success("Congratulations! You have completed the entire module!", { duration: 5000 });
          navigate("/userDashboard");
        }
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to complete step.");
    }
  });

  const handleStepClick = (step) => {
    const isCompleted = step.step_order <= currentProgressOrder;
    const isNextAvailable = step.step_order === currentProgressOrder + 1;

    if (isCompleted || isNextAvailable) {
      setActiveStepId(step.id);
      setIsSidebarOpen(false);
    } else {
      toast.error("Please complete previous steps first to unlock this lesson.", { id: "lock-toast" });
    }
  };

  const handleCompleteAndContinue = () => {
    if (!activeStep || completeStepMutation.isPending) return;
    
    if (activeStep.step_order > currentProgressOrder) {
      completeStepMutation.mutate(activeStep.id);
    } else {
      const nextStep = steps.find(s => s.step_order === activeStep.step_order + 1);
      if (nextStep) {
        setActiveStepId(nextStep.id);
      } else {
        navigate("/userDashboard");
      }
    }
  };

  const handlePrevious = () => {
    if (!activeStep) return;
    const prevStep = steps.find(s => s.step_order === activeStep.step_order - 1);
    if (prevStep) {
      setActiveStepId(prevStep.id);
    }
  };

  return {
    moduleData,
    steps,
    currentProgressOrder,
    activeStepId,
    activeStep,
    progressPercentage,
    isSidebarOpen,
    setIsSidebarOpen,
    isLoading,
    error,
    isDataMissing: !data,
    isCompleting: completeStepMutation.isPending,
    handleStepClick,
    handleCompleteAndContinue,
    handlePrevious
  };
}
