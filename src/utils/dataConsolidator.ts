import { 
  FunctionRoomData, 
  FunctionSummaryData, 
  TrainingRoomData, 
  VisitorData,
  MeetingType,
  RoomCategory,
  MeetingSource
} from '@/types/cabsData';
import { 
  MasterMeetingRecord, 
  VisitorMatchResult, 
  ConsolidationResult 
} from '@/types/masterMeeting';

// Data Consolidator
// =================
// Merges data from all 4 CSV sources and matches visitors to hosts

// Utility functions for name normalization and matching
const normalizeName = (name: string): string => {
  if (!name) return '';
  
  // Remove titles and normalize
  return name
    .replace(/\b(Mr|Mrs|Miss|Ms|Dr|Prof)\b\.?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const extractFirstLastName = (fullName: string): { first: string; last: string; parts: string[] } => {
  const normalized = normalizeName(fullName);
  const parts = normalized.split(' ').filter(part => part.length > 0);
  
  return {
    first: parts[0] || '',
    last: parts[parts.length - 1] || '',
    parts: parts
  };
};

const calculateDuration = (startTime: string, endTime: string): string => {
  try {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let duration = endMinutes - startMinutes;
    if (duration < 0) duration += 24 * 60; // Handle next-day end time
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  } catch {
    return 'Unknown';
  }
};

const getRoomCategory = (room: string): RoomCategory => {
  const roomLower = room.toLowerCase();
  
  if (roomLower.includes('dining')) return RoomCategory.DINING;
  if (roomLower.includes('training') || /\d{3}/.test(room)) return RoomCategory.TRAINING;
  if (roomLower.includes('function') || /\d{2}/.test(room)) return RoomCategory.FUNCTION;
  
  return RoomCategory.OTHER;
};

const getMeetingType = (roomUse: string, purpose: string): MeetingType => {
  const roomUseLower = roomUse.toLowerCase();
  const purposeLower = purpose.toLowerCase();
  
  if (roomUseLower.includes('clmeet') || purposeLower.includes('client')) {
    return MeetingType.CLIENT_MEETING;
  }
  if (roomUseLower.includes('group')) {
    return MeetingType.GROUP_MEETING;
  }
  if (roomUseLower.includes('noncli')) {
    return MeetingType.NON_CLIENT;
  }
  if (roomUseLower.includes('meet')) {
    return MeetingType.GENERAL_MEETING;
  }
  if (purposeLower.includes('training') || purposeLower.includes('signing')) {
    return MeetingType.TRAINING;
  }
  
  return MeetingType.OTHER;
};

const generateMeetingName = (purpose: string, meetingType: MeetingType): string => {
  // Extract a clean meeting name from the purpose
  let name = purpose.replace(/^(External|Internal|Private)\s*-?\s*/i, '');
  
  // Capitalize first letter of each word
  name = name.replace(/\b\w/g, l => l.toUpperCase());
  
  // Fallback to meeting type if purpose is too generic
  if (name.length < 3 || /^(meeting|session|room)$/i.test(name)) {
    return meetingType;
  }
  
  return name;
};

// Convert Function Room data to Master Meeting Record
const convertFunctionRoom = (data: FunctionRoomData): MasterMeetingRecord => {
  const meetingType = getMeetingType(data.roomUse, data.purpose);
  
  return {
    meetingId: data.funcNo,
    meetingName: generateMeetingName(data.purpose, meetingType),
    meetingType,
    host: normalizeName(data.contact),
    hostRaw: data.contact,
    guests: [], // Will be populated by visitor matching
    attendeeCount: data.covers,
    purpose: data.purpose,
    room: data.room,
    roomCategory: getRoomCategory(data.room),
    date: new Date().toISOString().split('T')[0], // Default to today, will be updated
    startTime: data.startTime,
    endTime: data.endTime,
    duration: calculateDuration(data.startTime, data.endTime),
    source: MeetingSource.FUNCTION_ROOM,
    originalData: data as unknown as Record<string, unknown>,
    roomCode: data.roomCode // Add room code for better filtering/matching
  };
};

// Convert Function Summary data to Master Meeting Record
const convertFunctionSummary = (data: FunctionSummaryData): MasterMeetingRecord => {
  const meetingType = getMeetingType(data.use || '', data.purpose);
  
  return {
    meetingId: data.funcNo,
    meetingName: generateMeetingName(data.purpose, meetingType),
    meetingType,
    host: normalizeName(data.host),
    hostRaw: data.host,
    guests: [], // Will be populated by visitor matching
    attendeeCount: data.covers,
    purpose: data.purpose,
    room: data.room,
    roomCategory: getRoomCategory(data.room),
    date: data.date || new Date().toISOString().split('T')[0],
    startTime: data.startTime,
    endTime: data.endTime,
    duration: calculateDuration(data.startTime, data.endTime),
    source: MeetingSource.FUNCTION_SUMMARY,
    originalData: data as unknown as Record<string, unknown>
  };
};

// Convert Training Room data to Master Meeting Record
const convertTrainingRoom = (data: TrainingRoomData): MasterMeetingRecord => {
  return {
    meetingId: data.bookingRef,
    meetingName: generateMeetingName(data.purpose, MeetingType.TRAINING),
    meetingType: MeetingType.TRAINING,
    host: normalizeName(data.contact),
    hostRaw: data.contact,
    guests: [], // Will be populated by visitor matching
    attendeeCount: data.covers,
    purpose: data.purpose,
    room: 'Training Room',
    roomCategory: RoomCategory.TRAINING,
    date: new Date().toISOString().split('T')[0], // Default to today
    startTime: data.startTime,
    endTime: data.endTime,
    duration: calculateDuration(data.startTime, data.endTime),
    source: MeetingSource.TRAINING_ROOM,
    originalData: data as unknown as Record<string, unknown>
  };
};

// Match visitors to meeting hosts
const matchVisitorsToHosts = (
  meetings: MasterMeetingRecord[], 
  visitors: VisitorData[]
): VisitorMatchResult[] => {
  console.log('=== VISITOR MATCHING DEBUG ===');
  console.log('Meetings count:', meetings.length);
  console.log('Visitors count:', visitors.length);
  
  const results: VisitorMatchResult[] = [];
  const unmatchedVisitors: string[] = [];
  
  // Create a map of normalized host names to meeting hosts
  const hostMap = new Map<string, { normalized: string; raw: string }>();
  meetings.forEach((meeting, index) => {
    const normalizedHost = normalizeName(meeting.hostRaw);
    hostMap.set(normalizedHost, {
      normalized: meeting.host,
      raw: meeting.hostRaw
    });
    
    if (index < 5) {
      console.log(`Meeting ${index} host: "${meeting.hostRaw}" -> normalized: "${normalizedHost}"`);
    }
  });
  
  console.log('Total unique hosts in meetings:', hostMap.size);
  console.log('Sample hosts from meetings:', Array.from(hostMap.entries()).slice(0, 5));
  
  // Group visitors by their hosts
  const visitorsByHost = new Map<string, string[]>();
  
  visitors.forEach((visitor, index) => {
    const normalizedVisitorHost = normalizeName(visitor.hostName);
    let matchedHost: string | null = null;
    
    if (index < 5) {
      console.log(`Visitor ${index}: "${visitor.visitorName}" -> host: "${visitor.hostName}" -> normalized: "${normalizedVisitorHost}"`);
    }
    
    // Try exact match first
    if (hostMap.has(normalizedVisitorHost)) {
      matchedHost = normalizedVisitorHost;
    } else {
      // Try advanced name matching for different name formats
      const visitorHostParts = extractFirstLastName(visitor.hostName);
      
      for (const [hostKey, hostValue] of hostMap) {
        const meetingHostParts = extractFirstLastName(hostValue.raw);
        
        // Strategy 1: Match if first OR last name matches
        const simpleMatch = (visitorHostParts.first && visitorHostParts.first === meetingHostParts.first) ||
                           (visitorHostParts.last && visitorHostParts.last === meetingHostParts.last);
        
        // Strategy 2: Handle reversed name order (common in CABS data)
        // Check if visitor's first name appears anywhere in meeting host parts
        // and visitor's last name appears anywhere in meeting host parts
        const reversedMatch = visitorHostParts.parts.length >= 2 && meetingHostParts.parts.length >= 2 &&
                             meetingHostParts.parts.includes(visitorHostParts.first) &&
                             meetingHostParts.parts.includes(visitorHostParts.last);
        
        // Strategy 3: Check if any two words from visitor name appear in meeting name (in any order)
        const crossMatch = visitorHostParts.parts.length >= 2 && meetingHostParts.parts.length >= 2 &&
                          visitorHostParts.parts.filter(part => meetingHostParts.parts.includes(part)).length >= 2;
        
        if (simpleMatch || reversedMatch || crossMatch) {
          matchedHost = hostKey;
          if (index < 5) {
            console.log(`🔍 Match found for "${visitor.hostName}" -> "${hostValue.raw}"`);
            console.log(`   Visitor parts: [${visitorHostParts.parts.join(', ')}]`);
            console.log(`   Meeting parts: [${meetingHostParts.parts.join(', ')}]`);
            console.log(`   Match type: ${simpleMatch ? 'simple' : reversedMatch ? 'reversed' : 'cross'}`);
          }
          break;
        }
      }
    }
    
    if (matchedHost) {
      if (!visitorsByHost.has(matchedHost)) {
        visitorsByHost.set(matchedHost, []);
      }
      visitorsByHost.get(matchedHost)!.push(visitor.visitorName);
      
      if (index < 5) {
        console.log(`✅ Visitor ${index} matched to host: "${matchedHost}"`);
      }
    } else {
      unmatchedVisitors.push(visitor.visitorName);
      
      if (index < 5) {
        console.log(`❌ Visitor ${index} NOT matched - no host found for: "${normalizedVisitorHost}"`);
      }
    }
  });
  
  // Create results
  hostMap.forEach((hostInfo, normalizedHost) => {
    const visitors = visitorsByHost.get(normalizedHost) || [];
    results.push({
      hostName: hostInfo.normalized,
      hostNameRaw: hostInfo.raw,
      visitors,
      unmatchedVisitors: []
    });
  });
  
  // Add unmatched visitors to first result or create separate entry
  if (unmatchedVisitors.length > 0) {
    if (results.length > 0) {
      results[0].unmatchedVisitors = unmatchedVisitors;
    } else {
      results.push({
        hostName: 'Unknown Host',
        hostNameRaw: 'Unknown Host',
        visitors: [],
        unmatchedVisitors
      });
    }
  }
  
  console.log('=== VISITOR MATCHING SUMMARY ===');
  console.log('Total visitors matched:', visitors.length - unmatchedVisitors.length);
  console.log('Total visitors unmatched:', unmatchedVisitors.length);
  console.log('Sample unmatched visitors:', unmatchedVisitors.slice(0, 5));
  console.log('Visitors by host map size:', visitorsByHost.size);
  
  return results;
};

// Main consolidation function - now only uses Function Room + Visitors
export const consolidateCABSData = (
  functionRooms: FunctionRoomData[],
  functionSummary: FunctionSummaryData[],
  trainingRooms: TrainingRoomData[],
  visitors: VisitorData[]
): ConsolidationResult => {
  console.log('=== CONSOLIDATION DEBUG ===');
  console.log('Input data counts:');
  console.log('- Function Rooms:', functionRooms.length);
  console.log('- Visitors:', visitors.length);
  console.log('NOTE: Only using Function Room + Visitors for ~21 meetings');
  
  console.log('Sample Function Room data:', functionRooms.slice(0, 3));
  console.log('Sample Visitor data:', visitors.slice(0, 3));
  
  // Detailed host name analysis for verification
  console.log('=== HOST NAME ANALYSIS ===');
  console.log('Function Room hosts (first 10):');
  functionRooms.slice(0, 10).forEach((room, idx) => {
    console.log(`  ${idx}: "${room.contact}" -> normalized: "${normalizeName(room.contact)}"`);
  });
  
  console.log('Visitor hosts (first 10):');
  visitors.slice(0, 10).forEach((visitor, idx) => {
    console.log(`  ${idx}: "${visitor.hostName}" -> normalized: "${normalizeName(visitor.hostName)}"`);
  });
  
  // Check for potential matches
  const functionRoomHostsNormalized = functionRooms.map(r => normalizeName(r.contact));
  const visitorHostsNormalized = visitors.map(v => normalizeName(v.hostName));
  const exactMatches = functionRoomHostsNormalized.filter(h => visitorHostsNormalized.includes(h));
  console.log(`Exact normalized host matches: ${exactMatches.length}`);
  console.log('Sample exact matches:', exactMatches.slice(0, 5));
  
  // Only convert function room data to master meeting records
  let functionRoomRecords = functionRooms.map(convertFunctionRoom);
  
  console.log('Raw Function Room Records:', functionRoomRecords.length);
  
  // Filter to get real meetings (not maintenance, clearing, etc.)
  functionRoomRecords = functionRoomRecords.filter((meeting, index) => {
    const purpose = meeting.purpose.toLowerCase();
    const roomUse = (meeting.originalData as unknown as FunctionRoomData).roomUse.toLowerCase();
    
    // More aggressive filtering for the ~21 real meetings
    const isRealMeeting = !purpose.includes('clear') && 
                         !purpose.includes('maintenance') && 
                         !purpose.includes('check') &&
                         !purpose.includes('occupied') &&
                         !purpose.includes('setting up') &&
                         !purpose.includes('set up') &&
                         !roomUse.includes('other') &&
                         meeting.attendeeCount >= 2 && // At least 2 people
                         meeting.purpose.trim().length > 10 && // Longer purpose descriptions
                         !meeting.purpose.toLowerCase().includes('internal meeting') && // Skip generic internal meetings
                         meeting.roomCode; // Must have a room code
    
    if (index < 15) {
      console.log(`Meeting ${index}: "${meeting.purpose}" | Room Use: "${roomUse}" | Code: "${meeting.roomCode}" | Attendees: ${meeting.attendeeCount} | Real: ${isRealMeeting}`);
    }
    
    return isRealMeeting;
  });
  
  console.log('Filtered Function Room Records (real meetings):', functionRoomRecords.length);
  
  // Combine all meetings (just function room now)
  let allMeetings = [...functionRoomRecords];
  
  // Remove duplicates based on meeting ID
  const seenIds = new Set<string>();
  allMeetings = allMeetings.filter(meeting => {
    if (seenIds.has(meeting.meetingId)) {
      return false;
    }
    seenIds.add(meeting.meetingId);
    return true;
  });
  
  // Match visitors to hosts
  const visitorMatches = matchVisitorsToHosts(allMeetings, visitors);
  
  // Update meetings with guest information AND filter to only meetings with guests
  allMeetings = allMeetings.map(meeting => {
    const matchedVisitors = visitorMatches.find(match => 
      match.hostName === meeting.host || 
      normalizeName(match.hostNameRaw) === meeting.host
    );
    
    return {
      ...meeting,
      guests: matchedVisitors?.visitors || []
    };
  }).filter(meeting => {
    // ONLY keep meetings that have actual guests (visitors)
    const hasGuests = meeting.guests.length > 0;
    console.log(`Meeting "${meeting.meetingName}" by ${meeting.hostRaw} has ${meeting.guests.length} guests - ${hasGuests ? 'KEEPING' : 'REMOVING'}`);
    return hasGuests;
  });
  
  // Calculate statistics
  const totalVisitors = visitors.length;
  const unmatchedVisitors = visitorMatches.reduce(
    (acc, match) => acc + match.unmatchedVisitors.length, 
    0
  );
  
  const meetingsByType = allMeetings.reduce((acc, meeting) => {
    acc[meeting.meetingType] = (acc[meeting.meetingType] || 0) + 1;
    return acc;
  }, {} as Record<MeetingType, number>);
  
  const meetingsBySource = allMeetings.reduce((acc, meeting) => {
    acc[meeting.source] = (acc[meeting.source] || 0) + 1;
    return acc;
  }, {} as Record<MeetingSource, number>);
  
  const result = {
    masterRecords: allMeetings,
    visitorMatches,
    statistics: {
      totalMeetings: allMeetings.length,
      totalVisitors,
      meetingsByType,
      meetingsBySource,
      unmatchedVisitors
    }
  };
  
  console.log('=== FINAL CONSOLIDATION RESULT ===');
  console.log('Total master records:', result.masterRecords.length);
  console.log('Sample master records:', result.masterRecords.slice(0, 2));
  console.log('Statistics:', result.statistics);
  
  // Verify guest assignments
  console.log('=== GUEST ASSIGNMENT VERIFICATION ===');
  result.masterRecords.forEach((meeting, idx) => {
    console.log(`Meeting ${idx + 1}: "${meeting.meetingName}"`);
    console.log(`  Host: "${meeting.hostRaw}" -> normalized: "${meeting.host}"`);
    console.log(`  Room: "${meeting.room}" -> Location: "${meeting.room.match(/^([A-Za-z0-9]+)/)?.[1] || meeting.room}"`);
    console.log(`  Time: ${meeting.startTime} - ${meeting.endTime}`);
    console.log(`  Guests (${meeting.guests.length}): ${meeting.guests.join(', ') || '[None]'}`);
    console.log('---');
  });
  
  return result;
}; 