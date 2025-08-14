'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Settings, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import MultiCsvUpload from '@/components/MultiCsvUpload';
import MasterPreview from '@/components/MasterPreview';
import HostSchedulePreview from '@/components/HostSchedulePreview';
import { MasterMeetingRecord } from '@/types/masterMeeting';
import { HostScheduleResult } from '@/types/hostSchedule';
import { groupMeetingsByHost } from '@/utils/hostScheduleProcessor';

export default function Home() {
  const [masterMeetings, setMasterMeetings] = useState<MasterMeetingRecord[]>([]);
  const [hostSchedules, setHostSchedules] = useState<HostScheduleResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const messageMode = 'individual'; // Always individual mode

  // Load default webhook URL and message mode from localStorage
  useEffect(() => {
    // Load webhook URL from localStorage first, then fallback to environment variable
    const savedWebhook = localStorage.getItem('teamsWebhookUrl');
    if (savedWebhook) {
      setWebhookUrl(savedWebhook);
    } else {
      // Fallback to environment variable if no saved webhook
      const defaultWebhook = process.env.NEXT_PUBLIC_TEAMS_WEBHOOK_URL;
      if (defaultWebhook) {
        setWebhookUrl(defaultWebhook);
        // Save the default to localStorage for future use
        localStorage.setItem('teamsWebhookUrl', defaultWebhook);
      }
    }
    

  }, []);

  const handleDataParsed = (meetings: MasterMeetingRecord[]) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      setMasterMeetings(meetings);
      
      // Generate host-centric data
      const hostScheduleResult = groupMeetingsByHost(meetings);
      setHostSchedules(hostScheduleResult);
      
      setIsProcessing(false);
      
      toast.success(`Generated ${hostScheduleResult.statistics.totalHosts} host schedule(s) from ${meetings.length} meeting(s)`);
    }, 500);
  };

  const handleSendMessage = async (messages: string[]) => {
    if (!webhookUrl.trim()) {
      toast.error('No webhook URL configured. Please go to Settings to add your Teams webhook URL.');
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
          {/* Settings Button - Top Left */}
          <div className="flex justify-start mb-4">
            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>

          {/* Title & Description */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">CSV to Teams</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload CABS CSV files and send host-centric daily schedules to Microsoft Teams
            </p>
          </div>

          {/* Webhook URL Warning */}
          {!webhookUrl.trim() && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Teams webhook URL not configured.</strong> Go to{' '}
                <Link href="/settings" className="underline font-medium">
                  Settings
                </Link>{' '}
                to add your Teams webhook URL before sending messages.
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
              <CardDescription>Follow these simple steps to send your consolidated meeting schedule to Teams</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Upload 3 CABS CSV files: <strong>Function Room Report</strong>, <strong>Visitor Arrival List</strong>, and <strong>Catering Report</strong></li>
                <li>Send the formatted messages directly to your Teams channel or copy for manual posting</li>
        </ol>
            </CardContent>
          </Card>

          {/* CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Upload CABS CSV Files</CardTitle>
              </div>
              <CardDescription>Upload Function Room Report + Visitor Arrival List + Catering Report to generate host daily schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiCsvUpload onDataParsed={handleDataParsed} isProcessing={isProcessing} />
            </CardContent>
          </Card>

          {/* Master Preview */}
          {hostSchedules && hostSchedules.hostSchedules.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <HostSchedulePreview 
                  hostSchedules={hostSchedules} 
                  onSendMessage={handleSendMessage} 
                  isSending={isSending}
                />
              </CardContent>
            </Card>
          )}




        </div>
      </main>

    </div>
  );
}
