'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import WebhookConfig from '@/components/WebhookConfig';

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('');


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



  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="outline" size="sm" className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Main
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Settings className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            </div>
          </div>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Teams Webhook Configuration</CardTitle>
              <CardDescription>
                Configure your Microsoft Teams webhook URL to send meeting schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookConfig value={webhookUrl} onChange={setWebhookUrl} />
            </CardContent>
          </Card>





          
        </div>
      </main>
    </div>
  );
} 