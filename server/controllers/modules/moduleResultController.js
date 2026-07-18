const ModuleService = require("../../services/modules/ModuleService");

const levelResult = async (moduleId, userId, answers) => {
    return await ModuleService.calculateAndSaveResult(moduleId, userId, answers);
};

module.exports = { levelResult };