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

      const code =
        (staff_code && String(staff_code).trim()) ||
        `STF-${Date.now().toString(36).toUpperCase()}`;

      const payload = {
        staff_code: code,
        full_name: String(full_name).trim(),
        department: department ? String(department).trim() : null,
        position: position ? String(position).trim() : null,
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        status: status === 'inactive' ? 'inactive' : 'active',
        created_by: req.authUser.id
      };

      const { data, error } = await supabase
        .from('staff_profiles')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        data
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
}

module.exports = AdminController;