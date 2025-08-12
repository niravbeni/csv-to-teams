import { MeetingType, RoomCategory, MeetingSource } from './cabsData';

// Master Meeting Record - Consolidated from all CSV sources
// ========================================================

export interface MasterMeetingRecord {
  // Core identifiers
  meetingId: string;           // FA179PC, S071014, etc.
  meetingName: string;         // Derived from purpose/type
  meetingType: MeetingType;    // Standardized meeting type
  
  // People involved
  host: string;                // Primary contact (normalized)
  hostRaw: string;             // Original host name from CSV
  guests: string[];            // External visitors matched to this host
  attendeeCount: number;       // Total covers from CSV
  
  // Meeting details
  purpose: string;             // Meeting purpose/description
  room: string;                // Room identifier
  roomCategory: RoomCategory;  // Type of room
  roomCode?: string;           // Room code for linking (e.g., "6117")
  
  // Timing
  date: string;                // Meeting date (YYYY-MM-DD)
  startTime: string;           // Start time (HH:MM)
  endTime: string;             // End time (HH:MM)
  duration: string;            // Calculated duration
  
  // Metadata
  source: MeetingSource;       // Which CSV file this came from
  originalData: Record<string, unknown>; // Raw data for debugging
}

// Upload status tracking
export interface FileUploadStatus {
  fileName: string;
  fileType: CABSFileType;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  data?: Record<string, unknown>;
  recordCount?: number;
}

// CABS file type identification
export enum CABSFileType {
  FUNCTION_ROOM = 'function-room',
  FUNCTION_SUMMARY = 'function-summary', 
  TRAINING_ROOM = 'training-room',
  VISITOR_LIST = 'visitor-list',
}

// Upload component props
export interface MultiCSVUploadProps {
  onDataParsed: (masterRecords: MasterMeetingRecord[]) => void;
  isProcessing: boolean;
}

// Individual file upload zone props
export interface FileUploadZoneProps {
  fileType: CABSFileType;
  status: FileUploadStatus;
  onFileUploaded: (file: File, fileType: CABSFileType) => void;
  isDisabled: boolean;
}

// Visitor matching result
export interface VisitorMatchResult {
  hostName: string;           // Normalized host name
  hostNameRaw: string;        // Original host name
  visitors: string[];         // Matched visitors
  unmatchedVisitors: string[]; // Visitors that couldn't be matched
}

// Master data consolidation result
export interface ConsolidationResult {
  masterRecords: MasterMeetingRecord[];
  visitorMatches: VisitorMatchResult[];
  statistics: {
    totalMeetings: number;
    totalVisitors: number;
    meetingsByType: Record<MeetingType, number>;
    meetingsBySource: Record<MeetingSource, number>;
    unmatchedVisitors: number;
  };
} 