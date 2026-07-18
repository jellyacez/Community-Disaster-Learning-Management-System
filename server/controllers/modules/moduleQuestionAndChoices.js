const ModuleService = require("../../services/modules/ModuleService");

const questionCreation = async (moduleId, questionText, points, imageURL, stepId = null) => {
    return await ModuleService.createQuestion(moduleId, questionText, points, imageURL, stepId);
}

const choicesCreation = async (questionId, choiceText, isCorrect, rationale = null) => {
    return await ModuleService.createChoice(questionId, choiceText, isCorrect, rationale);
}

module.exports = { questionCreation, choicesCreation };