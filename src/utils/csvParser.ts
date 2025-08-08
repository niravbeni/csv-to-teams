import Papa from 'papaparse';
import { MeetingData, ProcessedMeeting } from '@/types/meeting';

export const parseCsvFile = (file: File): Promise<MeetingData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false, // No header row in the new format
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          return;
        }
        
        // Map array data to our interface
        const meetings = (results.data as string[][]).map(row => ({
          meetingDate: row[0],
          meetingType: row[1],
          meetingCategory: row[2],
          meetingRoom: row[3],
          meetingMembers: row[4]
        }));
        resolve(meetings);
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

export const processMeetingData = (meetings: MeetingData[]): ProcessedMeeting[] => {
  return meetings.map(meeting => {
    // Split members by semicolon and trim whitespace
    const membersList = meeting.meetingMembers
      ? meeting.meetingMembers.split(';').map(member => member.trim()).filter(member => member !== '')
      : [];
    
    // First member is the host
    const hostName = membersList.length > 0 ? membersList[0] : 'Unknown Host';
    
    const formattedDate = formatMeetingDate(meeting.meetingDate);
    
    return {
      ...meeting,
      formattedDate,
      hostName,
      membersList,
      membersCount: membersList.length
    };
  });
};

const formatMeetingDate = (dateString: string): string => {
  try {
    // Handle YYYY-MM-DD format
    const date = new Date(dateString);
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString; // Return original if parsing fails
  }
}; 