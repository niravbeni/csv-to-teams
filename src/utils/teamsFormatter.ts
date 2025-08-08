import { ProcessedMeeting, TeamsMessage } from '@/types/meeting';

export const formatMeetingForTeams = (meeting: ProcessedMeeting): TeamsMessage => {
  const themeColor = getMeetingTypeColor(meeting.meetingType);
  
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: themeColor,
    summary: `${meeting.meetingType} Meeting - ${meeting.formattedDate}`,
    sections: [
      {
        activityTitle: `📅 ${meeting.meetingType} Meeting`,
        activitySubtitle: `Hosted by ${meeting.hostName}`,
        facts: [
          {
            name: "📅 Date",
            value: meeting.formattedDate
          },
          {
            name: "🏢 Location",
            value: meeting.meetingRoom
          },
          {
            name: "👥 Attendees",
            value: `${meeting.membersCount} participants`
          },
          {
            name: "👤 Participants",
            value: meeting.membersList.join(', ')
          }
        ]
      }
    ]
  };
};

export const formatSingleMeetingForTeams = (meeting: ProcessedMeeting): string => {
  return `📅 *${meeting.meetingType} Meeting - ${meeting.formattedDate}*\n\n` +
         `*Host:* ${meeting.hostName}\n\n` +
         `*Location:* ${meeting.meetingRoom}\n\n` +
         `*Category:* ${meeting.meetingCategory}\n\n` +
         `*Attendees (${meeting.membersCount}):* ${meeting.membersList.join(', ')}\n\n`;
};

// Format specifically optimized for Teams copy-paste (manual pasting)
// Since Teams ignores markdown when pasting, we'll use plain text formatting
export const formatSingleMeetingForTeamsCopy = (meeting: ProcessedMeeting): string => {
  return `📅 ${meeting.meetingType} Meeting - ${meeting.formattedDate}

Host: ${meeting.hostName}
Location: ${meeting.meetingRoom}  
Category: ${meeting.meetingCategory}
Attendees (${meeting.membersCount}): ${meeting.membersList.join(', ')}`;
};

export const formatCombinedMeetingsForTeams = (meetings: ProcessedMeeting[]): string => {
  if (meetings.length === 0) {
    return "📅 *Meeting Schedule*\n\nNo meetings found in the uploaded file.";
  }
  
  // Get the date from the first meeting
  const meetingDate = meetings[0].formattedDate;
  
  let message = `📅 *Meeting Schedule - ${meetingDate}*\n\n`;
  
  meetings.forEach((meeting) => {
    message += `*${meeting.meetingType} Meeting*\n`;
    message += `- *Host:* ${meeting.hostName}\n`;
    message += `- *Location:* ${meeting.meetingRoom}\n`;
    message += `- *Category:* ${meeting.meetingCategory}\n`;
    message += `- *Attendees (${meeting.membersCount}):* ${meeting.membersList.join(', ')}\n\n`;
  });
  
  message += `_Total meetings: ${meetings.length}_`;
  
  return message;
};

// Format specifically optimized for Teams copy-paste (manual pasting)
// Since Teams ignores markdown when pasting, we'll use plain text formatting
export const formatCombinedMeetingsForTeamsCopy = (meetings: ProcessedMeeting[]): string => {
  if (meetings.length === 0) {
    return "📅 Meeting Schedule\n\nNo meetings found in the uploaded file.";
  }
  
  // Get the date from the first meeting
  const meetingDate = meetings[0].formattedDate;
  
  let message = `📅 Meeting Schedule - ${meetingDate}

`;
  
  meetings.forEach((meeting) => {
    message += `${meeting.meetingType} Meeting
• Host: ${meeting.hostName}
• Location: ${meeting.meetingRoom}
• Category: ${meeting.meetingCategory}
• Attendees (${meeting.membersCount}): ${meeting.membersList.join(', ')}

`;
  });
  
  message += `Total meetings: ${meetings.length}`;
  
  return message;
};

export const formatMultipleMeetingsForTeams = (meetings: ProcessedMeeting[], mode: 'individual' | 'combined' = 'individual'): string[] => {
  if (meetings.length === 0) {
    return ["📅 *Meeting Schedule*\n\nNo meetings found in the uploaded file."];
  }
  
  if (mode === 'combined') {
    return [formatCombinedMeetingsForTeams(meetings)];
  }
  
  return meetings.map(meeting => formatSingleMeetingForTeams(meeting));
};

// Function to format messages specifically for copying to Teams manually (plain text)
export const formatMeetingsForCopy = (meetings: ProcessedMeeting[], mode: 'individual' | 'combined' = 'individual'): string => {
  if (meetings.length === 0) {
    return "📅 Meeting Schedule\n\nNo meetings found in the uploaded file.";
  }
  
  if (mode === 'combined') {
    return formatCombinedMeetingsForTeamsCopy(meetings);
  }
  
  // For individual mode, create a single copy-friendly format
  return meetings.map((meeting, index) => {
    return `Meeting ${index + 1}:

${formatSingleMeetingForTeamsCopy(meeting)}`;
  }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
};

// Function to format messages with markdown for typing in Teams
export const formatMeetingsForTyping = (meetings: ProcessedMeeting[], mode: 'individual' | 'combined' = 'individual'): string => {
  if (meetings.length === 0) {
    return "📅 *Meeting Schedule*\n\nNo meetings found in the uploaded file.";
  }
  
  if (mode === 'combined') {
    // Combined with markdown
    const meetingDate = meetings[0].formattedDate;
    let message = `📅 *Meeting Schedule - ${meetingDate}*\n\n`;
    
    meetings.forEach((meeting) => {
      message += `*${meeting.meetingType} Meeting*\n`;
      message += `• *Host:* ${meeting.hostName}\n`;
      message += `• *Location:* ${meeting.meetingRoom}\n`;
      message += `• *Category:* ${meeting.meetingCategory}\n`;
      message += `• *Attendees (${meeting.membersCount}):* ${meeting.membersList.join(', ')}\n\n`;
    });
    
    message += `_Total meetings: ${meetings.length}_`;
    return message;
  }
  
  // Individual with markdown
  return meetings.map((meeting, index) => {
    const singleMarkdown = `📅 *${meeting.meetingType} Meeting - ${meeting.formattedDate}*\n\n` +
                          `*Host:* ${meeting.hostName}\n` +
                          `*Location:* ${meeting.meetingRoom}\n` +
                          `*Category:* ${meeting.meetingCategory}\n` +
                          `*Attendees (${meeting.membersCount}):* ${meeting.membersList.join(', ')}`;
    
    return `*Meeting ${index + 1}:*\n\n${singleMarkdown}`;
  }).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
};



const getMeetingTypeColor = (meetingType: string): string => {
  const colorMap: Record<string, string> = {
    'Executive': '#d73027',
    'Board': '#fc4e2a',
    'Client Meeting': '#2b8cbe',
    'Business': '#31a354',
    'Planning': '#756bb1',
    'Training': '#fd8d3c',
    'Review': '#6baed6',
    'Recurring': '#74c476',
    'All-Day': '#969696',
    'Standard': '#3182bd'
  };
  
  return colorMap[meetingType] || '#0078d4'; // Default Teams blue
}; 