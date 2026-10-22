const sessions = new Map();
let ownerId = null;

// Attempts belong to one signed-in user; a different user starts clean
export const setQuizSessionOwner = (userId) => {
  if (userId && userId !== ownerId) {
    sessions.clear();
    ownerId = userId;
  }
};

export const getQuizSession = (stepId) => sessions.get(String(stepId)) || null;

export const saveQuizSession = (stepId, session) => {
  sessions.set(String(stepId), session);
};

export const clearQuizSession = (stepId) => {
  sessions.delete(String(stepId));
};

// An attempt exists from the moment its questions are shown until it is submitted
export const isQuizInProgress = (stepId) => sessions.has(String(stepId));
