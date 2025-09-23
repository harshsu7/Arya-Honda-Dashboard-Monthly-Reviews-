import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Upload, FileText, X, CheckCircle, AlertCircle, Download, Eye, Database } from "lucide-react";
import Papa from "papaparse";
import { saveKPIData, saveUploadSession, getKPIDataByLocation, getUploadSessions, deleteKPIDataByLocation, type KPIRecord, type UploadSession } from "../utils/supabaseClient";

interface CSVRow {
  Tags: string;
  Parameters: string;
  "Monthly Target": number;
  "Target MTD": number;
  "Actual As On Date": number;
  Shortfall: number;
  "% ACH": number;
  Location: string;
}

interface UploadedFile {
  id: string;
  name: string;
  location: string;
  data: CSVRow[];
  uploadedAt: string;
  status: 'success' | 'error' | 'processing';
  errors?: string[];
  fileSize?: number;
}

interface CSVUploadProps {
  onDataUpload: (data: CSVRow[], location: string) => void;
  uploadedData: {[location: string]: CSVRow[]};
}

export function CSVUpload({ onDataUpload, uploadedData }: CSVUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentSessions, setRecentSessions] = useState<UploadSession[]>([]);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  const locations = ["Kalina", "Sewri", "Reayroad", "Bhandup", "Dockyard Road"];

  // Load recent upload sessions on component mount
  useEffect(() => {
    const loadRecentSessions = async () => {
      const { data, error } = await getUploadSessions();
      if (error && error.includes('Database tables not set up')) {
        setDatabaseError(error);
      } else {
        setRecentSessions(data);
        setDatabaseError(null);
      }
    };
    loadRecentSessions();
  }, []);

  const validateCSVRow = (row: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const requiredFields = ['Tags', 'Parameters', 'Monthly Target', 'Target MTD', 'Actual As On Date', 'Shortfall', '% ACH'];
    
    // Check for required fields
    requiredFields.forEach(field => {
      if (!(field in row) || row[field] === null || row[field] === undefined || row[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate numeric fields
    const numericFields = ['Monthly Target', 'Target MTD', 'Actual As On Date', 'Shortfall', '% ACH'];
    numericFields.forEach(field => {
      if (field in row && row[field] !== '' && isNaN(parseFloat(row[field]))) {
        errors.push(`Invalid numeric value in field: ${field}`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  };

  const parseCSVWithPapa = (file: File): Promise<{ data: CSVRow[]; errors: string[] }> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string, header: string) => {
          // Clean the value
          const cleanValue = value.trim().replace(/"/g, '');
          
          // Convert numeric fields
          const numericFields = ['Monthly Target', 'Target MTD', 'Actual As On Date', 'Shortfall', '% ACH'];
          if (numericFields.includes(header)) {
            const numValue = parseFloat(cleanValue);
            return isNaN(numValue) ? 0 : numValue;
          }
          
          return cleanValue;
        },
        complete: (results) => {
          const validData: CSVRow[] = [];
          const allErrors: string[] = [];
          
          if (results.errors && results.errors.length > 0) {
            results.errors.forEach(error => {
              allErrors.push(`Parse Error: ${error.message}`);
            });
          }
          
          results.data.forEach((row: any, index: number) => {
            const validation = validateCSVRow(row);
            if (validation.isValid) {
              // Ensure Location field exists
              if (!row.Location) {
                row.Location = selectedLocation;
              }
              validData.push(row as CSVRow);
            } else {
              validation.errors.forEach(error => {
                allErrors.push(`Row ${index + 2}: ${error}`);
              });
            }
          });
          
          resolve({ data: validData, errors: allErrors });
        },
        error: (error) => {
          resolve({ data: [], errors: [`File parsing failed: ${error.message}`] });
        }
      });
    });
  };

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !selectedLocation) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        const errorFile: UploadedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          location: selectedLocation,
          data: [],
          uploadedAt: new Date().toLocaleString(),
          status: 'error',
          errors: [`File size (${formatFileSize(file.size)}) exceeds the 10MB limit.`],
          fileSize: file.size
        };
        
        setUploadedFiles(prev => [...prev, errorFile]);
        continue;
      }

      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Create initial file entry with processing status
        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const processingFile: UploadedFile = {
          id: fileId,
          name: file.name,
          location: selectedLocation,
          data: [],
          uploadedAt: new Date().toLocaleString(),
          status: 'processing',
          fileSize: file.size
        };
        
        setUploadedFiles(prev => [...prev, processingFile]);
        
        try {
          // Parse CSV with Papa Parse
          const { data, errors } = await parseCSVWithPapa(file);
          
          let uploadSuccess = false;
          let uploadErrors: string[] = [...errors];

          // If we have valid data, save to Supabase
          if (data.length > 0) {
            // Convert CSV data to KPI record format
            const kpiRecords: KPIRecord[] = data.map(row => ({
              tags: row.Tags,
              parameters: row.Parameters,
              monthly_target: row["Monthly Target"],
              target_mtd: row["Target MTD"],
              actual_as_on_date: row["Actual As On Date"],
              shortfall: row.Shortfall,
              percentage_ach: row["% ACH"],
              location: row.Location || selectedLocation,
              file_name: file.name,
              uploaded_at: new Date().toISOString()
            }));

            // Delete existing data for this location before inserting new data
            const deleteResult = await deleteKPIDataByLocation(selectedLocation);
            if (!deleteResult.success) {
              uploadErrors.push(`Warning: Could not clear existing data - ${deleteResult.error}`);
            }

            // Save to Supabase
            const saveResult = await saveKPIData(kpiRecords);
            if (saveResult.success) {
              uploadSuccess = true;
              
              // Save upload session
              const session: UploadSession = {
                file_name: file.name,
                location: selectedLocation,
                records_count: data.length,
                file_size: file.size,
                upload_status: 'success',
                error_messages: uploadErrors.length > 0 ? uploadErrors : undefined,
                uploaded_at: new Date().toISOString()
              };
              
              await saveUploadSession(session);
              
              // Update recent sessions
              const { data: updatedSessions } = await getUploadSessions();
              setRecentSessions(updatedSessions);
              
              // Update dashboard data
              onDataUpload(data, selectedLocation);
            } else {
              uploadErrors.push(`Database save failed: ${saveResult.error}`);
            }
          }
          
          const updatedFile: UploadedFile = {
            ...processingFile,
            data: data,
            status: uploadSuccess && data.length > 0 ? 'success' : 'error',
            errors: uploadErrors.length > 0 ? uploadErrors : undefined
          };
          
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? updatedFile : f)
          );
          
        } catch (error) {
          const errorFile: UploadedFile = {
            ...processingFile,
            status: 'error',
            errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]
          };
          
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? errorFile : f)
          );
        }
      } else {
        // Handle non-CSV files
        const errorFile: UploadedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          location: selectedLocation,
          data: [],
          uploadedAt: new Date().toLocaleString(),
          status: 'error',
          errors: ['Invalid file type. Please upload a CSV file.'],
          fileSize: file.size
        };
        
        setUploadedFiles(prev => [...prev, errorFile]);
      }
    }

    setIsUploading(false);
  }, [selectedLocation, onDataUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        'Tags': 'INFLOW',
        'Parameters': 'PM THROUGHPUT',
        'Monthly Target': 464,
        'Target MTD': 464,
        'Actual As On Date': 367,
        'Shortfall': -97,
        '% ACH': 79,
        'Location': 'Sample Location'
      },
      {
        'Tags': 'LABOUR',
        'Parameters': 'PM GR LABOUR',
        'Monthly Target': 2142723,
        'Target MTD': 2142723,
        'Actual As On Date': 1696372,
        'Shortfall': -446351,
        '% ACH': 79,
        'Location': 'Sample Location'
      },
      {
        'Tags': 'PARTS',
        'Parameters': 'MGR PARTS SALE',
        'Monthly Target': 2938579,
        'Target MTD': 2938579,
        'Actual As On Date': 2926548,
        'Shortfall': -12031,
        '% ACH': 100,
        'Location': 'Sample Location'
      }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'arya_honda_sample_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Database Setup Warning */}
      {databaseError && (
        <Card className="border-yellow-200 bg-yellow-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Database Setup Required</p>
                <p className="text-sm text-yellow-700 mt-1">
                  To enable persistent data storage, please run the database setup script in your Supabase SQL editor.
                </p>
                <div className="mt-3 text-xs text-yellow-600 bg-yellow-100 p-2 rounded border">
                  <p className="font-medium mb-1">Quick Setup:</p>
                  <p>1. Go to your Supabase project → SQL Editor</p>
                  <p>2. Copy and paste the contents of "database-setup.sql"</p>
                  <p>3. Run the script to create the required tables</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Selection */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Data Upload Center</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <label className="text-sm font-medium text-gray-700">Select Location:</label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Choose location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : selectedLocation
                ? 'border-gray-300 hover:border-gray-400'
                : 'border-gray-200 bg-gray-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedLocation ? (
              <>
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV files for {selectedLocation}
                </p>
                <p className="text-gray-600 mb-4">
                  Drag and drop your CSV files here, or click to browse
                </p>
                <div className="space-y-3">
                  <input
                    type="file"
                    multiple
                    accept=".csv,text/csv,application/csv"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="csv-upload"
                    ref={(input) => {
                      if (input) {
                        (window as any).csvUploadInput = input;
                      }
                    }}
                  />
                  <Button 
                    onClick={() => {
                      const input = document.getElementById('csv-upload') as HTMLInputElement;
                      if (input) input.click();
                    }}
                    disabled={isUploading}
                    className="cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Choose CSV Files'}
                  </Button>
                  <div className="text-xs text-gray-500 text-center">
                    <p>Supported: CSV files up to 10MB</p>
                    <p>Multiple files can be uploaded simultaneously</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>Please select a location first</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expected CSV Format & Sample Download */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Expected CSV Format</span>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCSV}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Sample</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">Your CSV file should contain the following columns (headers must match exactly):</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono mb-4">
              <span className="bg-white p-2 rounded border">Tags</span>
              <span className="bg-white p-2 rounded border">Parameters</span>
              <span className="bg-white p-2 rounded border">Monthly Target</span>
              <span className="bg-white p-2 rounded border">Target MTD</span>
              <span className="bg-white p-2 rounded border">Actual As On Date</span>
              <span className="bg-white p-2 rounded border">Shortfall</span>
              <span className="bg-white p-2 rounded border">% ACH</span>
              <span className="bg-white p-2 rounded border">Location</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Numeric fields: Monthly Target, Target MTD, Actual As On Date, Shortfall, % ACH</p>
              <p>• Text fields: Tags, Parameters, Location</p>
              <p>• If Location column is empty, it will default to the selected location</p>
              <p>• Download the sample file above to see the exact format required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Data Status */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span>Location Data Status</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {Object.keys(uploadedData).length} Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {locations.map((location) => {
              const hasData = uploadedData[location] && uploadedData[location].length > 0;
              const recordCount = hasData ? uploadedData[location].length : 0;
              
              return (
                <div
                  key={location}
                  className={`p-3 rounded-lg border ${
                    hasData 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{location}</span>
                    {hasData ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {hasData ? `${recordCount} records (Database stored)` : 'Using default data'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Database Uploads */}
      {recentSessions.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-purple-600" />
                <span>Recent Database Uploads</span>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {recentSessions.length} Sessions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentSessions.slice(0, 10).map((session, index) => (
                <div
                  key={session.id || index}
                  className="p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {session.upload_status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{session.file_name}</p>
                        <p className="text-xs text-gray-600">
                          {session.location} • {new Date(session.uploaded_at || '').toLocaleString()}
                          {session.file_size && ` • ${formatFileSize(session.file_size)}`}
                          {session.upload_status === 'success' && ` • ${session.records_count} records`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={session.upload_status === 'success' ? 'default' : 'destructive'}
                      className={session.upload_status === 'success' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {session.upload_status === 'success' ? 'Stored' : 'Failed'}
                    </Badge>
                  </div>
                  
                  {/* Show errors if any */}
                  {session.error_messages && session.error_messages.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <p className="font-medium text-yellow-800 mb-1">Warnings:</p>
                      <ul className="text-yellow-600 space-y-1">
                        {session.error_messages.slice(0, 3).map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                        {session.error_messages.length > 3 && (
                          <li>• ... and {session.error_messages.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {recentSessions.length > 10 && (
              <p className="text-xs text-gray-500 text-center mt-3">
                Showing 10 most recent uploads. Total: {recentSessions.length}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Uploads</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {uploadedFiles.length} Files
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {file.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : file.status === 'processing' ? (
                        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-600">
                          {file.location} • {file.uploadedAt}
                          {file.fileSize && ` • ${formatFileSize(file.fileSize)}`}
                          {file.status === 'success' && ` • ${file.data.length} records`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          file.status === 'success' ? 'default' : 
                          file.status === 'processing' ? 'secondary' : 'destructive'
                        }
                        className={
                          file.status === 'success' ? 'bg-green-100 text-green-800' : 
                          file.status === 'processing' ? 'bg-blue-100 text-blue-800' : ''
                        }
                      >
                        {file.status === 'success' ? 'Active' : 
                         file.status === 'processing' ? 'Processing' : 'Error'}
                      </Badge>
                      {file.status !== 'processing' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Show errors if any */}
                  {file.errors && file.errors.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="font-medium text-red-800 mb-1">Issues found:</p>
                      <ul className="text-red-600 space-y-1">
                        {file.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {file.errors.length > 5 && (
                          <li>• ... and {file.errors.length - 5} more issues</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {/* Show success summary */}
                  {file.status === 'success' && file.data.length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <p className="text-green-800">
                        Successfully processed {file.data.length} records. Data is now available in the dashboard.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}