'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import WebhookConfig from '@/components/WebhookConfig';

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [messageMode, setMessageMode] = useState<'individual' | 'combined'>('individual');

  useEffect(() => {
    // Load webhook URL from environment variable as default
    const defaultWebhook = process.env.NEXT_PUBLIC_TEAMS_WEBHOOK_URL;
    if (defaultWebhook) {
      setWebhookUrl(defaultWebhook);
    }
    
    // Load message mode from localStorage
    const savedMessageMode = localStorage.getItem('messageMode') as 'individual' | 'combined';
    if (savedMessageMode && (savedMessageMode === 'individual' || savedMessageMode === 'combined')) {
      setMessageMode(savedMessageMode);
    }
  }, []);

  const handleMessageModeChange = (checked: boolean) => {
    const newMode = checked ? 'individual' : 'combined';
    setMessageMode(newMode);
    localStorage.setItem('messageMode', newMode);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
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

          {/* Message Mode Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Message Mode</CardTitle>
              <CardDescription>
                Choose how meeting messages are sent to Teams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="message-mode" className="text-sm font-medium">
                    Send Individual Messages
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {messageMode === 'individual' 
                      ? 'Each meeting will be sent as a separate Teams message'
                      : 'All meetings will be combined into one Teams message'
                    }
                  </p>
                </div>
                <Switch
                  id="message-mode"
                  checked={messageMode === 'individual'}
                  onCheckedChange={handleMessageModeChange}
                  className="cursor-pointer"
                />
              </div>
              
              {/* Visual indicator */}
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Current Mode: {messageMode === 'individual' ? 'Individual Messages' : 'Combined Message'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {messageMode === 'individual' 
                    ? '✓ Each meeting = 1 separate Teams message'
                    : '✓ All meetings = 1 combined Teams message'
                  }
                </div>
              </div>
            </CardContent>
          </Card>



          
        </div>
      </main>
    </div>
  );
} 