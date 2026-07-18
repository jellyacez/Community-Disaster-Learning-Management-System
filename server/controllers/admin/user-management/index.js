const { updateUser } = require("./updateUser");
const { resetUserPassword } = require("./resetUserPassword");
const { provisionAdmin } = require("./provisionAdmin");
const { updateUserRole } = require("./roleManagement");
const { banUser, unbanUser } = require("./banManagement");
const { archiveUser, bulkArchiveUsers } = require("./archiveManagement");
const { getResidents } = require("./getResidents");

module.exports = {
  updateUser,
  resetUserPassword,
  provisionAdmin,
  updateUserRole,
  banUser,
  unbanUser,
  archiveUser,
  bulkArchiveUsers,
  getResidents,
};
