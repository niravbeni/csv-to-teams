'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Send, MessageCircle, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProcessedMeeting } from '@/types/meeting';
import { formatMultipleMeetingsForTeams, formatMeetingsForCopy } from '@/utils/teamsFormatter';

interface MessagePreviewProps {
  meetings: ProcessedMeeting[];
  onSendMessage: (messages: string[]) => void;
  isSending: boolean;
  messageMode: 'individual' | 'combined';
}

export default function MessagePreview({ meetings, onSendMessage, isSending, messageMode }: MessagePreviewProps) {
  const [copied, setCopied] = useState(false);

  const formattedMessages = formatMultipleMeetingsForTeams(meetings, messageMode);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      // Use the copy-optimized formatting function (plain text)
      const copyText = formatMeetingsForCopy(meetings, messageMode);
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy message:', error);
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
        <h3 className="text-lg font-semibold">Meeting Message Preview</h3>
      </div>

      {/* Message Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {messageMode === 'individual' ? 'Separate Messages' : 'Combined Message'}
              </span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {messageMode === 'individual' ? meetings.length : 1}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Total Attendees</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {meetings.reduce((sum, meeting) => sum + meeting.membersCount, 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium">Unique Rooms</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {new Set(meetings.map(m => m.meetingRoom)).size}
            </p>
          </CardContent>
        </Card>
      </div>



      {/* Message Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Message Preview</CardTitle>
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
          <div className="space-y-4">
            {meetings.map((meeting, index) => (
              <div key={index} className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-lg">{index + 1}. {meeting.meetingType} Meeting</h4>
                <div className="space-y-1 text-sm text-muted-foreground mt-2">
                  <p><strong>Host:</strong> {meeting.hostName}</p>
                  <p><strong>Location:</strong> {meeting.meetingRoom}</p>
                  <p><strong>Attendees ({meeting.membersCount}):</strong> {meeting.membersList.join(', ')}</p>
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
              {messageMode === 'individual' 
                ? `Send ${meetings.length} Messages to Teams`
                : 'Send Message to Teams'
              }
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 