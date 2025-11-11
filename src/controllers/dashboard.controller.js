import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Marketplace from "../models/marketplace.model.js";
import Subscription from "../models/subscription.model.js";

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Calculate date ranges
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total active users (users with roles assigned)
    const totalUsers = await User.countDocuments({ roles: { $exists: true, $ne: [] } });

    // Get total publications (posts)
    const totalPosts = await Post.countDocuments();

    // Get active events (for now, using marketplace items as events, or we can use posts with type 'community')
    // You can modify this based on your actual events model
    const activeEvents = await Post.countDocuments({ type: 'community' });
    // Alternative: const activeEvents = await Marketplace.countDocuments();

    // Get new members (users created in last 30 days)
    const newMembers = await User.countDocuments({
      createdAt: { $gte: last30Days }
    });

    // Get weekly visits data (using posts created per day for the last 7 days)
    // Aggregate by date and then map to day names
    const weeklyVisits = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get weekly new users data
    const weeklyNewUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create chart data for the last 7 days (most recent 7 days)
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const chartData = [];
    
    // Get the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = dayNames[dayOfWeek];
      
      const visitsData = weeklyVisits.find(w => w._id === dateStr) || { count: 0 };
      const usersData = weeklyNewUsers.find(w => w._id === dateStr) || { count: 0 };
      
      chartData.push({
        name: dayName,
        visitas: visitsData.count,
        nuevosUsuarios: usersData.count,
        conversiones: Math.floor(visitsData.count * 0.15) // Approximate conversions (15% of visits)
      });
    }

    // Calculate totals from chart data
    const totalVisits = chartData.reduce((sum, day) => sum + day.visitas, 0);
    const visitCounts = chartData.map(d => d.visitas);
    const maxVisits = visitCounts.length > 0 ? Math.max(...visitCounts) : 0;
    const maxDay = chartData.find(d => d.visitas === maxVisits)?.name || 'Dom';
    const averageVisits = totalVisits > 0 ? Math.floor(totalVisits / 7) : 0;

    res.status(200).json({
      stats: {
        activeUsers: totalUsers,
        publications: totalPosts,
        activeEvents: activeEvents,
        newMembers: newMembers
      },
      chartData: chartData,
      weeklyStats: {
        totalVisits: totalVisits,
        maximum: maxVisits,
        maximumDay: maxDay,
        average: averageVisits
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    res.status(500).json({ 
      message: "Error fetching dashboard statistics", 
      error: error.message 
    });
  }
};

