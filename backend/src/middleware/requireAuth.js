const supabase = require('../config/supabase');

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

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token'
      });
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        error: 'Profile not found. Create a row in public.profiles for this user.'
      });
    }

    req.authUser = user;
    req.profile = profile;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      success: false,
      error: 'Authentication middleware failed'
    });
  }
}

module.exports = requireAuth;