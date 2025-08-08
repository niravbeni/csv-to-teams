export interface MeetingData {
  meetingDate: string;
  meetingType: string;
  meetingCategory: string;
  meetingRoom: string;
  meetingMembers: string;
}

export interface ProcessedMeeting extends MeetingData {
  formattedDate: string;
  hostName: string;
  membersList: string[];
  membersCount: number;
}

export interface TeamsMessage {
  "@type": "MessageCard";
  "@context": "http://schema.org/extensions";
  themeColor: string;
  summary: string;
  sections: Array<{
    activityTitle: string;
    activitySubtitle: string;
    facts: Array<{
      name: string;
      value: string;
    }>;
  }>;
} 