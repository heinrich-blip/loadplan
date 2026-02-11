-- Migration: Add verification and source fields for load arrival/departure times
ALTER TABLE loads
  ADD COLUMN actual_loading_arrival_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN actual_loading_departure_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN actual_offloading_arrival_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN actual_offloading_departure_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN actual_loading_arrival_source TEXT DEFAULT 'auto',
  ADD COLUMN actual_loading_departure_source TEXT DEFAULT 'auto',
  ADD COLUMN actual_offloading_arrival_source TEXT DEFAULT 'auto',
  ADD COLUMN actual_offloading_departure_source TEXT DEFAULT 'auto';

-- Optionally, add constraints for source values
-- (auto/manual)
CREATE TYPE load_time_source AS ENUM ('auto', 'manual');
ALTER TABLE loads
  ALTER COLUMN actual_loading_arrival_source TYPE load_time_source USING actual_loading_arrival_source::load_time_source,
  ALTER COLUMN actual_loading_departure_source TYPE load_time_source USING actual_loading_departure_source::load_time_source,
  ALTER COLUMN actual_offloading_arrival_source TYPE load_time_source USING actual_offloading_arrival_source::load_time_source,
  ALTER COLUMN actual_offloading_departure_source TYPE load_time_source USING actual_offloading_departure_source::load_time_source;
