# Arya Honda Dashboard - Database Setup Instructions

## Quick Setup Guide

Your dashboard is ready to use with sample data, but to enable persistent data storage and CSV uploads, you need to set up the Supabase database tables.

### Step 1: Access Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `edjzvyiukvsvfcwybkbn`
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Database Setup Script

1. Click **"New Query"** in the SQL Editor
2. Copy the entire contents of the `database-setup.sql` file
3. Paste it into the query editor
4. Click **"Run"** to execute the script

### Step 3: Verify Setup

After running the script, you should see:
- ✅ Two new tables created: `kpi_data` and `upload_sessions`
- ✅ Sample data inserted for testing
- ✅ Row Level Security policies enabled

### Step 4: Test the Integration

1. Go to the **Data Upload** tab in your dashboard
2. Select a location from the dropdown
3. Upload a CSV file with your KPI data
4. Verify the data appears in both the dashboard and Supabase

## Database Schema

### `kpi_data` Table
Stores all KPI metrics from CSV uploads:
- `tags` - Category (INFLOW, LABOUR, PARTS, etc.)
- `parameters` - Specific metric name
- `monthly_target` - Target value for the month
- `target_mtd` - Month-to-date target
- `actual_as_on_date` - Actual performance value
- `shortfall` - Difference between target and actual
- `percentage_ach` - Achievement percentage
- `location` - Service center location
- `file_name` - Original CSV filename
- `uploaded_at` - Upload timestamp

### `upload_sessions` Table
Tracks upload history and status:
- `file_name` - Name of uploaded file
- `location` - Target location
- `records_count` - Number of records processed
- `file_size` - File size in bytes
- `upload_status` - success/error/processing
- `error_messages` - Any errors encountered
- `uploaded_at` - Upload timestamp

## Security

The database is configured with Row Level Security (RLS) policies that allow:
- ✅ Anonymous read access to all data
- ✅ Anonymous insert access for new uploads  
- ✅ Anonymous delete access (for replacing location data)

You can modify these policies in Supabase → Authentication → Policies if needed.

## Troubleshooting

### Error: "Could not find the table 'public.kpi_data'"
- **Solution**: Run the `database-setup.sql` script first

### CSV Upload Not Working
- **Check**: Ensure your CSV has the exact column headers specified in the dashboard
- **Check**: File size should be under 10MB
- **Check**: Location must be selected before upload

### Data Not Persisting
- **Check**: Database tables are created and policies are enabled
- **Check**: Supabase project URL and anon key are correct in `supabaseClient.ts`

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify the database setup script ran successfully
3. Check Supabase logs in your project dashboard
4. Ensure your CSV format matches the expected structure

Your dashboard will work with default data even without the database setup, but uploads and data persistence require the database tables to be created first.