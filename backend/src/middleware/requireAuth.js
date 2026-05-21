const supabase = require('../config/supabase');

// In-memory cache: token -> { user, profile, expiresAt }
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanCache() {
  const now = Date.now();
  for (const [key, val] of tokenCache) {
    if (val.expiresAt < now) tokenCache.delete(key);
  }
}
setInterval(cleanCache, 60 * 1000);

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing Authorization bearer token'
      });
    }

    // Check cache first
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      req.authUser = cached.user;
      req.profile = cached.profile;
      return next();
    }

    // Validate with Supabase (with timeout)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let data, error;
    try {
      const result = await supabase.auth.getUser(token);
      data = result.data;
      error = result.error;
    } catch (fetchErr) {
      clearTimeout(timeout);
      // On timeout/network error, use cache even if expired
      if (cached) {
        req.authUser = cached.user;
        req.profile = cached.profile;
        return next();
      }
      console.error('[requireAuth] Supabase unreachable:', fetchErr.message);
      return res.status(503).json({ success: false, error: 'Auth service temporarily unavailable' });
    }
    clearTimeout(timeout);

    if (error || !data || !data.user) {
      tokenCache.delete(token);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token'
      });
    }

    const user = data.user;

    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const role = user.user_metadata?.role || 'staff';

      const { data: newProfile, error: createErr } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: fullName, role: role }, { onConflict: 'id' })
        .select('id, full_name, role')
        .single();

      if (createErr || !newProfile) {
        console.error('[requireAuth] Auto-create profile failed:', createErr?.message);
        return res.status(403).json({
          success: false,
          error: 'Profile not found and could not be auto-created'
        });
      }
      profile = newProfile;
    }

    // Cache the result
    tokenCache.set(token, { user, profile, expiresAt: Date.now() + CACHE_TTL });

    req.authUser = user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error('[requireAuth] Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Authentication middleware failed'
    });
  }
}

module.exports = requireAuth;