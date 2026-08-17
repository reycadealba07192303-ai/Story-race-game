/** Catalog of unlockable student awards */
const AWARD_CATALOG = [
  {
    id: 'first_story',
    title: 'First Chapter',
    description: 'Complete your first story campaign.',
    icon: '📖',
    color: '#10B981',
    requirement: { type: 'stories', count: 1 },
  },
  {
    id: 'story_trio',
    title: 'Story Trio',
    description: 'Finish 3 story campaigns.',
    icon: '📚',
    color: '#6366F1',
    requirement: { type: 'stories', count: 3 },
  },
  {
    id: 'bookworm',
    title: 'Bookworm',
    description: 'Finish 5 story campaigns.',
    icon: '🐛',
    color: '#8B5CF6',
    requirement: { type: 'stories', count: 5 },
  },
  {
    id: 'star_collector',
    title: 'Star Collector',
    description: 'Earn 15 stars across all quizzes.',
    icon: '⭐',
    color: '#F59E0B',
    requirement: { type: 'stars', count: 15 },
  },
  {
    id: 'perfect_reader',
    title: 'Perfect Reader',
    description: 'Earn 30 stars across all quizzes.',
    icon: '🌟',
    color: '#EAB308',
    requirement: { type: 'stars', count: 30 },
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    description: 'Maintain a 3-day reading streak.',
    icon: '🔥',
    color: '#EF4444',
    requirement: { type: 'streak', count: 3 },
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day reading streak.',
    icon: '💪',
    color: '#EC4899',
    requirement: { type: 'streak', count: 7 },
  },
  {
    id: 'streak_14',
    title: 'Unstoppable',
    description: 'Maintain a 14-day reading streak.',
    icon: '🏆',
    color: '#F97316',
    requirement: { type: 'streak', count: 14 },
  },
  {
    id: 'xp_500',
    title: 'Rising Star',
    description: 'Reach 500 XP.',
    icon: '⚡',
    color: '#06B6D4',
    requirement: { type: 'xp', count: 500 },
  },
  {
    id: 'xp_1000',
    title: 'Legend',
    description: 'Reach 1,000 XP.',
    icon: '👑',
    color: '#A855F7',
    requirement: { type: 'xp', count: 1000 },
  },
];

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Update streak based on last activity date (calendar days). */
function applyStreak(user) {
  const today = dayKey();
  const last = user.lastActivityDate ? dayKey(new Date(user.lastActivityDate)) : null;

  if (!last) {
    user.streak = 1;
  } else if (last === today) {
    // already counted today
  } else if (daysBetween(last, today) === 1) {
    user.streak = (user.streak || 0) + 1;
  } else {
    user.streak = 1;
  }
  user.lastActivityDate = new Date();
  return user.streak;
}

function computeTotals(user) {
  const progress = user.storyProgress || [];
  const storiesCompleted = progress.filter((p) => p.completed).length;
  const stars = progress.reduce(
    (sum, p) => sum + (p.levels || []).reduce((s, l) => s + (l.stars || 0), 0),
    0
  );
  return {
    storiesCompleted,
    stars,
    streak: user.streak || 0,
    xp: user.xp || 0,
  };
}

function evaluateNewAwards(user) {
  const totals = computeTotals(user);
  const owned = new Set(user.awards || []);
  const newlyUnlocked = [];

  for (const award of AWARD_CATALOG) {
    if (owned.has(award.id)) continue;
    const { type, count } = award.requirement;
    let met = false;
    if (type === 'stories') met = totals.storiesCompleted >= count;
    if (type === 'stars') met = totals.stars >= count;
    if (type === 'streak') met = totals.streak >= count;
    if (type === 'xp') met = totals.xp >= count;
    if (met) {
      newlyUnlocked.push(award);
      owned.add(award.id);
    }
  }

  user.awards = Array.from(owned);
  return newlyUnlocked;
}

module.exports = {
  AWARD_CATALOG,
  applyStreak,
  computeTotals,
  evaluateNewAwards,
};
