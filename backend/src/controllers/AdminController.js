const supabase = require('../config/supabase');

class AdminController {
  async me(req, res) {
    return res.json({
      success: true,
      data: {
        user: req.authUser,
        profile: req.profile
      }
    });
  }

  async listStaff(req, res) {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error('List staff error:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  async createStaff(req, res) {
    try {
      const {
        staff_code,
        full_name,
        department,
        position,
        email,
        phone,
        status
      } = req.body;

      if (!full_name) {
        return res.status(400).json({
          success: false,
          error: 'full_name is required'
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'email is required for staff login'
        });
      }

      const trimmedEmail = String(email).trim().toLowerCase();

      // 1. Create Supabase Auth user (no invite email, no password yet)
      //    Staff will set their own password via "Set Password" on user.html
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: trimmedEmail,
        email_confirm: true,
        user_metadata: { full_name: String(full_name).trim(), role: 'staff' }
      });

      if (authError) {
        if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
          return res.status(409).json({
            success: false,
            error: 'A user with this email already exists'
          });
        }
        throw authError;
      }

      const authUserId = authData.user.id;

      // 2. Create profiles row (for auth middleware compatibility)
      await supabase
        .from('profiles')
        .upsert({
          id: authUserId,
          full_name: String(full_name).trim(),
          role: 'staff'
        }, { onConflict: 'id' });

      // 3. Create staff_profiles row
      const code =
        (staff_code && String(staff_code).trim()) ||
        `STF-${Date.now().toString(36).toUpperCase()}`;

      const payload = {
        staff_code: code,
        full_name: String(full_name).trim(),
        department: department ? String(department).trim() : null,
        position: position ? String(position).trim() : null,
        email: trimmedEmail,
        phone: phone ? String(phone).trim() : null,
        status: status === 'inactive' ? 'inactive' : 'active',
        auth_user_id: authUserId,
        created_by: req.authUser.id
      };

      const { data, error } = await supabase
        .from('staff_profiles')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        // Rollback: delete the auth user if staff profile creation fails
        await supabase.auth.admin.deleteUser(authUserId);
        throw error;
      }

      return res.status(201).json({
        success: true,
        data,
        message: `Account created for ${trimmedEmail}. Staff must set their password on the check-in page.`
      });
    } catch (err) {
      console.error('Create staff error:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  async updateStaff(req, res) {
    try {
      const { id } = req.params;
      const {
        staff_code,
        full_name,
        department,
        position,
        email,
        phone,
        status
      } = req.body;

      const updatePayload = {};

      if (staff_code !== undefined) updatePayload.staff_code = String(staff_code).trim();
      if (full_name !== undefined) updatePayload.full_name = String(full_name).trim();
      if (department !== undefined) updatePayload.department = department ? String(department).trim() : null;
      if (position !== undefined) updatePayload.position = position ? String(position).trim() : null;
      if (email !== undefined) updatePayload.email = email ? String(email).trim() : null;
      if (phone !== undefined) updatePayload.phone = phone ? String(phone).trim() : null;
      if (status !== undefined) updatePayload.status = status === 'inactive' ? 'inactive' : 'active';

      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('staff_profiles')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error('Update staff error:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  async deleteStaff(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message: 'Staff profile deleted'
      });
    } catch (err) {
      console.error('Delete staff error:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  async listAbsence(req, res) {
    try {
      const { staffId } = req.query;

      let query = supabase
        .from('absence_records')
        .select(`
          *,
          staff_profiles (
            id,
            staff_code,
            full_name,
            department,
            position
          )
        `)
        .order('absence_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error('List absence error:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  async createAbsence(req, res) {
    try {
      const {
        staff_id,
        absence_date,
        absence_type,
        notes
      } = req.body;

      if (!staff_id || !absence_date || !absence_type) {
        return res.status(400).json({
          success: false,
          error: 'staff_id, absence_date, and absence_type are required'
        });
      }

      const payload = {
        staff_id,
        absence_date,
        absence_type,
        notes: notes ? String(notes).trim() : null,
        created_by: req.authUser.id
      };

      const { data, error } = await supabase
        .from('absence_records')
        .insert(payload)
        .select(`
          *,
          staff_profiles (
            id,
            staff_code,
            full_name,
            department,
            position
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        data
      });
    } catch (err) {
      console.error('Create absence error:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
  async listDepartments(req, res) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return res.json({ success: true, data });
    } catch (err) {
      console.error('List departments error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createDepartment(req, res) {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }

      const { data, error } = await supabase
        .from('departments')
        .insert({ name: String(name).trim(), created_by: req.authUser.id })
        .select('*')
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Create department error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('departments').delete().eq('id', id);

      if (error) throw error;

      return res.json({ success: true, message: 'Department deleted' });
    } catch (err) {
      console.error('Delete department error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async listPositions(req, res) {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select(`*, departments(name)`)
        .order('name', { ascending: true });

      if (error) throw error;

      return res.json({ success: true, data });
    } catch (err) {
      console.error('List positions error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createPosition(req, res) {
    try {
      const { name, department_id } = req.body;
      if (!name || !department_id) {
        return res.status(400).json({ success: false, error: 'name and department_id are required' });
      }

      const { data, error } = await supabase
        .from('positions')
        .insert({
          name: String(name).trim(),
          department_id,
          created_by: req.authUser.id
        })
        .select(`*, departments(name)`)
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Create position error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async deletePosition(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('positions').delete().eq('id', id);

      if (error) throw error;

      return res.json({ success: true, message: 'Position deleted' });
    } catch (err) {
      console.error('Delete position error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Shift Schedules (recurring weekly) ──

  async listShiftSchedules(req, res) {
    try {
      const { staffId } = req.query;
      let query = supabase
        .from('shift_schedules')
        .select(`*, staff_profiles(id, staff_code, full_name, department)`)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (staffId) query = query.eq('staff_id', staffId);

      const { data, error } = await query;
      if (error) throw error;

      return res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('List shift schedules error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createShiftSchedule(req, res) {
    try {
      const { staff_id, day_of_week, start_time, end_time } = req.body;

      if (!staff_id || day_of_week === undefined || !start_time) {
        return res.status(400).json({
          success: false,
          error: 'staff_id, day_of_week, and start_time are required'
        });
      }

      if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({ success: false, error: 'day_of_week must be 0-6 (Sun-Sat)' });
      }

      const { data, error } = await supabase
        .from('shift_schedules')
        .upsert({
          staff_id,
          day_of_week: parseInt(day_of_week),
          start_time,
          end_time: end_time || null,
          created_by: req.authUser.id
        }, { onConflict: 'staff_id,day_of_week' })
        .select(`*, staff_profiles(id, staff_code, full_name, department)`)
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Create shift schedule error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteShiftSchedule(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('shift_schedules').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true, message: 'Shift schedule deleted' });
    } catch (err) {
      console.error('Delete shift schedule error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Shift Overrides (one-off date assignments) ──

  async listShiftOverrides(req, res) {
    try {
      const { staffId, from, to } = req.query;
      let query = supabase
        .from('shift_overrides')
        .select(`*, staff_profiles(id, staff_code, full_name, department)`)
        .order('shift_date', { ascending: false });

      if (staffId) query = query.eq('staff_id', staffId);
      if (from) query = query.gte('shift_date', from);
      if (to) query = query.lte('shift_date', to);

      const { data, error } = await query;
      if (error) throw error;

      return res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('List shift overrides error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createShiftOverride(req, res) {
    try {
      const { staff_id, shift_date, start_time, end_time, notes } = req.body;

      if (!staff_id || !shift_date || !start_time) {
        return res.status(400).json({
          success: false,
          error: 'staff_id, shift_date, and start_time are required'
        });
      }

      const { data, error } = await supabase
        .from('shift_overrides')
        .upsert({
          staff_id,
          shift_date,
          start_time,
          end_time: end_time || null,
          notes: notes ? String(notes).trim() : null,
          created_by: req.authUser.id
        }, { onConflict: 'staff_id,shift_date' })
        .select(`*, staff_profiles(id, staff_code, full_name, department)`)
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Create shift override error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteShiftOverride(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('shift_overrides').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true, message: 'Shift override deleted' });
    } catch (err) {
      console.error('Delete shift override error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Get today's shift for a specific staff ──

  static async getStaffShiftForDate(staffId, date) {
    // Convert to UTC+7 (Asia/Jakarta) for correct local day/date
    const utc7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const dateStr = utc7.toISOString().split('T')[0];
    const dayOfWeek = utc7.getUTCDay(); // 0=Sun, in UTC+7

    // 1. Check for override first (takes priority)
    const { data: override } = await supabase
      .from('shift_overrides')
      .select('*')
      .eq('staff_id', staffId)
      .eq('shift_date', dateStr)
      .single();

    if (override) {
      return { start_time: override.start_time, end_time: override.end_time, source: 'override', notes: override.notes };
    }

    // 2. Fall back to recurring weekly schedule
    const { data: schedule } = await supabase
      .from('shift_schedules')
      .select('*')
      .eq('staff_id', staffId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (schedule) {
      return { start_time: schedule.start_time, end_time: schedule.end_time, source: 'schedule' };
    }

    return null; // No shift assigned
  }
}

module.exports = AdminController;