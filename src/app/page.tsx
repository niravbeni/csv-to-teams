'use client';

import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { toast } from 'sonner';
import MultiCsvUpload from '@/components/MultiCsvUpload';
import HostSchedulePreview from '@/components/HostSchedulePreview';
import { MasterMeetingRecord } from '@/types/masterMeeting';
import { HostScheduleResult } from '@/types/hostSchedule';
import { groupMeetingsByHost } from '@/utils/hostScheduleProcessor';

export default function Home() {
  const [hostSchedules, setHostSchedules] = useState<HostScheduleResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);


  const handleDataParsed = (meetings: MasterMeetingRecord[]) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      // Generate host-centric data
      const hostScheduleResult = groupMeetingsByHost(meetings);
      setHostSchedules(hostScheduleResult);
      
      setIsProcessing(false);
      
      toast.success(`Generated ${hostScheduleResult.statistics.totalHosts} priority host schedule(s) from ${meetings.length} meeting(s)`);
    }, 500);
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
              Upload CABS CSV files and generate priority host daily schedules with catering information
            </p>
          </div>



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
                />
              </CardContent>
            </Card>
          )}




        </div>
      </main>

    </div>
  );
}
