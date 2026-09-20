-- Migration: 09_add_level_cover_image.sql
-- Description: Add cover_image column to levels table for Phase Motivator Photos in CurriculumMap
ALTER TABLE public.levels
ADD COLUMN IF NOT EXISTS cover_image TEXT;
