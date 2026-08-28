const Groq = require('groq-sdk');
const https = require('https');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { notifyMany } = require('../utils/notify');
const { logAudit } = require('../utils/audit');

// Initialize Groq — uses GROQ_API_KEY from .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Helper: generate illustration via Pollinations.ai (free, no API key) ──
async function generateIllustration(prompt, levelNumber) {
  const safePrompt = encodeURIComponent(
    `children's storybook illustration, colorful, ${prompt}`.slice(0, 400)
  );
  const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=600&seed=${levelNumber}&nologo=true&model=flux`;

  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      // Pollinations returns the image directly — follow redirect to get the final URL
      const finalUrl = res.headers['location'] || url;
      resolve(finalUrl);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── Helper: build the prompt ──────────────────────────────────────────────
function buildPrompt(title, description, targetSection, numLevels) {
  return `You are an expert educational game designer. Create a structured educational story campaign.
Title: "${title}"
Description: "${description}"
Target Audience: ${targetSection}
Number of Levels: ${numLevels}

Return a JSON object EXACTLY in this structure, with absolutely no markdown formatting, no code fences, no extra text — just the raw JSON:
{
  "title": "Title",
  "theme": "Core theme",
  "moralLesson": "Lesson learned",
  "levels": [
    {
      "levelNumber": 1,
      "storyNode": {
        "title": "Level Title",
        "content": "A 2-3 paragraph story piece for this level.",
        "vocabulary": [
          { "word": "Word", "definition": "Definition" }
        ]
      },
      "mediaPrompt": "A highly detailed prompt for an image generator to illustrate this level.",
      "quiz": [
        {
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A"
        }
      ]
    }
  ]
}
Ensure there are exactly ${numLevels} levels. Generate 3 quiz questions per level. Return ONLY the JSON object.`;
}

// ── Generate campaign ─────────────────────────────────────────────────────
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.status(200).json({ campaigns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns', details: error.message });
  }
};

exports.getPublishedCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ published: true }).sort({ scheduledAt: 1 });
    res.status(200).json({ campaigns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch published campaigns', details: error.message });
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.status(200).json({ campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign', details: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const title = campaign.title;
    const id = campaign._id;
    await campaign.deleteOne();

    await logAudit({
      req,
      action: 'campaign.deleted',
      category: 'campaign',
      summary: `${req.user?.name || 'User'} deleted campaign "${title}"`,
      targetType: 'campaign',
      targetId: id,
      targetName: title,
    });

    res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign', details: error.message });
  }
};

exports.generateCampaign = async (req, res) => {
  try {
    const { title, description, targetSection, numLevels, templateId, customTheme } = req.body;
    const themeLabel = templateId === 'others' && customTheme ? customTheme : (templateId || 'space');

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY is not set in the .env file.' });
    }

    // ── Step 1: Generate story text + quiz via Groq ──
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'user',
          content: buildPrompt(title, description, targetSection, numLevels) +
            `\nThe visual theme of this campaign is: "${themeLabel}". Incorporate this theme subtly into the story content and level titles.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    });

    let responseText = completion.choices[0]?.message?.content ?? '';
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const campaignData = JSON.parse(responseText);

    // ── Step 2: Generate one illustration per level in parallel (Pollinations.ai) ──
    const imageResults = await Promise.allSettled(
      (campaignData.levels || []).map((lvl, i) =>
        generateIllustration(
          lvl.mediaPrompt || `${title} level ${lvl.levelNumber || i + 1} scene`,
          lvl.levelNumber || i + 1
        )
      )
    );

    // ── Step 3: Attach generated image URLs to each level ──
    const levelsWithImages = (campaignData.levels || []).map((lvl, i) => {
      const imgUrl = imageResults[i]?.status === 'fulfilled' ? imageResults[i].value : null;
      return { ...lvl, customImage: imgUrl || null };
    });

    const newCampaign = new Campaign({
      title: campaignData.title,
      description,
      targetSection,
      theme: campaignData.theme,
      moralLesson: campaignData.moralLesson,
      numLevels,
      levels: levelsWithImages,
      templateId: templateId || 'space',
      customTheme: customTheme || null,
      storySource: 'ai',
    });

    await newCampaign.save();

    await logAudit({
      req,
      action: 'campaign.generated',
      category: 'campaign',
      summary: `${req.user?.name || 'User'} generated campaign "${newCampaign.title}"`,
      targetType: 'campaign',
      targetId: newCampaign._id,
      targetName: newCampaign.title,
    });

    res.status(201).json({ message: 'Campaign generated successfully!', campaign: newCampaign });
  } catch (error) {
    console.error('Error generating campaign:', error);
    res.status(500).json({ error: 'Failed to generate campaign', details: error.message });
  }
};

// ── Save pre-generated or manual campaign ─────────────────────────────────
exports.saveCampaign = async (req, res) => {
  try {
    const {
      title, description, targetSection, theme, moralLesson,
      numLevels, levels, templateId, customTheme, storySource,
    } = req.body;

    const newCampaign = new Campaign({
      title,
      description,
      targetSection,
      theme: theme || title,
      moralLesson: moralLesson || '',
      numLevels,
      levels,
      templateId: templateId || 'space',
      customTheme: customTheme || null,
      storySource: storySource || 'manual',
    });
    await newCampaign.save();

    await logAudit({
      req,
      action: 'campaign.saved',
      category: 'campaign',
      summary: `${req.user?.name || 'User'} saved campaign "${newCampaign.title}"`,
      targetType: 'campaign',
      targetId: newCampaign._id,
      targetName: newCampaign.title,
    });

    res.status(201).json({ message: 'Campaign saved successfully!', campaign: newCampaign });
  } catch (error) {
    console.error('Error saving campaign:', error);
    res.status(500).json({ error: 'Failed to save campaign', details: error.message });
  }
};

// ── Create blank manual campaign ──────────────────────────────────────────
exports.createManualCampaign = async (req, res) => {
  try {
    const { title, description, targetSection, numLevels, templateId, customTheme } = req.body;
    const count = Math.min(Math.max(Number(numLevels) || 5, 1), 10);

    const levels = Array.from({ length: count }, (_, i) => ({
      levelNumber: i + 1,
      storyNode: { title: `Level ${i + 1}`, content: '', vocabulary: [] },
      mediaPrompt: '',
      customImage: null,
      quiz: [],
    }));

    const newCampaign = new Campaign({
      title,
      description,
      targetSection,
      theme: title,
      moralLesson: '',
      numLevels: count,
      levels,
      templateId: templateId || 'space',
      customTheme: customTheme || null,
      storySource: 'manual',
    });

    await newCampaign.save();

    await logAudit({
      req,
      action: 'campaign.created',
      category: 'campaign',
      summary: `${req.user?.name || 'User'} created manual campaign "${newCampaign.title}"`,
      targetType: 'campaign',
      targetId: newCampaign._id,
      targetName: newCampaign.title,
    });

    res.status(201).json({ message: 'Manual campaign created!', campaign: newCampaign });
  } catch (error) {
    console.error('Error creating manual campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign', details: error.message });
  }
};

// ── Update / publish campaign ─────────────────────────────────────────────
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      levels,
      published,
      scheduledAt,
      title,
      description,
      targetSection,
      templateId,
      customTheme,
      numLevels,
      theme,
      moralLesson,
      coverImage,
    } = req.body;

    const before = await Campaign.findById(id);
    if (!before) return res.status(404).json({ error: 'Campaign not found' });

    const wasPublished = Boolean(before.published);
    const updated = await Campaign.findByIdAndUpdate(
      id,
      {
        ...(levels && { levels, numLevels: Array.isArray(levels) ? levels.length : undefined }),
        ...(numLevels !== undefined && { numLevels }),
        ...(published !== undefined && { published }),
        ...(scheduledAt !== undefined && { scheduledAt }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(targetSection !== undefined && { targetSection }),
        ...(templateId !== undefined && { templateId }),
        ...(customTheme !== undefined && { customTheme }),
        ...(theme !== undefined && { theme }),
        ...(moralLesson !== undefined && { moralLesson }),
        ...(coverImage !== undefined && { coverImage }),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Campaign not found' });

    // Notify students when a campaign becomes published
    if (!wasPublished && updated.published) {
      try {
        const filter = { role: 'student', status: { $ne: 'disabled' } };
        if (updated.targetSection && updated.targetSection !== 'All' && updated.targetSection !== 'NA') {
          filter.section = updated.targetSection;
        }
        const students = await User.find(filter).select('_id').lean();
        await notifyMany(
          students.map((s) => s._id),
          {
            title: 'New story available',
            message: `"${updated.title}" is ready to read in your section.`,
            type: 'story',
            link: '/student/section',
          }
        );
      } catch (notifyErr) {
        console.error('Publish notify failed:', notifyErr.message);
      }
    }

    await logAudit({
      req,
      action: !wasPublished && updated.published ? 'campaign.published' : 'campaign.updated',
      category: 'campaign',
      summary:
        !wasPublished && updated.published
          ? `${req.user?.name || 'User'} published campaign "${updated.title}"`
          : `${req.user?.name || 'User'} updated campaign "${updated.title}"`,
      targetType: 'campaign',
      targetId: updated._id,
      targetName: updated.title,
      meta: { published: Boolean(updated.published) },
    });

    res.status(200).json({ message: 'Campaign updated successfully', campaign: updated });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign', details: error.message });
  }
};

// ── Get student progress / leaderboard for a campaign ─────────────────────
exports.getCampaignProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // 1. Students who have already started this campaign
    const usersWithProgress = await User.find({
      role: 'student',
      'storyProgress.campaignId': id,
    }).select('name avatar section storyProgress');

    const startedIds = new Set(usersWithProgress.map(u => String(u._id)));

    const leaderboard = usersWithProgress.map(user => {
      const prog = user.storyProgress.find(sp => String(sp.campaignId) === String(id));
      const totalStars = prog?.levels?.reduce((sum, lvl) => sum + (lvl.stars || 0), 0) || 0;
      const completedLevels = prog?.levels?.filter(l => l.completed).length || 0;
      const progressPercent = Math.round((completedLevels / campaign.numLevels) * 100) || 0;
      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        section: user.section,
        totalStars,
        completedLevels,
        progressPercent,
        completed: prog?.completed || false,
        started: true,
      };
    });

    // Sort started students by stars then levels
    leaderboard.sort((a, b) => b.totalStars - a.totalStars || b.completedLevels - a.completedLevels);

    // 2. Students in the target section(s) who haven't started yet
    if (campaign.targetSection) {
      const sections = campaign.targetSection.split(',').map(s => s.trim()).filter(Boolean);
      const notStartedQuery = {
        role: 'student',
        _id: { $nin: [...startedIds] },
      };
      if (!sections.includes('All') && !sections.includes('NA')) {
        notStartedQuery.section = { $in: sections };
      }
      const notStartedUsers = await User.find(notStartedQuery).select('name avatar section');
      notStartedUsers.forEach(user => {
        leaderboard.push({
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          section: user.section,
          totalStars: 0,
          completedLevels: 0,
          progressPercent: 0,
          completed: false,
          started: false,
        });
      });
    }

    res.status(200).json({ campaign, leaderboard });
  } catch (error) {
    console.error('Error fetching campaign progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress', details: error.message });
  }
};
