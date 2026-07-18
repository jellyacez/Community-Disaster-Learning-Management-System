const ModuleService = require("../../services/modules/ModuleService");

 const stepCreation = async (levelId, stepOrder, stepTitle, stepContent, mediaUrl, stepType) => {
    try {
        return await ModuleService.createStep(levelId, stepOrder, stepTitle, stepContent, mediaUrl, stepType);
    } catch (error) {
        console.error("Database error during step creation:", error);
        throw new Error("Failed to create module step.");
    }
 }

module.exports = { stepCreation };
