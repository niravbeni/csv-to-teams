'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileUploadZoneProps, CABSFileType } from '@/types/masterMeeting';

// Individual file upload zone for specific CABS file types
export default function FileUploadZone({ 
  fileType, 
  onFileUploaded, 
  status, 
  isDisabled 
}: FileUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && !isDisabled) {
      onFileUploaded(acceptedFiles[0], fileType);
    }
  }, [fileType, onFileUploaded, isDisabled]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false,
    disabled: isDisabled
  });

  const getZoneConfig = () => {
    switch (fileType) {
      case CABSFileType.FUNCTION_ROOM:
        return {
          title: 'Function Room Report',
          description: 'Room bookings and meeting details',
          icon: '🏢',
          example: 'Function Room Report'
        };
      case CABSFileType.FUNCTION_SUMMARY:
        return {
          title: 'Function Summary Report',
          description: 'CABS Function Room summary data',
          icon: '📊',
          example: 'Function Summary Report'
        };
      case CABSFileType.TRAINING_ROOM:
        return {
          title: 'Training Room Report',
          description: 'CABS Training Room bookings',
          icon: '🎓',
          example: 'Training Rooms Report'
        };
      case CABSFileType.VISITOR_LIST:
        return {
          title: 'Visitor Arrival List',
          description: 'External visitors and guest information',
          icon: '👥',
          example: 'Visitors Arrival List'
        };
      case CABSFileType.CATERING:
        return {
          title: 'Catering Report',
          description: 'Meeting catering and refreshment details',
          icon: '🍽️',
          example: 'Catering Report'
        };
      default:
        return {
          title: 'CSV File',
          description: 'Upload CSV file',
          icon: '📄',
          example: 'CSV file'
        };
    }
  };

  const config = getZoneConfig();

  const getDropzoneClasses = () => {
    let classes = "border-2 border-dashed rounded-lg p-6 text-center transition-all min-h-[140px] flex flex-col justify-center cursor-pointer ";
    
    if (isDisabled) {
      classes += "border-muted bg-muted/20 cursor-not-allowed opacity-60 ";
    } else if (status.status === 'success') {
      classes += "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950 ";
    } else if (status.status === 'error') {
      classes += "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950 ";
    } else if (status.status === 'uploading') {
      classes += "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950 ";
    } else if (isDragReject) {
      classes += "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950 ";
    } else if (isDragActive) {
      classes += "border-primary bg-primary/10 ";
    } else {
      classes += "border-border hover:border-primary hover:bg-primary/5 ";
    }
    
    return classes;
  };

  // Loading state
  if (status.status === 'uploading') {
    return (
      <div className={getDropzoneClasses()}>
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
              {config.icon} Processing {config.title}
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              Parsing and validating CSV data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status.status === 'success') {
    return (
      <div className={getDropzoneClasses()}>
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
              {config.icon} {config.title}
            </h3>
            <p className="text-sm text-green-600 dark:text-green-300">
              ✅ {status.fileName}
            </p>
            {status.recordCount && (
              <Badge variant="outline" className="mt-2 bg-green-100 text-green-800 border-green-300">
                {status.recordCount} records
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status.status === 'error') {
    return (
      <div className={getDropzoneClasses()}>
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
              {config.icon} {config.title}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300">
              ❌ Upload failed
            </p>
            {status.error && (
              <Alert className="mt-3 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertDescription className="text-red-800 dark:text-red-200 text-xs">
                  {status.error}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Click to try again
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default upload state
        return (
        <div 
          {...getRootProps()} 
          className={getDropzoneClasses()}
        >
          <input {...getInputProps()} />
      <div className="space-y-3">
        <div className="flex items-center justify-center">
          {isDragActive ? (
            <Upload className="h-8 w-8 text-primary animate-bounce" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium">
            {config.icon} {config.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {config.description}
          </p>
          {isDragActive ? (
            <p className="text-sm text-primary font-medium mt-2">
              Drop your CSV file here
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              Drop CSV file here or click to browse
            </p>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            CSV files only • Max 10MB
          </Badge>
        </div>
      </div>
    </div>
  );
} 