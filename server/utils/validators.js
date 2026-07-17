/**
 * Validates the module creation payload manually.
 * Returns an object { isValid: boolean, error: string | null }
 */
exports.validateModuleCreation = (payload) => {
  if (!payload) return { isValid: false, error: "Payload is empty." };
  
  if (typeof payload.moduleName !== 'string' || payload.moduleName.trim() === '') {
    return { isValid: false, error: "Module name is required and must be a string." };
  }

  if (typeof payload.moduleCategory !== 'string' || payload.moduleCategory.trim() === '') {
    return { isValid: false, error: "Module category is required." };
  }

  if (typeof payload.description !== 'string' || payload.description.trim() === '' || payload.description === '<p></p>') {
    return { isValid: false, error: "Module description is required." };
  }

  const validateUrl = (urlString, fieldName, requireImageExtension = false) => {
    if (!urlString || typeof urlString !== 'string' || urlString.trim() === '') return null;
    try {
      const url = new URL(urlString);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return `${fieldName} must be a valid HTTP or HTTPS link.`;
      }
      
      if (requireImageExtension) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const pathname = url.pathname.toLowerCase();
        const hasValidExtension = imageExtensions.some(ext => pathname.endsWith(ext));
        
        if (!hasValidExtension) {
           return `${fieldName} must point directly to an image file (.jpg, .png, .webp, etc).`;
        }
      }
      return null;
    } catch (e) {
      return `${fieldName} format is invalid.`;
    }
  };

  const imageError = validateUrl(payload.image_url, "Thumbnail URL", true);
  if (imageError) return { isValid: false, error: imageError };

  const videoError = validateUrl(payload.video_url, "Video URL", false);
  if (videoError) return { isValid: false, error: videoError };

  if (!Array.isArray(payload.levels) || payload.levels.length === 0) {
    return { isValid: false, error: "At least one level is required." };
  }

  // Validate each level
  for (let i = 0; i < payload.levels.length; i++) {
    const level = payload.levels[i];
    
    if (typeof level.levelTitle !== 'string' || level.levelTitle.trim() === '') {
      return { isValid: false, error: `Level ${i + 1} is missing a valid title.` };
    }

    if (!Array.isArray(level.steps) || level.steps.length === 0) {
      return { isValid: false, error: `Level ${i + 1} must contain at least one step.` };
    }

    // Validate each step
    for (let j = 0; j < level.steps.length; j++) {
      const step = level.steps[j];
      
      if (typeof step.stepTitle !== 'string' || step.stepTitle.trim() === '') {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} is missing a title.` };
      }

      if (typeof step.stepType !== 'string' || step.stepType.trim() === '') {
        return { isValid: false, error: `Step ${j + 1} in Level ${i + 1} is missing a step type.` };
      }

      // If it's an assessment, it should have questions
      if (['quiz', 'priority_action', 'hazard_identification', 'action_sequence'].includes(step.stepType)) {
        if (!Array.isArray(step.quizQuestions) || step.quizQuestions.length === 0) {
          return { isValid: false, error: `Assessment step '${step.stepTitle}' must contain at least one question.` };
        }

        for (const q of step.quizQuestions) {
          if (typeof q.questionText !== 'string' || q.questionText.trim() === '') {
            return { isValid: false, error: `A question in '${step.stepTitle}' is missing text.` };
          }
          if (!Array.isArray(q.options) || q.options.length === 0) {
            return { isValid: false, error: `A question in '${step.stepTitle}' must have options.` };
          }
        }
      }
    }
  }

  return { isValid: true, error: null };
};
