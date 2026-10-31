const User = require('../models/user');

// In-memory storage for Socket.IO instance
let io = null;

// Initialize Socket.IO instance
const initializeSocket = (socketIo) => {
  io = socketIo;
  console.log('🔄 WebSocket initialized for leaderboard');
};

// Get current leaderboard (filtered by difficulty)
const getLeaderboard = async (req, res) => {
  try {
    const difficulty = (req.query.difficulty && ['beginner', 'intermediate'].includes(req.query.difficulty.toLowerCase())) ? req.query.difficulty.toLowerCase() : req.user?.difficulty;

    // Validate difficulty
    if (!difficulty || !['beginner', 'intermediate'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Valid difficulty level required (beginner or intermediate)'
      });
    }

    // Fetch leaderboard filtered by difficulty
    const leaderboard = await User.find({ 
      field: 'user',
      difficulty: difficulty 
    })
      .select('team_name point solved_no difficulty createdAt')
      .sort({ point: -1, solved_no: -1, createdAt: 1 }); // Sort by points desc, then solved count desc, then earliest registration

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      team_name: user.team_name,
      points: user.point,
      solved_count: user.solved_no,
      difficulty: user.difficulty,
      user_id: user._id
    }));

    res.status(200).json({
      success: true,
      data: rankedLeaderboard,
      difficulty_level: difficulty,
      total_users: rankedLeaderboard.length,
      message: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} leaderboard fetched successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
};

// Get user's current rank (within their difficulty level)
const getUserRank = async (userId) => {
  try {
    // First get the user to know their difficulty level
    const user = await User.findById(userId);
    if (!user) return null;

    // Then calculate rank within their difficulty group
    const userRank = await User.aggregate([
      { $match: { field: 'user', difficulty: user.difficulty } },
      { $sort: { point: -1, solved_no: -1, createdAt: 1 } },
      { $group: {
          _id: null,
          users: { $push: '$$ROOT' }
        }
      },
      { $unwind: { path: '$users', includeArrayIndex: 'rank' } },
      { $match: { 'users._id': userId } },
      { $project: {
          _id: '$users._id',
          team_name: '$users.team_name',
          points: '$users.point',
          solved_count: '$users.solved_no',
          difficulty: '$users.difficulty',
          rank: { $add: ['$rank', 1] }
        }
      }
    ]);

    return userRank[0] || null;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
};

// Emit real-time leaderboard update to all connected clients
const emitLeaderboardUpdate = async (updatedUserId = null) => {
  if (!io) {
    console.log('⚠️ Socket.IO not initialized');
    return;
  }

  try {
    // Fetch and emit BEGINNER leaderboard
    const beginnerLeaderboard = await User.find({ field: 'user', difficulty: 'beginner' })
      .select('team_name point solved_no difficulty createdAt')
      .sort({ point: -1, solved_no: -1, createdAt: 1 });

    const rankedBeginnerLeaderboard = beginnerLeaderboard.map((user, index) => ({
      rank: index + 1,
      team_name: user.team_name,
      points: user.point,
      solved_count: user.solved_no,
      difficulty: user.difficulty,
      user_id: user._id.toString()
    }));

    // Emit beginner leaderboard
    io.emit('leaderboard_update_beginner', {
      leaderboard: rankedBeginnerLeaderboard,
      difficulty: 'beginner',
      timestamp: new Date().toISOString(),
      updated_user: updatedUserId
    });

    // Fetch and emit INTERMEDIATE leaderboard
    const intermediateLeaderboard = await User.find({ field: 'user', difficulty: 'intermediate' })
      .select('team_name point solved_no difficulty createdAt')
      .sort({ point: -1, solved_no: -1, createdAt: 1 });

    const rankedIntermediateLeaderboard = intermediateLeaderboard.map((user, index) => ({
      rank: index + 1,
      team_name: user.team_name,
      points: user.point,
      solved_count: user.solved_no,
      difficulty: user.difficulty,
      user_id: user._id.toString()
    }));

    // Emit intermediate leaderboard
    io.emit('leaderboard_update_intermediate', {
      leaderboard: rankedIntermediateLeaderboard,
      difficulty: 'intermediate',
      timestamp: new Date().toISOString(),
      updated_user: updatedUserId
    });

    // If specific user updated, emit their new rank within their difficulty level
    if (updatedUserId) {
      const userRank = await getUserRank(updatedUserId);
      if (userRank) {
        io.emit('user_rank_change', {
          user_id: updatedUserId,
          new_rank: userRank.rank,
          points: userRank.points,
          team_name: userRank.team_name,
          difficulty: userRank.difficulty,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log(`Leaderboard updates emitted for both difficulty levels`);
  } catch (error) {
    console.error('Error emitting leaderboard update:', error);
  }
};

// Handle new solve notification
const emitNewSolve = async (userId, questionTitle, pointsEarned) => {
  if (!io) return;

  try {
    const user = await User.findById(userId).select('team_name');
    
    io.emit('new_solve', {
      team_name: user.team_name,
      question_title: questionTitle,
      points_earned: pointsEarned,
      timestamp: new Date().toISOString()
    });

    console.log(`🎉 New solve notification: ${user.team_name} solved ${questionTitle}`);
  } catch (error) {
    console.error('Error emitting new solve:', error);
  }
};

module.exports = {
  initializeSocket,
  getLeaderboard,
  getUserRank,
  emitLeaderboardUpdate,
  emitNewSolve
};
