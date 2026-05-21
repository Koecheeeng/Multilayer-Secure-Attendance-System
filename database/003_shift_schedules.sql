-- Shift Schedules: recurring weekly shifts per staff
CREATE TABLE IF NOT EXISTS public.shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, day_of_week)
);

-- Shift Overrides: one-off date-specific shifts (takes priority over recurring)
CREATE TABLE IF NOT EXISTS public.shift_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, shift_date)
);

-- Add late tracking columns to attendance_records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS late_minutes INT DEFAULT 0;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shift_schedules_staff ON public.shift_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_shift_overrides_staff_date ON public.shift_overrides(staff_id, shift_date);

-- RLS policies
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all shift_schedules" ON public.shift_schedules;
CREATE POLICY "Allow all shift_schedules" ON public.shift_schedules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.shift_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all shift_overrides" ON public.shift_overrides;
CREATE POLICY "Allow all shift_overrides" ON public.shift_overrides FOR ALL USING (true) WITH CHECK (true);
