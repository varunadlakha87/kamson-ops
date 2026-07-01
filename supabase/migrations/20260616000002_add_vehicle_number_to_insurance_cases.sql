-- Add vehicle_number to core_insurance_cases for motor insurance tracking
ALTER TABLE core_insurance_cases
  ADD COLUMN IF NOT EXISTS vehicle_number text DEFAULT '';
