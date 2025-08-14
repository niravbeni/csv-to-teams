'use client';

import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import FileUploadZone from './FileUploadZone';
import { 
  MultiCSVUploadProps, 
  FileUploadStatus, 
  CABSFileType 
} from '@/types/masterMeeting';
import {
  parseFunctionRoomReport,
  parseFunctionSummaryReport,
  parseTrainingRoomReport,
  parseVisitorArrivalList,
  parseCateringReport,
  detectCABSFileType
} from '@/utils/cabsParsers';
import { consolidateCABSData } from '@/utils/dataConsolidator';
import { 
  FunctionRoomData, 
  FunctionSummaryData, 
  TrainingRoomData, 
  VisitorData,
  CateringRecord
} from '@/types/cabsData';

// Multi-CSV Upload Component
// Manages 4 separate file upload zones for CABS data
export default function MultiCsvUpload({ onDataParsed, isProcessing }: MultiCSVUploadProps) {
  const [fileStatuses, setFileStatuses] = useState<Record<CABSFileType, FileUploadStatus>>({
    [CABSFileType.FUNCTION_ROOM]: {
      fileName: '',
      fileType: CABSFileType.FUNCTION_ROOM,
      status: 'pending'
    },
    [CABSFileType.FUNCTION_SUMMARY]: {
      fileName: '',
      fileType: CABSFileType.FUNCTION_SUMMARY,
      status: 'pending'
    },
    [CABSFileType.TRAINING_ROOM]: {
      fileName: '',
      fileType: CABSFileType.TRAINING_ROOM,
      status: 'pending'
    },
    [CABSFileType.VISITOR_LIST]: {
      fileName: '',
      fileType: CABSFileType.VISITOR_LIST,
      status: 'pending'
    },
    [CABSFileType.CATERING]: {
      fileName: '',
      fileType: CABSFileType.CATERING,
      status: 'pending'
    }
  });

  const [consolidationInProgress, setConsolidationInProgress] = useState(false);

  // Handle individual file upload
  const handleFileUpload = useCallback(async (file: File, fileType: CABSFileType) => {
    // Update status to uploading
    setFileStatuses(prev => ({
      ...prev,
      [fileType]: {
        ...prev[fileType],
        fileName: file.name,
        status: 'uploading'
      }
    }));

    try {
      // Validate file type
      const detectedType = await detectCABSFileType(file);
      const expectedType = fileType.replace('-', ''); // Convert enum to detection string
      
      if (detectedType === 'unknown') {
        throw new Error('Could not detect CABS file type. Please check file format.');
      }
      
      // Allow training-room files for function-room slot (legacy compatibility)
      const isValidType = detectedType === expectedType || 
                         detectedType === fileType ||
                         (fileType === CABSFileType.FUNCTION_ROOM && detectedType === 'training-room');
      
      if (!isValidType) {
        throw new Error(`File appears to be a ${detectedType} file, but expected ${fileType}. Please check you uploaded the correct file.`);
      }

      // Parse the file based on detected type and file slot
      let parsedData;
      if (fileType === CABSFileType.FUNCTION_ROOM && detectedType === 'training-room') {
        // Handle training room file uploaded to function room slot
        parsedData = await parseTrainingRoomReport(file);
      } else {
        // Normal parsing based on expected file type
        switch (fileType) {
          case CABSFileType.FUNCTION_ROOM:
            parsedData = await parseFunctionRoomReport(file);
            break;
        case CABSFileType.FUNCTION_SUMMARY:
          parsedData = await parseFunctionSummaryReport(file);
          break;
        case CABSFileType.TRAINING_ROOM:
          parsedData = await parseTrainingRoomReport(file);
          break;
        case CABSFileType.VISITOR_LIST:
          parsedData = await parseVisitorArrivalList(file);
          break;
        case CABSFileType.CATERING:
          parsedData = await parseCateringReport(file);
          break;
        default:
          throw new Error('Unsupported file type');
        }
      }

      // Update status to success
      setFileStatuses(prev => ({
        ...prev,
        [fileType]: {
          ...prev[fileType],
          status: 'success',
          data: parsedData,
          recordCount: parsedData.length
        }
      }));

      toast.success(`${file.name} uploaded successfully (${parsedData.length} records)`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFileStatuses(prev => ({
        ...prev,
        [fileType]: {
          ...prev[fileType],
          status: 'error',
          error: errorMessage
        }
      }));

      toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
    }
  }, []);

  // Check if all required files are uploaded (3 files needed)
  const requiredFiles = [CABSFileType.FUNCTION_ROOM, CABSFileType.VISITOR_LIST, CABSFileType.CATERING];
  const allFilesUploaded = requiredFiles.every(fileType => fileStatuses[fileType]?.status === 'success');
  const uploadedCount = requiredFiles.filter(fileType => fileStatuses[fileType]?.status === 'success').length;
  const uploadProgress = (uploadedCount / 3) * 100;

  // Consolidate data from all files
  const handleConsolidateData = useCallback(async () => {
    if (!allFilesUploaded) {
      toast.error('Please upload all 3 CSV files before processing');
      return;
    }

    setConsolidationInProgress(true);

    try {
      // Extract data from file statuses (Function Room + Visitors + Catering)
      const functionRoomData = (fileStatuses[CABSFileType.FUNCTION_ROOM].data as unknown as FunctionRoomData[]) || [];
      const functionSummaryData: FunctionSummaryData[] = []; // Not used
      const trainingRoomData: TrainingRoomData[] = []; // Not used
      const visitorData = (fileStatuses[CABSFileType.VISITOR_LIST].data as unknown as VisitorData[]) || [];
      const cateringData = (fileStatuses[CABSFileType.CATERING].data as unknown as CateringRecord[]) || [];

      // Consolidate data
      const consolidationResult = consolidateCABSData(
        functionRoomData,
        functionSummaryData,
        trainingRoomData,
        visitorData,
        cateringData
      );

      // Pass consolidated data to parent
      onDataParsed(consolidationResult.masterRecords);
      
      toast.success(
        `Data consolidated successfully! ${consolidationResult.statistics.totalMeetings} meetings found with ${consolidationResult.statistics.totalVisitors} visitors.`
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Consolidation failed';
      toast.error(`Failed to consolidate data: ${errorMessage}`);
    } finally {
      setConsolidationInProgress(false);
    }
  }, [allFilesUploaded, fileStatuses, onDataParsed]);

  // Reset all uploads
  const handleReset = useCallback(() => {
    setFileStatuses({
      [CABSFileType.FUNCTION_ROOM]: {
        fileName: '',
        fileType: CABSFileType.FUNCTION_ROOM,
        status: 'pending'
      },
      [CABSFileType.FUNCTION_SUMMARY]: {
        fileName: '',
        fileType: CABSFileType.FUNCTION_SUMMARY,
        status: 'pending'
      },
      [CABSFileType.TRAINING_ROOM]: {
        fileName: '',
        fileType: CABSFileType.TRAINING_ROOM,
        status: 'pending'
      },
      [CABSFileType.VISITOR_LIST]: {
        fileName: '',
        fileType: CABSFileType.VISITOR_LIST,
        status: 'pending'
      },
      [CABSFileType.CATERING]: {
        fileName: '',
        fileType: CABSFileType.CATERING,
        status: 'pending'
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Upload Progress</span>
            <span>{uploadedCount}/3 files uploaded</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>

        {/* Status badges */}
        <div className="flex gap-2 flex-wrap">
          {requiredFiles.map((fileType) => {
            const status = fileStatuses[fileType];
            return (
              <Badge 
                key={fileType}
                variant={status.status === 'success' ? 'default' : 'outline'}
                className={`${
                  status.status === 'success' ? 'bg-green-100 text-green-800 border-green-300' :
                  status.status === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
                  status.status === 'uploading' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  'bg-gray-100 text-gray-600 border-gray-300'
                }`}
              >
                {status.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                {status.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {fileType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* File Upload Zones - 3 files needed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileUploadZone
          fileType={CABSFileType.FUNCTION_ROOM}
          status={fileStatuses[CABSFileType.FUNCTION_ROOM]}
          onFileUploaded={handleFileUpload}
          isDisabled={isProcessing || consolidationInProgress}
        />
        
        <FileUploadZone
          fileType={CABSFileType.VISITOR_LIST}
          status={fileStatuses[CABSFileType.VISITOR_LIST]}
          onFileUploaded={handleFileUpload}
          isDisabled={isProcessing || consolidationInProgress}
        />

        <FileUploadZone
          fileType={CABSFileType.CATERING}
          status={fileStatuses[CABSFileType.CATERING]}
          onFileUploaded={handleFileUpload}
          isDisabled={isProcessing || consolidationInProgress}
        />
      </div>

      {/* Actions */}
      {allFilesUploaded && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800">All Files Uploaded Successfully!</h3>
                <p className="text-sm text-muted-foreground">
                  Ready to consolidate data and generate meeting list
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={consolidationInProgress}
                >
                  Reset All
                </Button>
                <Button
                  onClick={handleConsolidateData}
                  disabled={consolidationInProgress}
                >
                  {consolidationInProgress ? 'Processing...' : 'Generate Meeting List'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
} 