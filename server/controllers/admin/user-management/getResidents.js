const UserService = require("../../../services/users/UserService");

exports.getResidents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "", status = "", barangay = "" } = req.query;
    
    const adminContext = req.user;

    const usersData = await UserService.getAllUsers(
      page,
      limit,
      search,
      role,
      status,
      barangay,
      adminContext
    );

    res.status(200).json({
      success: true,
      data: usersData.data,
      meta: usersData.meta
    });
  } catch (error) {
    console.error("Error fetching residents:", error);
    res.status(500).json({ success: false, message: "Failed to fetch residents." });
  }
};

