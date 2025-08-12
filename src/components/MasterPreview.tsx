'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Send, MessageCircle, Users, MapPin, Clock, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MasterMeetingRecord } from '@/types/masterMeeting';
import { MeetingType } from '@/types/cabsData';
import { 
  formatMasterMeetingsForTeams, 
  formatMasterMeetingsForCopy
} from '@/utils/masterFormatter';
import { ConsolidationResult } from '@/types/masterMeeting';

interface MasterPreviewProps {
  meetings: MasterMeetingRecord[];
  onSendMessage: (messages: string[]) => void;
  isSending: boolean;
  messageMode: 'individual' | 'combined';
}

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
    else if (title === 'ms') title = 'Ms';
    else if (title === 'miss') title = 'Miss';
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

// Create a mock consolidation result for formatting
const createConsolidationResult = (meetings: MasterMeetingRecord[]): ConsolidationResult => {
  const statistics = {
    totalMeetings: meetings.length,
    totalVisitors: meetings.reduce((acc, meeting) => acc + meeting.guests.length, 0),
    meetingsByType: meetings.reduce((acc, meeting) => {
      acc[meeting.meetingType] = (acc[meeting.meetingType] || 0) + 1;
      return acc;
    }, {} as Record<MeetingType, number>),
    meetingsBySource: {} as Record<string, number>,
    unmatchedVisitors: 0
  };

  return {
    masterRecords: meetings,
    visitorMatches: [],
    statistics
  };
};

export default function MasterPreview({ 
  meetings, 
  onSendMessage, 
  isSending, 
  messageMode 
}: MasterPreviewProps) {
  const [copied, setCopied] = useState(false);
  
  const consolidationResult = createConsolidationResult(meetings);
  const formattedMessages = formatMasterMeetingsForTeams(consolidationResult, messageMode);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      const copyText = formatMasterMeetingsForCopy(consolidationResult, messageMode);
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleSend = () => {
    onSendMessage(formattedMessages);
  };

  if (meetings.length === 0) {
    return null;
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Master Meeting Summary</h3>
      </div>



      {/* Meeting Details */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Meeting List</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy} 
              className="flex items-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {meetings.map((meeting, index) => (
              <div key={meeting.meetingId} className="border-l-4 border-primary pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      {index + 1}. {meeting.meetingName}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span><strong>Type:</strong> {meeting.meetingType}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span><strong>Host:</strong> {formatHostName(meeting.hostRaw)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span><strong>Location:</strong> {formatLocation(meeting.room)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span><strong>Start Time:</strong> {meeting.startTime}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span><strong>End Time:</strong> {meeting.endTime}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Guests ({meeting.guests.length}):</strong>
                          {meeting.guests.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {meeting.guests.map((guest, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {guest}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic ml-2">
                              No external visitors
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm">
                          <strong>Purpose:</strong>
                          <p className="text-muted-foreground mt-1">{meeting.purpose}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>



      <Separator />

      {/* Send Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSend} 
          disabled={isSending} 
          size="lg" 
          className="flex items-center gap-2 cursor-pointer"
        >
          {isSending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send to Teams
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 