-- Create the model_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS model_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_patterns INTEGER NOT NULL,
    success_rate DECIMAL(5,2) NOT NULL,
    avg_profit_loss DECIMAL(5,2) NOT NULL,
    avg_days_to_breakout DECIMAL(5,2) NOT NULL,
    timeframe_metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_model_metrics_date ON model_metrics(date);

-- Create the scheduled task to run daily at midnight
SELECT cron.schedule(
    'daily-backtest-sync',  -- unique job name
    '0 0 * * *',           -- cron schedule (midnight every day)
    $$
    SELECT
        net.http_post(
            url := 'https://ttmeplqmrjhysyqzuaoh.supabase.co/functions/v1/daily-sync',
            headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'
        ) AS request_id;
    $$
); 