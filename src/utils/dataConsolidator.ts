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
  
  // Remove titles, parenthetical suffixes, and normalize special characters
  return name
    .replace(/\b(Mr|Mrs|Miss|Ms|Dr|Prof)\b\.?\s*/gi, '') // Remove titles
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove anything in parentheses like "(ALS)"
    .replace(/ë/gi, 'e') // Normalize special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
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

// Helper function to check if a name looks like a real person (firstname lastname pattern)
const isRealPersonName = (name: string): boolean => {
  if (!name || name.trim().length === 0) return false;
  
  const trimmed = name.trim();
  
  // Skip obvious non-person entries
  const nonPersonPatterns = [
    'clear room check',
    'room check', 
    'clear room',
    'maintenance', 
    'cleaning',
    'setup',
    'occupied',
    'available',
    'reserved',
    'blocked',
    'system',
    'admin',
    'test',
    'check'
  ];
  
  const lowerName = trimmed.toLowerCase();
  if (nonPersonPatterns.some(pattern => lowerName.includes(pattern))) {
    return false;
  }
  
  // Check for basic name pattern (at least 2 words, reasonable length)
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  
  // Must have at least 2 words (first name, last name) and each word should be reasonable length
  if (words.length < 2) return false;
  
  // Each word should be mostly letters and reasonable length
  for (const word of words) {
    if (word.length < 2 || word.length > 20) return false;
    if (!/^[a-zA-Z\-'\.]+$/.test(word)) return false; // Allow letters, hyphens, apostrophes, dots
  }
  
  return true;
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
  console.log('NEW APPROACH: Starting with ALL hosts from Visitor List (expecting 31 unique hosts)');
  
  console.log('Sample Function Room data:', functionRooms.slice(0, 3));
  console.log('Sample Visitor data:', visitors.slice(0, 3));

  // Expected hosts from the user's list for comparison
  const expectedHosts = [
    'Mrs Samantha Heidrey', 'Ms Aedamar Comiskey', 'Mr Yin Lam', 'Mr Ross Schloeffel',
    'Mr Greg Baker', 'Mr Nathan Cornell', 'Ms Sophie Bark', 'Ms Olesja Dobrowolska',
    'Mr James Morris (ALS)', 'Miss Evie Sandwell', 'Mrs Lauren Oesman', 'Mr Daniel Martinez',
    'Miss Leah Ermias', 'Miss Devinder Dabasia', 'Ms Zoë Hughes', 'Ms Herbie Mudhar',
    'Mrs Angela Ogilvie', 'Ms Clare McMullen', 'Ms Catherine Shearn', 'Miss Jane Percy',
    'Ms Katherine Davis', 'Mr Guy Patey', 'Miss Samantha Lee', 'Mrs Rachel Hemelryk',
    'Mr Alastair Bain', 'Mrs Garima Gupta', 'Miss Anastasia Caneschi', 'Mr Conor Manders',
    'Mr Jack Shand', 'Mr Rory Conway', 'Ms Anne Kaiser'
  ];

  console.log('=== EXPECTED HOSTS ANALYSIS ===');
  console.log('Expected hosts:', expectedHosts.length);

  // Detailed host name analysis for verification
  console.log('=== HOST NAME ANALYSIS ===');
  // STEP 1: Extract ALL unique hosts from BOTH CSVs
  const hostsFromFunctionRooms = [...new Set(functionRooms
    .map(f => f.contact?.trim())
    .filter(name => name && name.length > 0 && isRealPersonName(name))
  )];

  const hostsFromVisitors = [...new Set(visitors
    .map(v => v.hostName?.trim())
    .filter(name => name && name.length > 0 && isRealPersonName(name))
  )];

  // Log all raw visitor host names for debugging
  console.log('=== ALL RAW VISITOR HOST NAMES ===');
  const allRawVisitorHosts = visitors.map(v => v.hostName?.trim()).filter(name => name && name.length > 0);
  console.log('Total raw visitor host names:', allRawVisitorHosts.length);
  allRawVisitorHosts.forEach((host, idx) => {
    const isRealPerson = isRealPersonName(host);
    const normalized = normalizeName(host);
    console.log(`${idx + 1}. "${host}" -> normalized: "${normalized}" -> real person: ${isRealPerson}`);
  });

  // Log all raw function room host names for debugging
  console.log('=== ALL RAW FUNCTION ROOM HOST NAMES ===');
  const allRawFunctionHosts = functionRooms.map(f => f.contact?.trim()).filter(name => name && name.length > 0);
  console.log('Total raw function room host names:', allRawFunctionHosts.length);
  allRawFunctionHosts.slice(0, 20).forEach((host, idx) => {
    const isRealPerson = isRealPersonName(host);
    const normalized = normalizeName(host);
    console.log(`${idx + 1}. "${host}" -> normalized: "${normalized}" -> real person: ${isRealPerson}`);
  });

  // Check which expected hosts are found in our data
  console.log('=== EXPECTED HOST MATCHING ===');
  expectedHosts.forEach(expectedHost => {
    const normalizedExpected = normalizeName(expectedHost);
    
    const foundInVisitors = allRawVisitorHosts.some(rawHost => 
      normalizeName(rawHost) === normalizedExpected ||
      rawHost.toLowerCase().includes(expectedHost.toLowerCase()) ||
      expectedHost.toLowerCase().includes(rawHost.toLowerCase())
    );
    
    const foundInFunctionRooms = allRawFunctionHosts.some(rawHost => 
      normalizeName(rawHost) === normalizedExpected ||
      rawHost.toLowerCase().includes(expectedHost.toLowerCase()) ||
      expectedHost.toLowerCase().includes(rawHost.toLowerCase())
    );
    
    console.log(`"${expectedHost}" -> Found in Visitors: ${foundInVisitors}, Found in Function Rooms: ${foundInFunctionRooms}`);
  });

  // Combine both lists for complete host coverage
  const allUniqueHosts = [...new Set([...hostsFromFunctionRooms, ...hostsFromVisitors])];
  
  console.log('=== HOST EXTRACTION ===');
  console.log('Hosts from Function Rooms:', hostsFromFunctionRooms.length);
  console.log('Hosts from Visitor List:', hostsFromVisitors.length);
  console.log('Total unique hosts:', allUniqueHosts.length);
  console.log('Sample hosts:', allUniqueHosts.slice(0, 10), '...');
  
  // STEP 2: Convert function room data to master meeting records
  let functionRoomRecords = functionRooms.map(convertFunctionRoom);
  
  console.log('Raw Function Room Records:', functionRoomRecords.length);
  
  // Filter to include ALL legitimate meetings (keep everything except obvious maintenance)
  functionRoomRecords = functionRoomRecords.filter((meeting, index) => {
    const purpose = meeting.purpose.toLowerCase();
    const roomUse = (meeting.originalData as unknown as FunctionRoomData).roomUse.toLowerCase();
    
    // Filter out maintenance activities and non-person hosts
    const isValidMeeting = !purpose.includes('clear') && 
                          !purpose.includes('maintenance') && 
                          !purpose.includes('cleaning') &&
                          !purpose.includes('setting up') &&
                          !purpose.includes('set up') &&
                          !purpose.includes('check') &&
                          !purpose.includes('occupied') &&
                          meeting.purpose.trim().length > 5 && // Very minimal length check
                          meeting.host.trim().length > 0 && // Must have a host
                          isRealPersonName(meeting.hostRaw); // Must be a real person name
    
    if (index < 20 || !isValidMeeting) {
      console.log(`Meeting ${index}: "${meeting.purpose}" | Host: "${meeting.hostRaw}" | Room Use: "${roomUse}" | Valid: ${isValidMeeting}`);
    }
    
    return isValidMeeting;
  });
  
  console.log('Filtered Function Room Records (all valid meetings):', functionRoomRecords.length);
  
  // STEP 3: Create a master record for EACH host from visitor list (ensuring we get all 31)
  console.log('=== CREATING HOST RECORDS ===');
  const allMeetings: MasterMeetingRecord[] = [];
  
  allUniqueHosts.forEach((hostName, index) => {
    console.log(`Processing host ${index + 1}/${allUniqueHosts.length}: "${hostName}"`);
    
    // Find all function room bookings for this host
    const hostBookings = functionRoomRecords.filter(meeting => 
      normalizeName(meeting.hostRaw) === normalizeName(hostName) ||
      meeting.hostRaw.toLowerCase().includes(hostName.toLowerCase()) ||
      hostName.toLowerCase().includes(meeting.hostRaw.toLowerCase())
    );
    
    console.log(`  - Found ${hostBookings.length} bookings for ${hostName}`);
    
    // Find all visitors for this host
    const hostVisitors = visitors.filter(visitor => 
      normalizeName(visitor.hostName) === normalizeName(hostName) ||
      visitor.hostName.toLowerCase().includes(hostName.toLowerCase()) ||
      hostName.toLowerCase().includes(visitor.hostName.toLowerCase())
    );
    
    console.log(`  - Found ${hostVisitors.length} visitors for ${hostName}`);
    
    // Only include hosts who have visitors (guests)
    if (hostVisitors.length > 0) {
      if (hostBookings.length > 0) {
        // Host has both bookings and visitors - add each booking as a separate meeting record
        hostBookings.forEach(booking => {
          allMeetings.push({
            ...booking,
            guests: hostVisitors.map(v => v.visitorName).filter(name => name)
          });
        });
      } else {
        // Host has no bookings but has visitors - create a minimal record
        allMeetings.push({
          meetingId: `host-${index}`,
          meetingName: `Meetings with ${hostName}`,
          meetingType: MeetingType.OTHER,
          host: normalizeName(hostName),
          hostRaw: hostName,
          guests: hostVisitors.map(v => v.visitorName).filter(name => name),
          attendeeCount: hostVisitors.length,
          purpose: 'Visitor meetings',
          room: 'TBD',
          roomCategory: RoomCategory.OTHER,
          date: new Date().toISOString().split('T')[0],
          startTime: 'TBD',
          endTime: 'TBD', 
          duration: 'TBD',
          source: MeetingSource.VISITOR_LIST,
          originalData: { hostName } as Record<string, unknown>
        });
      }
    } else {
      console.log(`  - SKIPPING ${hostName} (no visitors)`);
    }
  });
  
  console.log(`Created ${allMeetings.length} total meeting records from ${allUniqueHosts.length} hosts`);
  
  // Calculate statistics
  const totalVisitors = visitors.length;
  const totalAssignedVisitors = allMeetings.reduce((sum, meeting) => sum + meeting.guests.length, 0);
  
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
    visitorMatches: [], // Not using the old matching system
    statistics: {
      totalMeetings: allMeetings.length,
      totalVisitors,
      meetingsByType,
      meetingsBySource,
      unmatchedVisitors: totalVisitors - totalAssignedVisitors
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