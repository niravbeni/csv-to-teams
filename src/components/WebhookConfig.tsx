'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WebhookConfigProps {
  value: string;
  onChange: (value: string) => void;
}

export default function WebhookConfig({ value, onChange }: WebhookConfigProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    // Save to localStorage for persistence
    localStorage.setItem('teamsWebhookUrl', newValue);
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy webhook URL:', error);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.includes('webhook.office.com') || url.includes('outlook.office.com');
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Teams Webhook Configuration</h3>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="webhook-url" className="text-sm font-medium">
          Teams Webhook URL
        </Label>
        
        <div className="relative">
                        <Input
                id="webhook-url"
                type={isVisible ? 'text' : 'password'}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="https://ideo0.webhook.office.com/webhookb2/..."
            className={`pr-20 ${
              value && !isValidUrl(value) 
                ? 'border-destructive focus-visible:ring-destructive' 
                : ''
            }`}
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="h-7 w-7 p-0 cursor-pointer"
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        
        {value && !isValidUrl(value) && (
          <p className="text-sm text-destructive">
            Please enter a valid Teams webhook URL (should contain &apos;webhook.office.com&apos;)
          </p>
        )}
        
        <p className="text-sm text-muted-foreground">
          Enter your Teams webhook URL. You can get this from the Teams channel connector settings.
        </p>
      </div>
    </div>
  );
} 