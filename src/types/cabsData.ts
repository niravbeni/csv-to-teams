// CABS CSV Data Types
// ==================

// Function Room Report CSV structure
export interface FunctionRoomData {
  room: string;
  startTime: string;
  endTime: string;
  covers: number;
  contact: string;
  funcNo: string;
  status: string;
  roomUse: string;
  purpose: string;
  roomCode: string; // Extracted from room info like "6117" from "(6117)"
}

// Function Summary Report CSV structure
export interface FunctionSummaryData {
  date: string;
  room: string;
  startTime: string;
  endTime: string;
  covers: number;
  host: string;
  purpose: string;
  funcNo: string;
  session: string;
  use: string;
}

// Training Room Report CSV structure
export interface TrainingRoomData {
  bookingRef: string;
  startTime: string;
  endTime: string;
  covers: number;
  contact: string;
  purpose: string;
}

// Visitor Arrival List CSV structure
export interface VisitorData {
  arrivalTime: string;
  visitorName: string;
  hostName: string;
  contactNumber?: string;
}

// Consolidated meeting types
export enum MeetingType {
  CLIENT_MEETING = 'Client Meeting',
  GROUP_MEETING = 'Group Meeting',
  NON_CLIENT = 'Non-Client Meeting',
  GENERAL_MEETING = 'General Meeting',
  TRAINING = 'Training Session',
  OTHER = 'Other',
}

// Room type categories
export enum RoomCategory {
  FUNCTION = 'Function Room',
  TRAINING = 'Training Room',
  DINING = 'Dining Room',
  OTHER = 'Other',
}

// Meeting source identification
export enum MeetingSource {
  FUNCTION_ROOM = 'Function Room Report',
  FUNCTION_SUMMARY = 'Function Summary Report',
  TRAINING_ROOM = 'Training Room Report',
  VISITOR_LIST = 'Visitor Arrival List',
} 