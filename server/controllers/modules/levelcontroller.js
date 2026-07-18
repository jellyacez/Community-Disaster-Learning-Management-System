const ModuleService = require("../../services/modules/ModuleService");

const levelCreation = async (moduleId,levelOrder,levelTitle,levelDescription)=> {
    return await ModuleService.createLevel(moduleId, levelOrder, levelTitle, levelDescription);
}

module.exports = {levelCreation};
