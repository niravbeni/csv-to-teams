import { MasterMeetingRecord } from '@/types/masterMeeting';
import { HostSchedule, HostBooking, HostScheduleResult } from '@/types/hostSchedule';

// Priority hosts to filter for - only these hosts will be shown in output
const PRIORITY_HOSTS = [
  'Leivadioti Iliana',
  'Ermias Leah', 
  'Keogh Matthew',
  'Watkins Tom',
  'Dulieu Ben',
  'Wootton James',
  'Cunningham-Day Julian'
];

// Helper function to check if a host is in the priority list
const isPriorityHost = (hostName: string): boolean => {
  const normalizedHost = hostName.toLowerCase().trim();
  return PRIORITY_HOSTS.some(priorityHost => {
    const normalizedPriority = priorityHost.toLowerCase().trim();
    // Check exact match or if names match when reversed (Firstname Lastname vs Lastname Firstname)
    if (normalizedHost === normalizedPriority) {
      return true;
    }
    
    // Check if it's the same name but in different order
    const hostParts = normalizedHost.split(' ').filter(p => p.length > 0);
    const priorityParts = normalizedPriority.split(' ').filter(p => p.length > 0);
    
    if (hostParts.length >= 2 && priorityParts.length >= 2) {
      // Check if first+last matches last+first
      const hostFirstLast = `${hostParts[0]} ${hostParts[hostParts.length - 1]}`;
      const hostLastFirst = `${hostParts[hostParts.length - 1]} ${hostParts[0]}`;
      
      return hostFirstLast === normalizedPriority || hostLastFirst === normalizedPriority;
    }
    
    return false;
  });
};

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
  
  // Filter to only show priority hosts
  const priorityHostSchedules = hostSchedules.filter(hostSchedule => {
    const isPriority = isPriorityHost(hostSchedule.formattedHostName);
    if (isPriority) {
      console.log(`✅ PRIORITY HOST: ${hostSchedule.formattedHostName} (${hostSchedule.totalBookings} bookings)`);
    } else {
      console.log(`⏭️ FILTERED OUT: ${hostSchedule.formattedHostName} (not in priority list)`);
    }
    return isPriority;
  });
  
  console.log(`🎯 PRIORITY FILTER: ${priorityHostSchedules.length}/${hostSchedules.length} hosts shown`);
  
  // Sort priority hosts by number of bookings (busiest first)
  priorityHostSchedules.sort((a, b) => b.totalBookings - a.totalBookings);
  
  // Calculate statistics for priority hosts only
  const statistics = {
    totalHosts: priorityHostSchedules.length,
    totalBookings: priorityHostSchedules.reduce((sum, host) => sum + host.totalBookings, 0),
    totalGuests: priorityHostSchedules.reduce((sum, host) => sum + host.totalGuests, 0),
    busiestHost: priorityHostSchedules[0]?.formattedHostName || '',
    mostBookings: priorityHostSchedules[0]?.totalBookings || 0
  };
  
  console.log('=== HOST GROUPING STATISTICS ===');
  console.log('Total hosts:', statistics.totalHosts);
  console.log('Total bookings:', statistics.totalBookings);
  console.log('Total guests:', statistics.totalGuests);
  console.log('Busiest host:', statistics.busiestHost, 'with', statistics.mostBookings, 'bookings');
  
  return {
    hostSchedules: priorityHostSchedules,
    statistics
  };
}; 