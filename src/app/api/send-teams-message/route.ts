import { NextRequest, NextResponse } from 'next/server';
import { TeamsMessage } from '@/types/meeting';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, message, messageType = 'card' } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let payload;
    
    if (messageType === 'card') {
      // Send as Teams MessageCard
      payload = message as TeamsMessage;
    } else {
      // Send as simple text message
      payload = {
        text: message
      };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Teams webhook error:', errorText);
      return NextResponse.json(
        { error: `Failed to send Teams message: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.text();
    
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully to Teams',
      response: result
    });

  } catch (error) {
    console.error('Error sending Teams message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 