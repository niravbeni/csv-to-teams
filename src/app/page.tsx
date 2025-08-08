'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Settings } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CsvUpload from '@/components/CsvUpload';
import MessagePreview from '@/components/MessagePreview';
import { MeetingData, ProcessedMeeting } from '@/types/meeting';
import { processMeetingData } from '@/utils/csvParser';
import { formatMultipleMeetingsForTeams } from '@/utils/teamsFormatter';

export default function Home() {
  const [processedMeetings, setProcessedMeetings] = useState<ProcessedMeeting[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [messageMode, setMessageMode] = useState<'individual' | 'combined'>('individual');

  // Load default webhook URL and message mode from localStorage
  useEffect(() => {
    // Load webhook URL from localStorage if available
    const savedWebhook = localStorage.getItem('teamsWebhookUrl');
    if (savedWebhook) {
      setWebhookUrl(savedWebhook);
    }
    
    // Load message mode from localStorage (default to 'individual')
    const savedMessageMode = localStorage.getItem('messageMode') as 'individual' | 'combined';
    if (savedMessageMode && (savedMessageMode === 'individual' || savedMessageMode === 'combined')) {
      setMessageMode(savedMessageMode);
    }

    // Listen for storage changes (when settings are updated in another tab/page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'messageMode' && e.newValue) {
        const newMode = e.newValue as 'individual' | 'combined';
        if (newMode === 'individual' || newMode === 'combined') {
          setMessageMode(newMode);
        }
      }
    };

    // Listen for focus events (when user returns from settings page)
    const handleFocus = () => {
      const currentMode = localStorage.getItem('messageMode') as 'individual' | 'combined';
      if (currentMode && (currentMode === 'individual' || currentMode === 'combined')) {
        setMessageMode(currentMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleDataParsed = (meetings: MeetingData[]) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const processed = processMeetingData(meetings);
      setProcessedMeetings(processed);
      setIsProcessing(false);
      
      toast.success(`Found ${processed.length} meeting(s) from CSV file`);
    }, 500);
  };

  const handleSendMessage = async (messages: string[]) => {
    if (!webhookUrl.trim()) {
      toast.error('No webhook URL configured');
      return;
    }

    setIsSending(true);
    
    let successCount = 0;
    let failureCount = 0;

    try {
      // Send each message separately with a small delay between them
      for (let i = 0; i < messages.length; i++) {
        try {
          const response = await fetch('/api/send-teams-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              webhookUrl: webhookUrl.trim(),
              message: messages[i],
              messageType: 'text'
            }),
          });

          const result = await response.json();

          if (response.ok) {
            successCount++;
          } else {
            failureCount++;
            console.error(`Failed to send message ${i + 1}:`, result.error);
          }
        } catch (error) {
          failureCount++;
          console.error(`Network error for message ${i + 1}:`, error);
        }

        // Add a small delay between messages to avoid rate limiting
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Show appropriate success/error message
      if (successCount === messages.length) {
        toast.success(`All ${messages.length} meeting messages sent successfully to Teams!`);
      } else if (successCount > 0) {
        toast.error(`${successCount} of ${messages.length} messages sent successfully. ${failureCount} failed.`);
      } else {
        toast.error('Failed to send any messages to Teams');
      }
    } catch {
      toast.error('Network error: Failed to send messages');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Title & Description */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">CSV to Teams</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your meeting CSV file and send beautifully formatted schedules to Microsoft Teams
            </p>
            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings & Configuration
              </Button>
            </Link>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
              <CardDescription>Follow these simple steps to send your meeting schedule to Teams</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Upload a CSV file with meeting data</li>
                <li>Review the generated message preview</li>
                <li>Send the message directly to your Teams channel</li>
              </ol>
            </CardContent>
          </Card>

          {/* CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Upload Meeting Data</CardTitle>
              </div>
              <CardDescription>Upload your CSV file with meeting information</CardDescription>
            </CardHeader>
            <CardContent>
              <CsvUpload onDataParsed={handleDataParsed} isProcessing={isProcessing} />
            </CardContent>
          </Card>

          {/* Message Preview */}
          {processedMeetings.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <MessagePreview 
                  meetings={processedMeetings} 
                  onSendMessage={handleSendMessage} 
                  isSending={isSending}
                  messageMode={messageMode}
                />
              </CardContent>
            </Card>
          )}

          {/* Sample Data */}
          {processedMeetings.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expected CSV Format</CardTitle>
                <CardDescription>Here&apos;s the format your CSV file should follow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-sm text-muted-foreground font-mono overflow-x-auto">
                    {`2025-08-08,Q3 Strategy Review,Conference Call,Room 201B,Alice Cooper; Robert Martinez; Jennifer Lee
2025-08-08,Software Developer Interviews,Interviews,Room 305,Tom Anderson; Lisa Park; James Wright
2025-08-08,Client Onboarding Session,Client Meeting,Executive Suite,Rachel Green; Mark Thompson; Sophie Davis`}
                  </pre>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Format: Date (YYYY-MM-DD), Meeting Type, Category, Room, Members (semicolon-separated, first member is the host).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <footer className="border-t bg-muted/50 mt-16">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Separator className="mb-6" />
          <div className="text-center text-muted-foreground text-sm">
            <p className="font-medium">CSV to Teams Webhook Integration</p>
            <p className="mt-1">Built with Next.js, TypeScript & shadcn/ui</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
