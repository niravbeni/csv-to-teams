import { MasterMeetingRecord } from '@/types/masterMeeting';
import { HostSchedule, HostBooking, HostScheduleResult } from '@/types/hostSchedule';

// Helper function to format host name properly (Firstname Lastname without title)
const formatHostName = (hostRaw: string): string => {
  const parts = hostRaw.trim().split(' ').filter(part => part.length > 0);
  
  // Check if it starts with a title (Mr, Mrs, Ms, Miss, Dr, Prof)
  const titles = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof'];
  const firstPartLower = parts[0]?.toLowerCase();
  
  if (parts.length >= 3 && titles.includes(firstPartLower)) {
    // Format: "Title FirstName LastName" -> return "FirstName LastName"
    const firstName = parts[1];
    const lastName = parts[2];
    return `${firstName} ${lastName}`;
  } else if (parts.length >= 3) {
    // Format: "LastName FirstName Title" -> return "FirstName LastName"
    const lastName = parts[0];
    const firstName = parts[1];
    return `${firstName} ${lastName}`;
  } else if (parts.length === 2) {
    // Handle cases where it might already be in "Firstname Lastname" format
    return `${parts[0]} ${parts[1]}`;
  }
  
  return hostRaw;
};

// Helper function to extract room number from location
const formatLocation = (roomString: string): string => {
  const match = roomString.match(/^([A-Za-z0-9]+)/);
  return match ? match[1] : roomString;
};

// Helper function to convert time string to minutes for comparison
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to find earliest and latest times
const getTimeSpan = (bookings: HostBooking[]): { earliest: string; latest: string } => {
  if (bookings.length === 0) return { earliest: '', latest: '' };
  
  let earliestMinutes = Infinity;
  let latestMinutes = -1;
  let earliest = '';
  let latest = '';
  
  bookings.forEach(booking => {
    const startMinutes = timeToMinutes(booking.startTime);
    const endMinutes = timeToMinutes(booking.endTime);
    
    if (startMinutes < earliestMinutes) {
      earliestMinutes = startMinutes;
      earliest = booking.startTime;
    }
    
    if (endMinutes > latestMinutes) {
      latestMinutes = endMinutes;
      latest = booking.endTime;
    }
  });
  
  return { earliest, latest };
};

// Main function to group meetings by host
export const groupMeetingsByHost = (meetings: MasterMeetingRecord[]): HostScheduleResult => {
  console.log('=== HOST GROUPING DEBUG ===');
  console.log('Processing', meetings.length, 'meetings');
  
  const hostMap = new Map<string, HostSchedule>();
  
  // Group meetings by host
  meetings.forEach((meeting, index) => {
    const hostKey = meeting.host; // Use normalized host name as key
    const formattedHost = formatHostName(meeting.hostRaw);
    
    console.log(`Meeting ${index + 1}: "${meeting.meetingName}" by ${meeting.hostRaw} -> ${formattedHost}`);
    
    if (!hostMap.has(hostKey)) {
      hostMap.set(hostKey, {
        hostName: hostKey,
        hostRaw: meeting.hostRaw,
        formattedHostName: formattedHost,
        bookings: [],
        guests: [],
        totalBookings: 0,
        totalGuests: 0,
        timeSpan: { earliest: '', latest: '' }
      });
    }
    
    const hostSchedule = hostMap.get(hostKey)!;
    
    // Add booking
    const booking: HostBooking = {
      room: formatLocation(meeting.room),
      roomCode: meeting.roomCode,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      purpose: meeting.purpose,
      meetingName: meeting.meetingName,
      meetingType: meeting.meetingType,
      roomCategory: meeting.roomCategory,
      catering: meeting.catering // Pass catering information from MasterMeetingRecord
    };
    
    hostSchedule.bookings.push(booking);
    
    // Add guests (avoid duplicates)
    meeting.guests.forEach(guest => {
      if (!hostSchedule.guests.includes(guest)) {
        hostSchedule.guests.push(guest);
      }
    });
  });
  
  // Finalize host schedules
  const hostSchedules: HostSchedule[] = [];
  hostMap.forEach(hostSchedule => {
    // Sort bookings by start time
    hostSchedule.bookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    // Calculate totals
    hostSchedule.totalBookings = hostSchedule.bookings.length;
    hostSchedule.totalGuests = hostSchedule.guests.length;
    hostSchedule.timeSpan = getTimeSpan(hostSchedule.bookings);
    
    hostSchedules.push(hostSchedule);
    
    console.log(`Host: ${hostSchedule.formattedHostName}`);
    console.log(`  - ${hostSchedule.totalBookings} bookings`);
    console.log(`  - ${hostSchedule.totalGuests} guests`);
    console.log(`  - Time span: ${hostSchedule.timeSpan.earliest} - ${hostSchedule.timeSpan.latest}`);
  });
  
  // Sort hosts by number of bookings (busiest first)
  hostSchedules.sort((a, b) => b.totalBookings - a.totalBookings);
  
  // Calculate statistics
  const statistics = {
    totalHosts: hostSchedules.length,
    totalBookings: hostSchedules.reduce((sum, host) => sum + host.totalBookings, 0),
    totalGuests: hostSchedules.reduce((sum, host) => sum + host.totalGuests, 0),
    busiestHost: hostSchedules[0]?.formattedHostName || '',
    mostBookings: hostSchedules[0]?.totalBookings || 0
  };
  
  console.log('=== HOST GROUPING STATISTICS ===');
  console.log('Total hosts:', statistics.totalHosts);
  console.log('Total bookings:', statistics.totalBookings);
  console.log('Total guests:', statistics.totalGuests);
  console.log('Busiest host:', statistics.busiestHost, 'with', statistics.mostBookings, 'bookings');
  
  return {
    hostSchedules,
    statistics
  };
}; 