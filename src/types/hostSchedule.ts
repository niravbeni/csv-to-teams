import { MeetingType, RoomCategory } from './cabsData';

// Host-centric data structure for grouping bookings by host
export interface HostBooking {
  room: string;
  roomCode?: string;
  startTime: string;
  endTime: string;
  purpose: string;
  meetingName: string;
  meetingType: MeetingType;
  roomCategory: RoomCategory;
  catering?: {
    type: string;
    details: string;
    covers: number;
  };
}

export interface HostSchedule {
  hostName: string;
  hostRaw: string;
  formattedHostName: string;
  bookings: HostBooking[];
  guests: string[];
  totalBookings: number;
  totalGuests: number;
  timeSpan: {
    earliest: string;
    latest: string;
  };
}

export interface HostScheduleResult {
  hostSchedules: HostSchedule[];
  statistics: {
    totalHosts: number;
    totalBookings: number;
    totalGuests: number;
    busiestHost: string;
    mostBookings: number;
  };
} 