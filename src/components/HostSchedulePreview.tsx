'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Send, Users, MapPin, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { HostScheduleResult } from '@/types/hostSchedule';
import { 
  formatHostSchedulesForTeams, 
  formatHostSchedulesForCopy,
  formatHostStatisticsForTeams
} from '@/utils/hostScheduleFormatter';

interface HostSchedulePreviewProps {
  hostSchedules: HostScheduleResult;
  onSendMessage: (messages: string[]) => void;
  isSending: boolean;
}

export default function HostSchedulePreview({ 
  hostSchedules, 
  onSendMessage, 
  isSending 
}: HostSchedulePreviewProps) {
  const [copied, setCopied] = useState(false);
  
  const formattedMessages = formatHostSchedulesForTeams(hostSchedules);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      const copyText = formatHostSchedulesForCopy(hostSchedules);
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleSend = () => {
    onSendMessage(formattedMessages);
  };

  if (hostSchedules.hostSchedules.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Host Schedule Summary</h3>
        <Badge variant="outline" className="ml-2">
          {hostSchedules.hostSchedules.length} {hostSchedules.hostSchedules.length === 1 ? 'Host' : 'Hosts'}
        </Badge>
      </div>

      {/* Host Schedules */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Host Daily Schedules ({hostSchedules.hostSchedules.length} hosts)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const message = formattedMessages[0] || '';
                  console.log('🍽️ TEAMS MESSAGE:', message);
                  alert('Check console for full Teams message text (with catering info)');
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                📝 View Raw
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {hostSchedules.hostSchedules.map((hostSchedule, index) => (
              <div key={hostSchedule.hostName} className="border-l-4 border-primary pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      👤 {hostSchedule.formattedHostName}
                    </h4>
                    
                    <div className="mt-3 space-y-4">
                      {/* Host Statistics */}
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{hostSchedule.totalBookings} bookings</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{hostSchedule.totalGuests} guests</span>
                        </div>
                        {hostSchedule.timeSpan.earliest && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{hostSchedule.timeSpan.earliest} - {hostSchedule.timeSpan.latest}</span>
                          </div>
                        )}
                      </div>

                      {/* Bookings */}
                      <div>
                        <h5 className="font-medium text-sm mb-2">📅 Bookings:</h5>
                        <div className="space-y-2">
                          {hostSchedule.bookings.map((booking, bookingIndex) => (
                            <div key={bookingIndex} className="bg-muted/30 p-3 rounded-md text-sm">
                              <div className="flex items-center gap-4 mb-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">Room {booking.room}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span>{booking.startTime} - {booking.endTime}</span>
                                </div>
                              </div>
                              <div className="text-muted-foreground">
                                <strong>Purpose:</strong> {booking.purpose}
                              </div>
                              {booking.catering && (
                                <div className="text-muted-foreground mt-1">
                                  <strong>🍽️ Catering:</strong> {booking.catering.type.includes(' - ') 
                                    ? booking.catering.type.split(' - ')[1] 
                                    : booking.catering.type}
                                  {booking.catering.details && (
                                    <div className="text-xs mt-1 pl-4">
                                      {booking.catering.details
                                        .replace(/\d+\.\d+\s+td$/i, '') // Remove "XX.XX td" at end
                                        .replace(/\r?\n\r?\n$/, '') // Remove trailing newlines
                                        .trim()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Guests */}
                      <div>
                        <h5 className="font-medium text-sm mb-2">👥 Guests ({hostSchedule.totalGuests}):</h5>
                        {hostSchedule.guests.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {hostSchedule.guests.map((guest, guestIndex) => (
                              <Badge key={guestIndex} variant="outline" className="text-xs">
                                {guest}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">[No external visitors]</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < hostSchedules.hostSchedules.length - 1 && (
                  <Separator className="mt-6" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Send Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSend} 
          disabled={isSending}
          size="lg"
          className="cursor-pointer"
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