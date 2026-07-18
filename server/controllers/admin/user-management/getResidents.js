const UserService = require("../../../services/users/UserService");

// @desc    Get all users (residents) with pagination and optional filters
// @access  Private (admin/system_admin only)
exports.getResidents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "", status = "", barangay = "" } = req.query;
    
    // Pass the full user context to the service for structural scoping enforcement
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
    res.status(500).json({ success: false, error: { message: "Failed to fetch residents" } });
  }
};
