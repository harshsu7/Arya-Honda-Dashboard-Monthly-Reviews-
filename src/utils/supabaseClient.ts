import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://edjzvyiukvsvfcwybkbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkanp2eWl1a3ZzdmZjd3lia2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTM3MDgsImV4cCI6MjA3MzQ4OTcwOH0.iNRkt6wV9Zlw_CB3Ou9EHLIposY8455M1SmEccnohw4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Database table structure for KPI data
export interface KPIRecord {
  id?: number;
  tags: string;
  parameters: string;
  monthly_target: number;
  target_mtd: number;
  actual_as_on_date: number;
  shortfall: number;
  percentage_ach: number;
  location: string;
  uploaded_at?: string;
  file_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Upload session tracking
export interface UploadSession {
  id?: number;
  file_name: string;
  location: string;
  records_count: number;
  file_size: number;
  upload_status: 'success' | 'error' | 'processing';
  error_messages?: string[];
  uploaded_at?: string;
  created_at?: string;
}

// Function to save KPI data to Supabase
export const saveKPIData = async (data: KPIRecord[]): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('kpi_data')
      .insert(data);

    if (error) {
      console.error('Supabase insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving KPI data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Function to save upload session
export const saveUploadSession = async (session: UploadSession): Promise<{ success: boolean; sessionId?: number; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('upload_sessions')
      .insert([session])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase session insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, sessionId: data?.id };
  } catch (error) {
    console.error('Error saving upload session:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Function to get KPI data for a specific location
export const getKPIDataByLocation = async (location: string): Promise<{ data: KPIRecord[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('kpi_data')
      .select('*')
      .eq('location', location)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      
      // Handle table not found error gracefully
      if (error.code === 'PGRST205' || error.message.includes('could not find') || error.message.includes('does not exist')) {
        return { 
          data: [], 
          error: 'Database tables not set up. Please run the database setup script first.' 
        };
      }
      
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Function to get all upload sessions
export const getUploadSessions = async (): Promise<{ data: UploadSession[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Limit to recent 50 uploads

    if (error) {
      console.error('Supabase fetch error:', error);
      
      // Handle table not found error gracefully
      if (error.code === 'PGRST205' || error.message.includes('could not find') || error.message.includes('does not exist')) {
        return { 
          data: [], 
          error: 'Database tables not set up. Please run the database setup script first.' 
        };
      }
      
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    console.error('Error fetching upload sessions:', error);
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Function to get KPI data for all locations
export const getAllKPIData = async (): Promise<{ data: KPIRecord[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('kpi_data')
      .select('*')
      .order('location', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      
      // Handle table not found error gracefully
      if (error.code === 'PGRST205' || error.message.includes('could not find') || error.message.includes('does not exist')) {
        return {
          data: [], 
          error: 'Database tables not set up. Please run the database setup script first.' 
        };
      }
      
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    console.error('Error fetching all KPI data:', error);
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Function to delete old KPI data for a location (before adding new data)
export const deleteKPIDataByLocation = async (location: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('kpi_data')
      .delete()
      .eq('location', location);

    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting KPI data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};