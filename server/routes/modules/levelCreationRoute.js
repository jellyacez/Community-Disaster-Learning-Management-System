const express = require("express");
const router = express.Router();
const {
  authenticate,
} = require("../../middleware/authenticate");
const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const { levelCreation } = require("../../controllers/modules/levelcontroller");
const requirePermission = require("../../middleware/requirePermission");

router.post(
  "/:moduleId",
  authenticate,
  requireRole(ADMIN_ROLES),
  requirePermission('manage_modules'),
  async (req, res) => {
    const { moduleId } = req.params;
    const { levelOrder, levelTitle, levelDescription } = req.body;

    try {
      const result = await levelCreation(
        moduleId,
        levelOrder,
        levelTitle,
        levelDescription,
      );

        return res.status(200).json({
        success: true,
        data:result,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred.",
      });
    }
  },
);
module.exports = router;