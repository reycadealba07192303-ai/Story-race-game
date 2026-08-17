const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Section = require('../models/Section');
const { auth } = require('../config/firebase');
const { AWARD_CATALOG, applyStreak, computeTotals, evaluateNewAwards } = require('../utils/awards');
const { createNotification } = require('../utils/notify');
const { logAudit } = require('../utils/audit');

function publicUser(user) {
  return {
    id: user._id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || '',
    section: user.section,
    sectionId: user.sectionId || null,
    xp: user.xp || 0,
    streak: user.streak || 0,
    awards: user.awards || [],
    emailVerified: Boolean(user.emailVerified),
    status: user.status || 'active',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function roleLabel(role) {
  if (role === 'teacher') return 'Teacher';
  if (role === 'admin') return 'Admin';
  return 'Student';
}

function roleColor(role) {
  if (role === 'teacher') return '#8B5CF6';
  if (role === 'admin') return '#F59E0B';
  return '#EC4899';
}

async function listUsers(req, res) {
  try {
    const { role, search } = req.query;
    const filter = {};

    if (req.user.role === 'teacher') {
      filter.role = 'student';
      if (req.user.sectionId) {
        filter.sectionId = req.user.sectionId;
      } else if (req.user.section && req.user.section !== 'NA') {
        filter.section = req.user.section;
      } else {
        return res.json({ users: [] });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    } else if (role && role !== 'all') {
      filter.role = role;
    }

    if (search?.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({
      users: users.map((u) => ({
        ...publicUser(u),
        roleLabel: roleLabel(u.role),
        color: roleColor(u.role),
      })),
    });
  } catch (err) {
    console.error('listUsers error:', err);
    return res.status(500).json({ message: 'Could not load users.' });
  }
}

async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (req.user.role === 'teacher') {
      const sameSection =
        (req.user.sectionId && String(user.sectionId) === String(req.user.sectionId)) ||
        (req.user.section && user.section === req.user.section);
      if (user.role !== 'student' || !sameSection) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    } else if (req.user.role !== 'admin' && String(req.user._id) !== String(user._id)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return res.json({
      user: {
        ...publicUser(user),
        roleLabel: roleLabel(user.role),
        color: roleColor(user.role),
      },
    });
  } catch (err) {
    console.error('getUser error:', err);
    return res.status(500).json({ message: 'Could not load user.' });
  }
}

async function getStats(req, res) {
  try {
    if (req.user.role === 'admin') {
      const [totalUsers, teachers, students, admins, activeStories, recentUsers] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'teacher' }),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'admin' }),
        Campaign.countDocuments({ published: true }),
        User.find().sort({ createdAt: -1 }).limit(8).lean(),
      ]);

      return res.json({
        stats: {
          totalUsers,
          teachers,
          students,
          admins,
          activeStories,
        },
        recentUsers: recentUsers.map((u) => ({
          ...publicUser(u),
          roleLabel: roleLabel(u.role),
          color: roleColor(u.role),
        })),
      });
    }

    if (req.user.role === 'teacher') {
      const sections = await Section.find({ teacherId: req.user._id }).lean();
      const sectionIds = sections.map((s) => s._id);
      const sectionNames = sections.map((s) => s.name);
      const studentFilter = {
        role: 'student',
        $or: [
          ...(sectionIds.length ? [{ sectionId: { $in: sectionIds } }] : []),
          ...(sectionNames.length ? [{ section: { $in: sectionNames } }] : []),
          ...(req.user.sectionId ? [{ sectionId: req.user.sectionId }] : []),
          ...(req.user.section && req.user.section !== 'NA' ? [{ section: req.user.section }] : []),
        ],
      };

      if (!studentFilter.$or.length) {
        return res.json({
          stats: { studentCount: 0, averageXp: 0, assignments: 0, topStreak: 0, topStreakName: '—' },
          students: [],
          assignments: [],
        });
      }

      const [students, assignments, topStudents, published] = await Promise.all([
        User.find(studentFilter).sort({ xp: -1 }).lean(),
        Campaign.countDocuments({ published: true }),
        User.find(studentFilter).sort({ xp: -1 }).limit(8).lean(),
        Campaign.find({ published: true }).sort({ createdAt: -1 }).limit(5).lean(),
      ]);

      const avgXp = students.length
        ? Math.round(students.reduce((sum, s) => sum + (s.xp || 0), 0) / students.length)
        : 0;

      const streakLeader = [...students].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];

      return res.json({
        stats: {
          studentCount: students.length,
          averageXp: avgXp,
          assignments,
          topStreak: streakLeader?.streak || 0,
          topStreakName: streakLeader?.name || '—',
        },
        students: topStudents.map((u) => ({
          ...publicUser(u),
          roleLabel: roleLabel(u.role),
          color: roleColor(u.role),
        })),
        assignments: published.map((c) => ({
          id: c._id,
          title: c.title,
          levels: c.numLevels || c.levels?.length || 0,
          createdAt: c.createdAt,
        })),
      });
    }

    // student
    const published = await Campaign.find({ published: true }).sort({ createdAt: -1 }).limit(5).lean();
    const leaderboardFilter = { role: 'student' };
    if (req.user.sectionId) leaderboardFilter.sectionId = req.user.sectionId;
    else if (req.user.section && req.user.section !== 'NA') leaderboardFilter.section = req.user.section;

    const leaderboard = await User.find(leaderboardFilter).sort({ xp: -1 }).limit(10).lean();
    const level = Math.floor((req.user.xp || 0) / 100) + 1;
    const totals = computeTotals(req.user);

    return res.json({
      stats: {
        xp: req.user.xp || 0,
        level,
        streak: req.user.streak || 0,
        storiesDone: totals.storiesCompleted,
        storiesTotal: published.length,
      },
      stories: published.map((c) => ({
        id: c._id,
        title: c.title,
        description: c.description,
        levels: c.numLevels || c.levels?.length || 0,
        theme: c.theme,
      })),
      leaderboard: leaderboard.map((u, index) => ({
        ...publicUser(u),
        rank: index + 1,
        isMe: String(u._id) === String(req.user._id),
      })),
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ message: 'Could not load stats.' });
  }
}

async function getLeaderboard(req, res) {
  try {
    const filter = { role: 'student' };
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    else if (req.query.section) filter.section = req.query.section;
    else if (req.user.role === 'student') {
      if (req.user.sectionId) filter.sectionId = req.user.sectionId;
      else if (req.user.section && req.user.section !== 'NA') filter.section = req.user.section;
    }

    const users = await User.find(filter).sort({ xp: -1 }).limit(50).lean();
    return res.json({
      leaderboard: users.map((u, index) => ({
        ...publicUser(u),
        rank: index + 1,
        isMe: String(u._id) === String(req.user._id),
      })),
    });
  } catch (err) {
    console.error('getLeaderboard error:', err);
    return res.status(500).json({ message: 'Could not load leaderboard.' });
  }
}

async function updateUser(req, res) {
  try {
    const { name, role, section, sectionId, status, xp, streak, avatar } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isSelf = String(req.user._id) === String(user._id);
    if (req.user.role !== 'admin' && !isSelf) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (name?.trim()) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar; // Allow any user to update their own avatar
    if (isSelf) {
      // users can update their own name only (admins can do more)
    }

    if (req.user.role === 'admin') {
      if (role && ['student', 'teacher', 'admin'].includes(role)) {
        user.role = role;
        await auth.setCustomUserClaims(user.firebaseUid, { role }).catch(() => {});
      }
      if (section !== undefined) user.section = section;
      if (sectionId !== undefined) user.sectionId = sectionId || null;
      if (status && ['active', 'pending', 'disabled'].includes(status)) user.status = status;
      if (typeof xp === 'number') user.xp = xp;
      if (typeof streak === 'number') user.streak = streak;
    }

    await user.save();

    await logAudit({
      req,
      action: 'user.updated',
      category: 'user',
      summary: `${req.user.name} updated user ${user.name}`,
      targetType: 'user',
      targetId: user._id,
      targetName: user.email,
      meta: { status: user.status, role: user.role },
    });

    return res.json({ user: publicUser(user), message: 'User updated.' });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ message: 'Could not update user.' });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const deletedName = user.name;
    const deletedEmail = user.email;
    const deletedId = user._id;

    await auth.deleteUser(user.firebaseUid).catch(() => {});
    await user.deleteOne();

    await logAudit({
      req,
      action: 'user.deleted',
      category: 'user',
      summary: `${req.user.name} deleted user ${deletedName}`,
      targetType: 'user',
      targetId: deletedId,
      targetName: deletedEmail,
    });

    return res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ message: 'Could not delete user.' });
  }
}

async function getAwards(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const owned = new Set(user.awards || []);
    const totals = computeTotals(user);

    return res.json({
      streak: user.streak || 0,
      lastActivityDate: user.lastActivityDate,
      totals,
      awards: AWARD_CATALOG.map((a) => ({
        ...a,
        unlocked: owned.has(a.id),
      })),
    });
  } catch (err) {
    console.error('getAwards error:', err);
    return res.status(500).json({ message: 'Could not load awards.' });
  }
}

async function getMyProgress(req, res) {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({ progress: user.storyProgress || [] });
  } catch (err) {
    console.error('getMyProgress error:', err);
    return res.status(500).json({ message: 'Could not load progress.' });
  }
}

async function recordLevelProgress(req, res) {
  try {
    const { campaignId, levelNumber, stars = 0, coins = 0, campaignCompleted = false } = req.body;
    if (!campaignId || !levelNumber) {
      return res.status(400).json({ message: 'campaignId and levelNumber are required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!Array.isArray(user.storyProgress)) user.storyProgress = [];
    let entry = user.storyProgress.find((p) => String(p.campaignId) === String(campaignId));
    if (!entry) {
      entry = { campaignId, levels: [], completed: false };
      user.storyProgress.push(entry);
    }

    const lvlIdx = entry.levels.findIndex((l) => l.levelNumber === levelNumber);
    const prevStars = lvlIdx >= 0 ? entry.levels[lvlIdx].stars || 0 : 0;
    const nextLevel = {
      levelNumber,
      stars: Math.max(prevStars, Number(stars) || 0),
      completed: true,
      coins: Number(coins) || 0,
    };
    if (lvlIdx >= 0) entry.levels[lvlIdx] = nextLevel;
    else entry.levels.push(nextLevel);

    if (campaignCompleted) entry.completed = true;

    const earnedXp = Math.max(0, (Number(stars) || 0) * 20);
    user.xp = (user.xp || 0) + earnedXp;
    applyStreak(user);

    const newlyUnlocked = evaluateNewAwards(user);
    await user.save();

    for (const award of newlyUnlocked) {
      await createNotification({
        userId: user._id,
        title: `Award unlocked: ${award.title}`,
        message: award.description,
        type: 'award',
        link: '/student/awards',
      });
    }

    if (campaignCompleted) {
      await createNotification({
        userId: user._id,
        title: 'Story completed!',
        message: 'Great job finishing a story. Check your awards and streak.',
        type: 'story',
        link: '/student/awards',
      });

      // Notify the teacher if the student is in a section
      if (user.sectionId) {
        try {
          const sectionDoc = await Section.findById(user.sectionId);
          if (sectionDoc && sectionDoc.teacherId) {
            const campDoc = await Campaign.findById(campaignId);
            await createNotification({
              userId: sectionDoc.teacherId,
              title: 'Student Completed Story',
              message: `${user.name} just finished "${campDoc ? campDoc.title : 'a story'}"!`,
              type: 'story',
              link: `/teacher/classes/${sectionDoc._id}`,
            });
          }
        } catch (e) {
          console.error('Failed to notify teacher on completion', e);
        }
      }
    }

    await logAudit({
      req,
      action: campaignCompleted ? 'progress.campaign_completed' : 'progress.level_completed',
      category: 'progress',
      summary: campaignCompleted
        ? `${user.name} completed a story (level ${levelNumber})`
        : `${user.name} completed level ${levelNumber}`,
      targetType: 'campaign',
      targetId: campaignId,
      meta: { levelNumber, stars, coins, campaignCompleted },
    });

    return res.json({
      message: 'Progress saved.',
      xp: user.xp,
      streak: user.streak,
      awards: user.awards,
      newlyUnlocked,
      progress: user.storyProgress,
    });
  } catch (err) {
    console.error('recordLevelProgress error:', err);
    return res.status(500).json({ message: 'Could not save progress.' });
  }
}

async function claimCampaignReward(req, res) {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ message: 'campaignId is required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });

    if (!Array.isArray(user.storyProgress)) user.storyProgress = [];
    const entry = user.storyProgress.find((p) => String(p.campaignId) === String(campaignId));
    if (!entry) {
      return res.status(400).json({ message: 'No progress found for this campaign.' });
    }
    if (entry.rewardClaimed) {
      return res.status(400).json({ message: 'Reward already claimed.' });
    }

    const numLevels = (campaign.levels || []).length || campaign.numLevels || 0;
    const completedLevels = (entry.levels || []).filter((l) => l.completed).length;
    const totalStars = (entry.levels || []).reduce((sum, l) => sum + (l.stars || 0), 0);
    const minStars = Math.floor(numLevels * 10 / 4);

    if (numLevels === 0 || completedLevels < numLevels || totalStars < minStars) {
      return res.status(400).json({ message: 'You do not qualify for this reward yet.' });
    }

    const bonusCoins = totalStars * 10;
    entry.rewardClaimed = true;
    entry.bonusCoins = bonusCoins;
    await user.save();

    await logAudit({
      req,
      action: 'progress.reward_claimed',
      category: 'progress',
      summary: `${user.name} claimed story reward (${bonusCoins} bonus coins)`,
      targetType: 'campaign',
      targetId: campaignId,
      meta: { bonusCoins, totalStars },
    });

    return res.json({
      message: 'Reward claimed!',
      bonusCoins,
      progress: user.storyProgress,
    });
  } catch (err) {
    console.error('claimCampaignReward error:', err);
    return res.status(500).json({ message: 'Could not claim reward.' });
  }
}

module.exports = {
  listUsers,
  getUser,
  getStats,
  getLeaderboard,
  updateUser,
  deleteUser,
  getAwards,
  getMyProgress,
  recordLevelProgress,
  claimCampaignReward,
};
