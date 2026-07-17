const ModuleProgressService = require("../../services/modules/ModuleProgressService");

// @desc    Mark a step as complete (and optionally grade a quiz), update progress
// @access  Private
exports.completeModuleStep = async (req, res) => {
  const { id: mod_id, stepId } = req.params;
  const user_id = req.user?.id;
  const { answers } = req.body || {}; // Optional answers for quizzes

  try {
    const result = await ModuleProgressService.completeModuleStep(user_id, mod_id, stepId, answers);

    if (result && !result.passed) {
       return res.status(200).json({
            success: true,
            passed: false,
            score: result.score,
            totalPoints: result.totalPoints,
            percentage: result.percentage,
            loop_back_step_id: result.loop_back_step_id, 
            is_final_assessment: result.is_final_assessment,
            message: result.message
       });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Step completed successfully.",
      passed: true,
      quizGraded: result?.quizGraded || false,
      score: result?.score || 0,
      totalPoints: result?.totalPoints || 0,
      moduleCompleted: result?.moduleCompleted || false
    });
  } catch (error) {
    if (error.message === "NOT_ENROLLED") {
      return res.status(403).json({ success: false, message: "You are not enrolled in this module." });
    }
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Step not found." });
    }
    if (error.message === "ANSWERS_REQUIRED") {
      return res.status(400).json({ success: false, message: "Answers are required for this assessment step." });
    }
    if (error.message === "MODULE_HAS_NO_STEPS") {
      return res.status(400).json({ success: false, message: "This module has no steps and cannot be completed. Please contact your administrator." });
    }
    console.error("Error completing module step:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// @desc    Get the overall progress percentage for a module
// @access  Private
exports.getModuleProgress = async (req, res) => {
    const { id: moduleId } = req.params;
    const userId = req.user?.id;

    try {
        const progressData = await ModuleProgressService.getModuleProgress(userId, moduleId);
        return res.status(200).json({
            success: true,
            data: progressData
        });
    } catch (error) {
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Module not found."
            });
        }
        console.error("Error Fetching module progress:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error Occurred" 
        });
    }
};
