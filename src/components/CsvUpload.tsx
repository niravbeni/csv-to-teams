'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MeetingData } from '@/types/meeting';
import { parseCsvFile } from '@/utils/csvParser';

interface CsvUploadProps {
  onDataParsed: (data: MeetingData[]) => void;
  isProcessing: boolean;
}

export default function CsvUpload({ onDataParsed, isProcessing }: CsvUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) return;

    setFileName(file.name);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const meetings = await parseCsvFile(file);
      onDataParsed(meetings);
      setUploadStatus('success');
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV file');
    }
  }, [onDataParsed]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const getDropzoneClasses = () => {
    let classes = 'border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:bg-muted/50 ';
    
    if (isProcessing) {
      classes += 'border-muted bg-muted/50 cursor-not-allowed ';
    } else if (isDragReject) {
      classes += 'border-destructive bg-destructive/10 ';
    } else if (isDragActive) {
      classes += 'border-primary bg-primary/10 ';
    } else if (uploadStatus === 'success') {
      classes += 'border-green-500 bg-green-50 ';
    } else if (uploadStatus === 'error') {
      classes += 'border-destructive bg-destructive/10 ';
    } else {
      classes += 'border-border ';
    }
    
    return classes;
  };

  if (isProcessing) {
    return (
      <div className="space-y-4 text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Processing your CSV file...</p>
        <Progress value={66} className="w-full max-w-xs mx-auto" />
      </div>
    );
  }

  if (uploadStatus === 'success') {
    return (
      <div className="space-y-4">
        <div 
          {...getRootProps()} 
          className={getDropzoneClasses()}
          style={{ cursor: 'pointer' }}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div className="space-y-2">
              <p className="text-green-700 font-medium">{fileName} uploaded successfully!</p>
              <Badge variant="secondary" className="text-xs">
                Drop another CSV file to replace
              </Badge>
            </div>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">File: {fileName}</span>
              </div>
              <Badge variant="secondary">Ready</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploadStatus === 'error') {
    return (
      <div 
        {...getRootProps()} 
        className={getDropzoneClasses()}
        style={{ cursor: 'pointer' }}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-2">
            <p className="text-destructive font-medium">Upload failed</p>
            <Alert className="text-left max-w-md mx-auto">
              <AlertDescription className="text-sm">
                {errorMessage}
              </AlertDescription>
            </Alert>
            <p className="text-muted-foreground text-sm">Please try again with a valid CSV file</p>
          </div>
        </div>
      </div>
    );
  }

  return (
          <div 
        {...getRootProps()} 
        className={getDropzoneClasses()}
        style={{ cursor: 'pointer' }}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
        {isDragActive ? (
          <Upload className="h-12 w-12 text-primary mx-auto" />
        ) : (
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
        )}
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            {isDragActive ? 'Drop your CSV file here' : 'Upload CSV File'}
          </h3>
          
          <p className="text-muted-foreground">
            Drop your meeting CSV file here or click to browse
          </p>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Expected format: meetingDate, hostName, meetingType, meetingRoom, meetingMembers</p>
          <Badge variant="outline" className="text-xs">
            Max file size: 10MB
          </Badge>
        </div>
      </div>
    </div>
  );
} 