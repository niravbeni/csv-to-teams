import { MasterMeetingRecord, ConsolidationResult } from '@/types/masterMeeting';
import { MeetingType, RoomCategory } from '@/types/cabsData';

// Master Meeting Teams Formatter
// ==============================
// Formats consolidated meeting data for Teams messages

// Helper function to format host name properly (Title Firstname Lastname)
const formatHostName = (hostRaw: string): string => {
  // Handle formats like "Cornell Nathan Mr" -> "Mr Nathan Cornell"
  const parts = hostRaw.trim().split(' ').filter(part => part.length > 0);
  
  if (parts.length >= 3) {
    const lastName = parts[0];
    const firstName = parts[1];
    let title = parts[2];
    
    // Normalize titles to proper format
    title = title.toLowerCase();
    if (title === 'mr') title = 'Mr';
    else if (title === 'mrs') title = 'Mrs';
    else if (title === 'ms' || title === 'miss') title = 'Ms'; // Standardize Miss to Ms
    else if (title === 'dr') title = 'Dr';
    else if (title === 'prof') title = 'Prof';
    else title = title.charAt(0).toUpperCase() + title.slice(1); // Capitalize first letter
    
    return `${title} ${firstName} ${lastName}`;
  }
  
  return hostRaw; // Fallback to original if format is unexpected
};

// Helper function to extract just the room number from location
const formatLocation = (roomString: string): string => {
  // Extract just the room identifier (e.g., "G09" from "G09 x10 / (6009) INTEGRATED KIT")
  const match = roomString.match(/^([A-Za-z0-9]+)/);
  return match ? match[1] : roomString;
};

// Format individual master meeting for Teams
export const formatMasterMeetingForTeams = (meeting: MasterMeetingRecord): string => {
  const guestText = meeting.guests.length > 0 
    ? meeting.guests.join(', ')
    : '[No external visitors]';
  
  const formattedHost = formatHostName(meeting.hostRaw);
  const formattedLocation = formatLocation(meeting.room);
    
  return `📅 **${meeting.meetingName}**\n\n` +
         `**Type:** ${meeting.meetingType}\n\n` +
         `👤 **Host:** ${formattedHost}\n\n` +
         `📍 **Location:** ${formattedLocation}\n\n` +
         `⏰ **Start Time:** ${meeting.startTime}\n\n` +
         `⏰ **End Time:** ${meeting.endTime}\n\n` +
         `👥 **Guests (${meeting.guests.length}):**\n${guestText}\n\n` +
         `📋 **Purpose:**\n${meeting.purpose}\n\n`;
};

// Format combined master meetings for Teams
export const formatMasterMeetingsForTeams = (
  consolidationResult: ConsolidationResult, 
  mode: 'individual' | 'combined' = 'individual'
): string[] => {
  const { masterRecords, statistics } = consolidationResult;
  
  if (masterRecords.length === 0) {
    return ["📅 *Daily Meeting Summary*\n\nNo meetings found in the uploaded files."];
  }
  
  if (mode === 'individual') {
    return masterRecords.map(meeting => formatMasterMeetingForTeams(meeting));
  }
  
  // Combined format
  const meetingDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });
  
  let message = `📅 *Daily Meeting Summary - ${meetingDate}*\n\n`;
  
  // Group meetings by type
  const meetingsByType = groupMeetingsByType(masterRecords);
  
  // Function Room Meetings
  if (meetingsByType[MeetingType.CLIENT_MEETING]?.length > 0 || 
      meetingsByType[MeetingType.GROUP_MEETING]?.length > 0 ||
      meetingsByType[MeetingType.NON_CLIENT]?.length > 0 ||
      meetingsByType[MeetingType.GENERAL_MEETING]?.length > 0) {
    
    message += `*🏢 Function Room Meetings:*\n\n`;
    
    [MeetingType.CLIENT_MEETING, MeetingType.GROUP_MEETING, MeetingType.NON_CLIENT, MeetingType.GENERAL_MEETING]
      .forEach(type => {
        const meetings = meetingsByType[type] || [];
        meetings.forEach(meeting => {
          const guestText = meeting.guests.length > 0 
            ? meeting.guests.join(', ')
            : '[No external visitors]';
            
          message += `• *${meeting.meetingName}* (${meeting.meetingId})\n`;
          message += `  👤 Host: ${meeting.hostRaw}\n`;
          message += `  👥 Guests: ${guestText}\n`;
          message += `  📍 ${meeting.room} (${meeting.startTime}-${meeting.endTime})\n\n`;
        });
      });
  }
  
  // Training Sessions
  if (meetingsByType[MeetingType.TRAINING]?.length > 0) {
    message += `*🎓 Training Sessions:*\n\n`;
    
    meetingsByType[MeetingType.TRAINING].forEach(meeting => {
      const guestText = meeting.guests.length > 0 
        ? meeting.guests.join(', ')
        : '[Training attendees]';
        
      message += `• *${meeting.meetingName}* (${meeting.meetingId})\n`;
      message += `  👤 Host: ${meeting.hostRaw}\n`;
      message += `  👥 Participants: ${guestText}\n`;
      message += `  📍 ${meeting.room} (${meeting.startTime}-${meeting.endTime})\n\n`;
    });
  }
  
  // Other Meetings
  if (meetingsByType[MeetingType.OTHER]?.length > 0) {
    message += `*📋 Other Activities:*\n\n`;
    
    meetingsByType[MeetingType.OTHER].forEach(meeting => {
      const guestText = meeting.guests.length > 0 
        ? meeting.guests.join(', ')
        : '[No external visitors]';
        
      message += `• *${meeting.meetingName}* (${meeting.meetingId})\n`;
      message += `  👤 Contact: ${meeting.hostRaw}\n`;
      message += `  👥 Visitors: ${guestText}\n`;
      message += `  📍 ${meeting.room} (${meeting.startTime}-${meeting.endTime})\n\n`;
    });
  }
  
  // Statistics summary
  message += `*📊 Summary:*\n`;
  message += `• _Total Meetings:_ ${statistics.totalMeetings}\n`;
  message += `• _External Visitors:_ ${statistics.totalVisitors}\n`;
  message += `• _Meeting Types:_ `;
  
  const typeBreakdown = Object.entries(statistics.meetingsByType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${type}(${count})`)
    .join(', ');
  message += typeBreakdown || 'None';
  
  if (statistics.unmatchedVisitors > 0) {
    message += `\n• _Unmatched Visitors:_ ${statistics.unmatchedVisitors}`;
  }
  
  return [message];
};

// Format for copy-paste (plain text)
export const formatMasterMeetingsForCopy = (
  consolidationResult: ConsolidationResult,
  mode: 'individual' | 'combined' = 'individual'
): string => {
  const { masterRecords, statistics } = consolidationResult;
  
  if (masterRecords.length === 0) {
    return "📅 Daily Meeting Summary\n\nNo meetings found in the uploaded files.";
  }
  
  if (mode === 'combined') {
    const meetingDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    
    let message = `📅 Daily Meeting Summary - ${meetingDate}\n\n`;
    
    const meetingsByType = groupMeetingsByType(masterRecords);
    
    // Function Room Meetings
    const functionMeetings = [
      ...(meetingsByType[MeetingType.CLIENT_MEETING] || []),
      ...(meetingsByType[MeetingType.GROUP_MEETING] || []),
      ...(meetingsByType[MeetingType.NON_CLIENT] || []),
      ...(meetingsByType[MeetingType.GENERAL_MEETING] || [])
    ];
    
    if (functionMeetings.length > 0) {
      message += `🏢 Function Room Meetings:\n\n`;
      functionMeetings.forEach(meeting => {
        const guestText = meeting.guests.length > 0 
          ? meeting.guests.join(', ')
          : '[No external visitors]';
          
        message += `• ${meeting.meetingName} (${meeting.meetingId})\n`;
        message += `  Host: ${meeting.hostRaw}\n`;
        message += `  Guests: ${guestText}\n`;
        message += `  Location: ${meeting.room} (${meeting.startTime}-${meeting.endTime})\n\n`;
      });
    }
    
    // Training Sessions
    if (meetingsByType[MeetingType.TRAINING]?.length > 0) {
      message += `🎓 Training Sessions:\n\n`;
      meetingsByType[MeetingType.TRAINING].forEach(meeting => {
        const guestText = meeting.guests.length > 0 
          ? meeting.guests.join(', ')
          : '[Training attendees]';
          
        message += `• ${meeting.meetingName} (${meeting.meetingId})\n`;
        message += `  Host: ${meeting.hostRaw}\n`;
        message += `  Participants: ${guestText}\n`;
        message += `  Location: ${meeting.room} (${meeting.startTime}-${meeting.endTime})\n\n`;
      });
    }
    
    // Summary
    message += `📊 Summary:\n`;
    message += `Total Meetings: ${statistics.totalMeetings}\n`;
    message += `External Visitors: ${statistics.totalVisitors}`;
    
    if (statistics.unmatchedVisitors > 0) {
      message += `\nUnmatched Visitors: ${statistics.unmatchedVisitors}`;
    }
    
    return message;
  }
  
  // Individual format
  return masterRecords.map((meeting, index) => {
    const guestText = meeting.guests.length > 0 
      ? meeting.guests.join(', ')
      : '[No external visitors]';
    
    const formattedHost = formatHostName(meeting.hostRaw);
    const formattedLocation = formatLocation(meeting.room);
      
    return `${index + 1}. ${meeting.meetingName}\n\n` +
           `Type: ${meeting.meetingType}\n` +
           `Host: ${formattedHost}\n` +
           `Location: ${formattedLocation}\n` +
           `Start Time: ${meeting.startTime}\n` +
           `End Time: ${meeting.endTime}\n` +
           `Guests (${meeting.guests.length}): ${guestText}\n` +
           `Purpose: ${meeting.purpose}`;
  }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
};

// Helper function to group meetings by type
const groupMeetingsByType = (meetings: MasterMeetingRecord[]): Record<MeetingType, MasterMeetingRecord[]> => {
  const groups = {} as Record<MeetingType, MasterMeetingRecord[]>;
  
  // Initialize all meeting types
  Object.values(MeetingType).forEach(type => {
    groups[type] = [];
  });
  
  // Group meetings
  meetings.forEach(meeting => {
    groups[meeting.meetingType].push(meeting);
  });
  
  return groups;
};

// Format statistics for Teams
export const formatStatisticsForTeams = (consolidationResult: ConsolidationResult): string => {
  const { statistics, visitorMatches } = consolidationResult;
  
  let message = `*📊 CABS Data Processing Summary*\n\n`;
  
  message += `*Meeting Statistics:*\n`;
  message += `• Total Meetings: ${statistics.totalMeetings}\n`;
  message += `• External Visitors: ${statistics.totalVisitors}\n\n`;
  
  message += `*Meetings by Type:*\n`;
  Object.entries(statistics.meetingsByType)
    .filter(([, count]) => count > 0)
    .forEach(([type, count]) => {
      message += `• ${type}: ${count}\n`;
    });
    
  message += `\n*Meetings by Source:*\n`;
  Object.entries(statistics.meetingsBySource)
    .filter(([, count]) => count > 0)
    .forEach(([source, count]) => {
      message += `• ${source}: ${count}\n`;
    });
  
  if (statistics.unmatchedVisitors > 0) {
    message += `\n*⚠️ Visitor Matching:*\n`;
    message += `• Unmatched Visitors: ${statistics.unmatchedVisitors}\n`;
    message += `• Successfully Matched: ${statistics.totalVisitors - statistics.unmatchedVisitors}\n`;
  }
  
  return message;
}; 