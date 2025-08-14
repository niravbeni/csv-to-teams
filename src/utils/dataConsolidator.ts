import { 
  FunctionRoomData, 
  FunctionSummaryData, 
  TrainingRoomData, 
  VisitorData,
  CateringRecord,
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
  
  // Remove titles and parenthetical content before checking
  const nameForCheck = normalizeName(trimmed);
  
  // Check for basic name pattern (at least 2 words, reasonable length)
  const words = nameForCheck.split(/\s+/).filter(word => word.length > 0);
  
  // Must have at least 2 words (first name, last name) and each word should be reasonable length
  if (words.length < 2) return false;
  
  // Each word should be mostly letters and reasonable length
  for (const word of words) {
    if (word.length < 2 || word.length > 20) return false;
    // More permissive regex that handles normalized characters
    if (!/^[a-zA-Z\-'\.]+$/.test(word)) return false;
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const matchVisitorsToHosts = (
  meetings: MasterMeetingRecord[], 
  visitors: VisitorData[]
): VisitorMatchResult[] => {
  // console.log('=== VISITOR MATCHING DEBUG ===');
      // console.log('Meetings count:', meetings.length);
    // console.log('Visitors count:', visitors.length);
  
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

// Helper function to extract multiple room numbers from a string like "149/150" 
const extractAllRoomNumbers = (roomStr: string): string[] => {
  if (!roomStr) return [];
  
  const roomNumbers: string[] = [];
  
  // Pattern 1: Named rooms like "TERRACE SILKS"
  if (roomStr.toUpperCase().includes('TERRACE SILKS')) {
    roomNumbers.push('TERRACE SILKS');
  }
  
  // Pattern 2: Main room number at start (priority): "122 x12 / (6122)" → main room is 122
  const mainRoomMatch = roomStr.match(/^(\d+)\s+x\d+/);
  if (mainRoomMatch) {
    roomNumbers.push(mainRoomMatch[1]); // This is the primary room number
  }
  
  // Pattern 3: Parentheses codes: "(6149)" or "(6132/6133)"
  const parenMatch = roomStr.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1];
    if (inner.includes('/')) {
      const parts = inner.split('/');
      roomNumbers.push(...parts);
    } else {
      roomNumbers.push(inner);
    }
  }
  
  // Pattern 4: Complex formats with letters and numbers: "145/a", "S3/82", "G10", "M2/06"
  const letterNumberSlashMatch = roomStr.match(/^([A-Z]?\d+)\/([A-Za-z\d]+)/);
  if (letterNumberSlashMatch) {
    roomNumbers.push(letterNumberSlashMatch[1]); // "145", "S3", "M2"
    roomNumbers.push(letterNumberSlashMatch[2]); // "a", "82", "06"
  }
  
  // Pattern 5: Simple letter-number combinations at start: "G10", "S3"
  const letterNumberMatch = roomStr.match(/^([A-Z]+\d+)/);
  if (letterNumberMatch) {
    roomNumbers.push(letterNumberMatch[1]);
    // Also extract just the number part for matching
    const numberPart = letterNumberMatch[1].match(/\d+/);
    if (numberPart) {
      roomNumbers.push(numberPart[0]);
    }
  }
  
  // Pattern 6: Standard slash-separated rooms: "149/150" or "132/133"
  const slashMatch = roomStr.match(/(\d+)\/(\d+)/);
  if (slashMatch) {
    roomNumbers.push(slashMatch[1], slashMatch[2]);
  }
  
  // Pattern 7: Simple number at start (if not already captured): "149", "136", "107"
  if (roomNumbers.length === 0) {
    const simpleMatch = roomStr.match(/^(\d+)/);
    if (simpleMatch) {
      roomNumbers.push(simpleMatch[1]);
    }
  }
  
  // Pattern 8: Extract single letters (like "a" in "145/a")
  const singleLetters = roomStr.match(/\b[A-Za-z]\b/g);
  if (singleLetters) {
    roomNumbers.push(...singleLetters);
  }
  
  return [...new Set(roomNumbers)].filter(item => item && item.length > 0);
};

// Helper function to match catering to booking by room and time
const matchCateringToBooking = (
  roomCode: string,
  startTime: string,
  endTime: string,
  cateringRecords: CateringRecord[]
): CateringRecord | null => {
  // Convert times to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const meetingStart = timeToMinutes(startTime);
  const meetingEnd = timeToMinutes(endTime);

  // Extract all possible room numbers from the meeting room (e.g., "149/150" -> ["149", "150"])
  const meetingRoomNumbers = extractAllRoomNumbers(roomCode);
  
  // Debug: Show if this is a multi-room booking
  if (meetingRoomNumbers.length > 1) {
    console.log(`🏢 MULTI-ROOM BOOKING: "${roomCode}" uses rooms [${meetingRoomNumbers.join(', ')}]`);
  }

  for (const catering of cateringRecords) {
    // Extract all possible room numbers from catering room
    const cateringRoomNumbers = extractAllRoomNumbers(catering.room);
    
    // Strategy 1: Check if any meeting room number matches any catering room number
    let roomMatch = false;
    for (const meetingRoom of meetingRoomNumbers) {
      for (const cateringRoom of cateringRoomNumbers) {
        // Exact match
        if (meetingRoom === cateringRoom) {
          roomMatch = true;
          console.log(`🎯 EXACT MATCH: Meeting room ${meetingRoom} matches catering room ${cateringRoom}`);
          break;
        }
        
        // Complex format matching (G10, S3, M2, etc.)
        if (meetingRoom.length > 3 || cateringRoom.length > 3) {
          // Direct complex format match (G10 = G10, S3/82 = S3/82)
          if (meetingRoom === cateringRoom) {
            roomMatch = true;
            console.log(`🎯 COMPLEX MATCH: Meeting ${meetingRoom} matches catering ${cateringRoom} (exact complex format)`);
            break;
          }
          
          // Extract base letters/numbers for complex matching (G10 -> G, 10)
          const meetingBase = meetingRoom.match(/^([A-Z]+)(\d+)/);
          const cateringBase = cateringRoom.match(/^([A-Z]+)(\d+)/);
          if (meetingBase && cateringBase && meetingBase[1] === cateringBase[1] && meetingBase[2] === cateringBase[2]) {
            roomMatch = true;
            console.log(`🎯 COMPLEX MATCH: Meeting ${meetingRoom} matches catering ${cateringRoom} (base format)`);
            break;
          }
        }
        
        // 3-digit to 4-digit conversion (121 <-> 6121) - only for numeric rooms
        if (/^\d+$/.test(meetingRoom) && /^\d+$/.test(cateringRoom)) {
          const meeting3Digit = meetingRoom.replace(/^6/, ''); // 6121 -> 121
          const meeting4Digit = meetingRoom.length === 3 ? `6${meetingRoom}` : meetingRoom; // 121 -> 6121
          const catering3Digit = cateringRoom.replace(/^6/, ''); // 6121 -> 121  
          const catering4Digit = cateringRoom.length === 3 ? `6${cateringRoom}` : cateringRoom; // 121 -> 6121
          
          if (meeting3Digit === catering3Digit || meeting4Digit === catering4Digit || 
              meetingRoom === catering3Digit || meetingRoom === catering4Digit ||
              meeting3Digit === cateringRoom || meeting4Digit === cateringRoom) {
            roomMatch = true;
            console.log(`🎯 CONVERTED MATCH: Meeting ${meetingRoom} <-> Catering ${cateringRoom} (via 3/4 digit conversion)`);
            break;
          }
        }
      }
      if (roomMatch) break;
    }
    
    // Strategy 2: Fallback to original partial matching for complex cases
    if (!roomMatch && catering.room && roomCode) {
      const cleanCateringRoom = catering.room.toLowerCase().replace(/[^\w\d]/g, '');
      const cleanMeetingRoom = roomCode.toLowerCase().replace(/[^\w\d]/g, '');
      if (cleanCateringRoom.includes(cleanMeetingRoom) || cleanMeetingRoom.includes(cleanCateringRoom)) {
        roomMatch = true;
        console.log(`🎯 PARTIAL MATCH: Meeting "${roomCode}" ~ Catering "${catering.room}"`);
      }
    }
    
    if (roomMatch) {
      // Check if times overlap (catering might have buffer times) 
      const cateringStart = timeToMinutes(catering.meetStart);
      const cateringEnd = timeToMinutes(catering.meetEnd);
      
      // Allow for flexibility in time matching (within 60 minutes)
      const timeBuffer = 60;
      const startDiff = Math.abs(meetingStart - cateringStart);
      const endDiff = Math.abs(meetingEnd - cateringEnd);
      
      if (startDiff <= timeBuffer && endDiff <= timeBuffer) {
                            return catering;
      }
    }
  }
  
  return null;
};

// Helper to extract room code from various room string formats
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const extractRoomCodeFromString = (roomStr: string): string | undefined => {
  if (!roomStr) return undefined;
  
  // Try different patterns to extract room codes
  const patterns = [
    /\((\d+)\)/, // "(6117)" or "(6132/6133)"
    /(\d+)\/(\d+)/, // "132/133" -> use first number
    /^(\d+)/, // "145/a" -> "145" 
    /(\d+)/, // Any number sequence
    /Room\s*(\d+)/i, // "Room 123"
    /^([A-Z]\d+)/, // "G10", "M2" etc
  ];
  
  for (const pattern of patterns) {
    const match = roomStr.match(pattern);
    if (match) {
      // For patterns with multiple captures, use the first number
      return match[1];
    }
  }
  
  // If no number found, try to extract just the room identifier
  const cleanRoom = roomStr.replace(/[^\w\d]/g, '').toUpperCase();
  return cleanRoom.length > 0 ? cleanRoom : undefined;
};

// Main consolidation function - now includes catering data
export const consolidateCABSData = (
  functionRooms: FunctionRoomData[],
  functionSummary: FunctionSummaryData[],
  trainingRooms: TrainingRoomData[],
  visitors: VisitorData[],
  catering: CateringRecord[]
): ConsolidationResult => {
  // console.log('📊 Processing:', functionRooms.length, 'rooms,', visitors.length, 'visitors,', catering.length, 'catering records');


  // STEP 1: Extract ALL unique hosts from BOTH CSVs
  const hostsFromFunctionRooms = [...new Set(functionRooms
    .map(f => f.contact?.trim())
    .filter(name => name && name.length > 0 && isRealPersonName(name))
  )];

  const hostsFromVisitors = [...new Set(visitors
    .map(v => v.hostName?.trim())
    .filter(name => name && name.length > 0 && isRealPersonName(name))
  )];

  // Combine both lists for complete host coverage
  const allUniqueHosts = [...new Set([...hostsFromFunctionRooms, ...hostsFromVisitors])];
  
  // STEP 2: Convert function room data to master meeting records
  let functionRoomRecords = functionRooms.map(convertFunctionRoom);
  
  // Filter to include ALL legitimate meetings (keep everything except obvious maintenance)
  functionRoomRecords = functionRoomRecords.filter((meeting) => {
    const purpose = meeting.purpose.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    return isValidMeeting;
  });
  
  // STEP 3: Create a master record for EACH host from visitor list (ensuring we get all 31)
  const allMeetings: MasterMeetingRecord[] = [];
  
  allUniqueHosts.forEach((hostName, index) => {

    // Find all function room bookings for this host
    const hostBookings = functionRoomRecords.filter(meeting => {
      const meetingHostNormalized = normalizeName(meeting.hostRaw);
      const targetHostNormalized = normalizeName(hostName);
      
      // Extract name parts for better matching
      const meetingNameParts = extractFirstLastName(meeting.hostRaw);
      const targetNameParts = extractFirstLastName(hostName);
      
      // Try multiple matching strategies
      const exactMatch = meetingHostNormalized === targetHostNormalized;
      const reverseMatch = meetingNameParts.first === targetNameParts.last && meetingNameParts.last === targetNameParts.first;
      const containsMatch = meeting.hostRaw.toLowerCase().includes(hostName.toLowerCase()) ||
                           hostName.toLowerCase().includes(meeting.hostRaw.toLowerCase());
      
      return exactMatch || reverseMatch || containsMatch;
    });
    
    // Find all visitors for this host
    const hostVisitors = visitors.filter(visitor => 
      normalizeName(visitor.hostName) === normalizeName(hostName) ||
      visitor.hostName.toLowerCase().includes(hostName.toLowerCase()) ||
      hostName.toLowerCase().includes(visitor.hostName.toLowerCase())
    );

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
    }
  });
  
  // Created master meeting records
  
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
  
  // console.log('=== FINAL CONSOLIDATION RESULT ===');
  // console.log('Total master records:', result.masterRecords.length);
  // console.log('Sample master records:', result.masterRecords.slice(0, 2));
  // console.log('Statistics:', result.statistics);
  
  // Verify guest assignments
  // Match catering to bookings
  // Matching catering to meetings
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let cateringMatches = 0;
  console.log(`🍽️ CATERING MATCHING: Processing ${result.masterRecords.length} meetings with ${catering.length} catering records`);
  
  // Log summary of all room numbers for debugging
  const allMeetingRooms = result.masterRecords.map(m => m.roomCode).filter(r => r).slice(0, 10);
  const allCateringRooms = catering.map(c => c.room).slice(0, 5);
  console.log(`🏠 Sample meeting rooms: [${allMeetingRooms.join(', ')}]`);
  console.log(`🍽️ Sample catering rooms: [${allCateringRooms.map(r => `"${r}"`).join(', ')}]`);
  
  // Debug: Show extracted room numbers from catering
  console.log('🔢 CATERING ROOM EXTRACTIONS:');
  catering.slice(0, 10).forEach(c => {
    const extracted = extractAllRoomNumbers(c.room);
    console.log(`  "${c.room}" → [${extracted.join(', ')}]`);
  });
  
  result.masterRecords.forEach((meeting, index) => {
    console.log(`🔍 Meeting ${index + 1}: ${meeting.purpose} | Room: ${meeting.roomCode} | Time: ${meeting.startTime}-${meeting.endTime}`);
    
    const cateringMatch = matchCateringToBooking(
      meeting.roomCode || '',
      meeting.startTime,
      meeting.endTime,
      catering
    );
    
    if (cateringMatch) {
      console.log(`✅ CATERING MATCHED: ${meeting.purpose} -> ${cateringMatch.cateringType} (${cateringMatch.covers} covers)`);
      meeting.catering = {
        type: cateringMatch.cateringType,
        details: cateringMatch.cateringDetails,
        covers: cateringMatch.covers
      };
      cateringMatches++;
    } else {
      console.log(`❌ NO CATERING MATCH for: ${meeting.purpose} (Room ${meeting.roomCode})`);
    }
  });
  
  // Catering matching completed

  // console.log('=== GUEST ASSIGNMENT VERIFICATION ===');
  // result.masterRecords.forEach((meeting, idx) => {
  //   console.log(`Meeting ${idx + 1}: "${meeting.meetingName}"`);
  //   console.log(`  Host: "${meeting.hostRaw}" -> normalized: "${meeting.host}"`);
  //   console.log(`  Room: "${meeting.room}" -> Location: "${meeting.room.match(/^([A-Za-z0-9]+)/)?.[1] || meeting.room}"`);
  //   console.log(`  Time: ${meeting.startTime} - ${meeting.endTime}`);
  //   console.log(`  Guests (${meeting.guests.length}): ${meeting.guests.join(', ') || '[None]'}`);
  //   if (meeting.catering) {
  //     console.log(`  🍽️ Catering: ${meeting.catering.type} (${meeting.catering.covers} covers)`);
  //   }
  //   console.log('---');
  // });
  
  return result;
}; 