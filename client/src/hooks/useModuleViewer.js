import { useState, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";
import { authClient } from "../lib/auth-client";
import { useOfflineSession } from "./offlineSession";
import {
  saveOfflineStepProgress,
  saveOfflineResult,
  recalculateModuleProgress,
} from "../lib/LocalSave/progressService";
import { decodeHtml } from "../utils/textUtils";
import { localDb } from "../lib/localDb";
export function useModuleViewer(moduleId) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useOfflineSession(); // Replaced authClient.useSession
  const userId = session?.user?.id;

  const [activeStepId, setActiveStepId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loopBackData, setLoopBackData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // 1. Fetch module data (With Offline IndexedDB Fallback)
  const { data, isLoading, error } = useQuery({
    queryKey: ["moduleViewer", moduleId],
    networkMode: "offlineFirst", // Allow running while offline
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/modules/${moduleId}/viewer`);
        const payload = response.data.data;

        // Cache the structure for offline use in the background
        if (payload?.module && payload?.levels) {
          cacheModuleStructureOffline(payload.module, payload.levels);

          // Also save an offline localStorage copy for quick UI hydration
          localStorage.setItem(`lms_offline_module_${moduleId}`, JSON.stringify(payload));
        }

        return payload;
      } catch (err) {
        if (!navigator.onLine || err.code === "ERR_NETWORK") {
          const cached = localStorage.getItem(`lms_offline_module_${moduleId}`);
          if (cached) {
            toast("You are viewing a cached offline version of this module.", { icon: "📶", duration: 3000 });
            return JSON.parse(cached);
          }
        }
        throw err;
      }
    },
    retry: false,
  });


  const cacheModuleStructureOffline = async (moduleData, levels) => {
    if (!moduleData || !moduleData.id) return;
    try {
      await localDb.transaction("rw", localDb.module_data, localDb.levels, localDb.module_steps, async () => {
        await localDb.module_data.put({
          mod_id: moduleData.id,
          modcat: moduleData.category || "General",
          title: moduleData.title
        });

        for (const level of levels) {
          await localDb.levels.put({
            level_id: level.id,
            mod_id: moduleData.id,
            title: level.title,
            level_order: level.level_order
          });

          for (const step of (level.steps || [])) {
            await localDb.module_steps.put({
              step_id: step.id,
              level_id: level.id,
              title: step.title,
              step_type: step.type,
              step_order: step.step_order
            });
          }
        }
      });
    } catch (error) {
      console.warn("Failed to cache module structure to IndexedDB:", error);
    }
  };
  const moduleData = useMemo(() => {
    if (!data?.module) return {};
    return {
      ...data.module,
      title: decodeHtml(data.module.title),
    };
  }, [data?.module]);

  const completedStepIds = useMemo(() => data?.completedStepIds || [], [data?.completedStepIds]);

  const enhancedLevels = useMemo(() => {
    const levels = data?.levels || [];
    const unlockedLevelIds = data?.unlockedLevelIds || [];

    return levels.map((lvl, index) => {
      const previousLvl = index > 0 ? levels[index - 1] : null;
      const hasCompletedStep = (lvl.steps || []).some((s) => completedStepIds.includes(s.id));
      const isUnlocked =
        lvl.level_order === 1 ||
        !lvl.is_locked_by_default ||
        (previousLvl && unlockedLevelIds.includes(previousLvl.id)) ||
        hasCompletedStep;

      return {
        ...lvl,
        title: decodeHtml(lvl.title),
        isUnlocked,
        steps: (lvl.steps || []).map((s, idx, arr) => {
          const isCompleted = completedStepIds.includes(s.id);
          const previousStep = idx > 0 ? arr[idx - 1] : null;
          const isStepLocked = isCompleted
            ? false
            : (!isUnlocked || (previousStep && !completedStepIds.includes(previousStep.id)));

          return {
            ...s,
            title: decodeHtml(s.title),
            isCompleted,
            isLocked: isStepLocked,
          };
        }),
      };
    });
  }, [data?.levels, data?.unlockedLevelIds, completedStepIds]);

  const allSteps = useMemo(() => {
    return enhancedLevels.reduce((acc, lvl) => [...acc, ...(lvl.steps || [])], []);
  }, [enhancedLevels]);

  const activeStep = useMemo(
    () => allSteps.find((s) => s.id === activeStepId),
    [allSteps, activeStepId]
  );

  // Preload assessments lazily
  const isAssessmentStepType = (type) => {
    return [
      "quiz",
      "situational",
      "priority_action",
      "hazard_identification",
      "action_sequence",
    ].includes(type);
  };

  const assessmentQueries = useQueries({
    queries: allSteps.map((step) => ({
      queryKey: ["stepAssessment", step.id],
      queryFn: async () => {
        const res = await apiClient.get(`/modules/steps/${step.id}/assessment`);
        const rawQuestions = res.data?.data || [];
        const questions = rawQuestions.map((q) => ({
          ...q,
          question_text: decodeHtml(q.question_text),
          options: (q.options || []).map((opt) => ({
            ...opt,
            text: decodeHtml(opt.text),
            rationale: decodeHtml(opt.rationale),
          })),
        }));
        return { stepId: step.id, questions };
      },
      enabled: step.id === activeStepId && isAssessmentStepType(step.type),
      staleTime: Infinity,
    })),
  });

  const getAssessmentForStep = (stepId) => {
    const query = assessmentQueries.find(
      (q) => String(q.data?.stepId) === String(stepId)
    );
    return {
      questions: query?.data?.questions || [],
      isLoading:
        query?.isLoading || (query?.isFetching && query?.status === "pending"),
    };
  };

  // 2. Step completion mutation
  const completeStepMutation = useMutation({
    networkMode: "always",
    mutationFn: async ({ stepId, answers }) => {
      if (!userId) {
        throw new Error(
          "User session is not fully loaded. Please wait a moment and try again."
        );
      }

      const endpoint = `/modules/${moduleId}/steps/${stepId}/complete`;
      const isQuiz = answers && Array.isArray(answers);

      // 1. OFFLINE HANDLING
      if (!navigator.onLine) {
        let result;
        if (isQuiz) {
          result = await saveOfflineResult(moduleId, userId, true, answers, stepId);
          await recalculateModuleProgress(moduleId, userId);
        } else {
          result = await saveOfflineStepProgress(moduleId, stepId, userId);
        }

        if (result?.status === 'failed') {
          throw new Error(result.error || "Storage failed. Progress could not be saved offline.");
        }

        return {
          queuedOffline: true,
          status: result?.status,
          storageType: result?.storageType,
          warning: result?.warning,
          message:
            result?.warning ||
            result?.message ||
            "You are offline. Progress saved locally and will sync when reconnected.",
        };
      }

      // 2. ONLINE HANDLING
      try {
        const response = await apiClient.post(endpoint, { answers });
        return response.data;
      } catch (error) {
        const isNetworkFailure = !error.response;
        const isServiceWorkerOffline =
          error.response?.status === 503 &&
          error.response?.data?.error === "Network Error / Offline";

        if (isNetworkFailure || isServiceWorkerOffline) {
          let result;
          if (isQuiz) {
            result = await saveOfflineResult(moduleId, userId, true, answers, stepId);
            await recalculateModuleProgress(moduleId, userId);
          } else {
            result = await saveOfflineStepProgress(moduleId, stepId, userId);
          }

          if (result?.status === 'failed') {
            throw new Error(result.error || "Storage failed. Progress could not be saved offline.");
          }

          return {
            queuedOffline: true,
            status: result?.status,
            storageType: result?.storageType,
            warning: result?.warning,
            message:
              result?.warning ||
              result?.message ||
              "Connection lost. Progress saved locally and will sync when reconnected.",
          };
        }
        throw error;
      }
    },
    onSuccess: (responseData) => {
      if (responseData.queuedOffline) {
        if (responseData.status === 'queued_memory_only' || responseData.storageType === 'memory') {
          toast(
            responseData.warning ||
              "Storage restricted: Progress saved in memory for this session only. Do not close tab until reconnected.",
            { icon: "⚠️", duration: 7000 }
          );
        } else {
          toast.success(responseData.message, { icon: "📦", duration: 4000 });
        }

        queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
        queryClient.invalidateQueries({ queryKey: ["moduleDetails", moduleId] });

        if (activeStep) {
          const currentIndex = allSteps.findIndex((s) => s.id === activeStep.id);
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


      queryClient.invalidateQueries({ queryKey: ["moduleViewer", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["userDashboard"] });

      if (responseData.passed === false) {
        setLoopBackData({
          message: responseData.message,
          score: responseData.score,
          percentage: responseData.percentage,
          loopBackStepId: responseData.loop_back_step_id,
          isFinalAssessment: responseData.is_final_assessment,
        });
        return;
      }

      if (responseData.moduleCompleted) {
        toast.success("Congratulations! You have completed the entire module!", {
          duration: 5000,
        });
        navigate("/userDashboard");
        return;
      }

      if (activeStep) {
        toast.success(responseData.message || "Step completed!");
        const currentIndex = allSteps.findIndex((s) => s.id === activeStep.id);
        const nextStep = allSteps[currentIndex + 1];
        if (nextStep) {
          setActiveStepId(nextStep.id);
        } else {
          toast.success("You have reached the end of the module.");
          queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
          navigate("/userDashboard");
        }
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || "Failed to complete step.");
    },
  });

  const handleStepClick = (step) => {
    if (!step) {
      setActiveStepId(null);
      return;
    }

    const parentLevel = enhancedLevels.find((l) => l.id === step.level_id);
    const targetStep = parentLevel?.steps?.find((s) => s.id === step.id) || step;

    if (!targetStep.isLocked) {
      setActiveStepId(step.id);
      setIsSidebarOpen(false);
    } else {
      toast.error("Please complete previous lessons or levels first.", {
        id: "lock-toast",
      });
    }
  };

  const handleNextStep = () => {
    if (!activeStep) return;
    const currentIndex = allSteps.findIndex((s) => s.id === activeStep.id);
    const nextStep = allSteps[currentIndex + 1];
    if (nextStep) {
      setActiveStepId(nextStep.id);
    } else {
      toast.success("You have reached the end of the module.");
      queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
      navigate("/userDashboard");
    }
  };

  const handleCompleteAndContinue = (answers = null) => {
    if (!activeStep || completeStepMutation.isPending) return;
    completeStepMutation.mutate({ stepId: activeStep.id, answers });
  };

  const handlePrevious = () => {
    if (!activeStep) return;
    const currentIndex = allSteps.findIndex((s) => s.id === activeStep.id);
    const prevStep = allSteps[currentIndex - 1];
    if (prevStep) {
      setActiveStepId(prevStep.id);
    }
  };

  const acknowledgeLoopBack = () => {
    if (loopBackData?.loopBackStepId) {
      setActiveStepId(loopBackData.loopBackStepId);
    } else {
      setRetryCount((prev) => prev + 1);
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
    handleNextStep,
    handleCompleteAndContinue,
    handlePrevious,
    getAssessmentForStep,
    loopBackData,
    acknowledgeLoopBack,
    retryCount,
  };
}
