'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, MapPin, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { HostScheduleResult } from '@/types/hostSchedule';
import { 
  formatHostSchedulesForCopy,
  formatHostScheduleForCopy
} from '@/utils/hostScheduleFormatter';

interface HostSchedulePreviewProps {
  hostSchedules: HostScheduleResult;
}

export default function HostSchedulePreview({ 
  hostSchedules
}: HostSchedulePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [individualCopied, setIndividualCopied] = useState<Record<string, boolean>>({});
  


  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      const copyText = formatHostSchedulesForCopy(hostSchedules);
      
      // Create rich text with HTML formatting for bold headings
      const htmlText = copyText
        .replace(/HOST NAME:/g, '<b>HOST NAME:</b>')
        .replace(/BOOKINGS FOR TODAY/g, '<b>BOOKINGS FOR TODAY</b>')
        .replace(/GUESTS:/g, '<b>GUESTS:</b>')
        .replace(/(\d+\. )([A-Z][^]*?)(\n\n)/g, '$1<b>$2</b>$3') // Bold meeting names
        .replace(/\n/g, '<br>');
      
      // Copy both plain text and rich HTML to clipboard
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([copyText], { type: 'text/plain' }),
        'text/html': new Blob([htmlText], { type: 'text/html' })
      });
      
      await navigator.clipboard.write([clipboardItem]);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback to plain text if rich text copy fails
      try {
        const copyText = formatHostSchedulesForCopy(hostSchedules);
        await navigator.clipboard.writeText(copyText);
        setCopied(true);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  };

  const handleIndividualCopy = async (hostSchedule: import('@/types/hostSchedule').HostSchedule, hostName: string) => {
    try {
      const copyText = formatHostScheduleForCopy(hostSchedule);
      
      // Create rich text with HTML formatting for bold headings
      const htmlText = copyText
        .replace(/HOST NAME:/g, '<b>HOST NAME:</b>')
        .replace(/BOOKINGS FOR TODAY/g, '<b>BOOKINGS FOR TODAY</b>')
        .replace(/GUESTS:/g, '<b>GUESTS:</b>')
        .replace(/(\d+\. )([A-Z][^]*?)(\n\n)/g, '$1<b>$2</b>$3') // Bold meeting names
        .replace(/\n/g, '<br>');
      
      // Copy both plain text and rich HTML to clipboard
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([copyText], { type: 'text/plain' }),
        'text/html': new Blob([htmlText], { type: 'text/html' })
      });
      
      await navigator.clipboard.write([clipboardItem]);
      setIndividualCopied(prev => ({ ...prev, [hostName]: true }));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIndividualCopied(prev => ({ ...prev, [hostName]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy individual schedule:', error);
      // Fallback to plain text if rich text copy fails
      try {
        const copyText = formatHostScheduleForCopy(hostSchedule);
        await navigator.clipboard.writeText(copyText);
        setIndividualCopied(prev => ({ ...prev, [hostName]: true }));
        
        setTimeout(() => {
          setIndividualCopied(prev => ({ ...prev, [hostName]: false }));
        }, 2000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy} 
              className="flex items-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {hostSchedules.hostSchedules.map((hostSchedule, index) => (
              <div key={hostSchedule.hostName} className="border-l-4 border-primary pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        👤 {hostSchedule.formattedHostName}
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIndividualCopy(hostSchedule, hostSchedule.formattedHostName)}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        {individualCopied[hostSchedule.formattedHostName] ? (
                          <>
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-xs">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
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


    </div>
  );
} 