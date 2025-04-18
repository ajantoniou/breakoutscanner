-- Migration to fix backtest_results schema
-- Add missing columns if they don't exist and ensure correct types

-- Add symbol column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'backtest_results'
        AND column_name = 'symbol'
    ) THEN
        ALTER TABLE public.backtest_results ADD COLUMN symbol TEXT;
        RAISE NOTICE 'Column symbol added to backtest_results.';
    ELSE
        RAISE NOTICE 'Column symbol already exists in backtest_results.';
    END IF;
END
$$;

-- Add pattern_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'backtest_results'
        AND column_name = 'pattern_type'
    ) THEN
        ALTER TABLE public.backtest_results ADD COLUMN pattern_type TEXT;
        RAISE NOTICE 'Column pattern_type added to backtest_results.';
    ELSE
        RAISE NOTICE 'Column pattern_type already exists in backtest_results.';
    END IF;
END
$$;

-- Add timeframe column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'backtest_results'
        AND column_name = 'timeframe'
    ) THEN
        ALTER TABLE public.backtest_results ADD COLUMN timeframe TEXT;
        RAISE NOTICE 'Column timeframe added to backtest_results.';
    ELSE
        RAISE NOTICE 'Column timeframe already exists in backtest_results.';
    END IF;
END
$$;

-- Ensure pattern_id is UUID type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'backtest_results'
        AND column_name = 'pattern_id'
        AND data_type = 'bigint' -- Check if it's currently bigint
    ) THEN
        -- Drop existing incorrect foreign key if it exists (referencing detected_patterns)
        ALTER TABLE public.backtest_results DROP CONSTRAINT IF EXISTS backtest_results_pattern_id_fkey;
        -- Change column type to UUID
        ALTER TABLE public.backtest_results ALTER COLUMN pattern_id TYPE UUID USING pattern_id::uuid;
        RAISE NOTICE 'Changed backtest_results.pattern_id type to UUID.';
    ELSE
        RAISE NOTICE 'backtest_results.pattern_id type is likely already correct or column doesn''t exist.';
    END IF;
END
$$;

-- Add foreign key constraint to cached_patterns if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_backtest_pattern_cached'
        AND table_name = 'backtest_results'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Drop the old incorrect FK from the other migration file if it exists
        ALTER TABLE public.backtest_results DROP CONSTRAINT IF EXISTS backtest_results_pattern_id_fkey;
        -- Add the correct FK
        ALTER TABLE public.backtest_results 
        ADD CONSTRAINT fk_backtest_pattern_cached 
        FOREIGN KEY (pattern_id) REFERENCES public.cached_patterns(id)
        ON DELETE SET NULL; -- Or ON DELETE CASCADE, depending on desired behavior
        RAISE NOTICE 'Foreign key fk_backtest_pattern_cached added to backtest_results referencing cached_patterns.';
    ELSE
        RAISE NOTICE 'Foreign key fk_backtest_pattern_cached already exists on backtest_results.';
    END IF;
END
$$;

-- Create indexes on the new columns for faster queries
CREATE INDEX IF NOT EXISTS idx_backtest_results_symbol ON public.backtest_results(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_results_pattern_type ON public.backtest_results(pattern_type);
CREATE INDEX IF NOT EXISTS idx_backtest_results_timeframe ON public.backtest_results(timeframe);

RAISE NOTICE 'Migration 20240801_fix_backtest_results_schema.sql completed.'; 