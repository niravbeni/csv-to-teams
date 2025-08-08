# CSV to Teams Webhook Integration

A modern React TypeScript Next.js web application that processes CSV files containing meeting data and sends formatted messages to Microsoft Teams channels via webhooks.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## Features

- 🚀 **Modern UI**: Built with Next.js 14, TypeScript, shadcn/ui, and Tailwind CSS
- 📄 **CSV Upload**: Drag & drop interface for CSV file uploads
- 🔗 **Teams Integration**: Direct webhook integration with Microsoft Teams
- 🎨 **Message Formatting**: Automatically formats meeting data into professional Teams messages
- 📋 **Copy to Clipboard**: Copy generated messages for manual use
- 🔧 **Configurable**: Editable webhook URLs with secure storage
- 📱 **Responsive**: Works seamlessly on desktop and mobile devices
- ⚡ **Real-time Preview**: Live preview of formatted messages before sending

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Microsoft Teams webhook URL

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd csv-to-teams
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and update the webhook URL:
   ```env
   TEAMS_WEBHOOK_URL=your-actual-teams-webhook-url-here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## CSV File Format

The application expects CSV files with the following format:

```csv
meetingDate,hostName,meetingType,meetingRoom,meetingMembers
8/8/25,Sergio Fregoni,All-Day,G08,Jane Smith Lisa Rodriguez John Doe Michael Chen
8/8/25,Sarah Johnson,Standard,A15,Mike Chen Lisa Rodriguez Tom Wilson Amanda White
8/9/25,Rachel Green,Client Meeting,C22,Robert Taylor Emma Davis Kevin Park Sophie Miller
```

### Field Descriptions

- **meetingDate**: Date in MM/DD/YY format
- **hostName**: Name of the meeting host
- **meetingType**: Type of meeting (e.g., Standard, Executive, Client Meeting)
- **meetingRoom**: Room name or location
- **meetingMembers**: Space-separated list of attendee names

## How to Use

1. **Configure Webhook**: Enter your Teams webhook URL in the configuration section
2. **Upload CSV**: Drag and drop your CSV file or click to browse
3. **Review Preview**: Check the formatted message preview
4. **Send Message**: Click "Send to Teams" to deliver the message to your channel

## Teams Webhook Setup

To get a Teams webhook URL:

1. Open Microsoft Teams
2. Go to the channel where you want to receive messages
3. Click on the three dots (...) next to the channel name
4. Select "Connectors"
5. Find "Incoming Webhook" and click "Add"
6. Give your webhook a name and upload an image (optional)
7. Copy the webhook URL provided

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── send-teams-message/
│   │       └── route.ts          # Teams webhook API endpoint
│   ├── globals.css               # Global styles
│   ├── layout.tsx               # App layout
│   └── page.tsx                 # Main application page
├── components/
│   ├── CsvUpload.tsx            # CSV file upload component
│   ├── MessagePreview.tsx       # Message preview and sending
│   └── WebhookConfig.tsx        # Webhook URL configuration
├── types/
│   └── meeting.ts               # TypeScript type definitions
└── utils/
    ├── csvParser.ts             # CSV parsing utilities
    └── teamsFormatter.ts        # Teams message formatting
```

## Deployment

### Deploy to Vercel

1. **Push to GitHub**: Push your code to a GitHub repository

2. **Deploy to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Connect your GitHub repository
   - Configure environment variables in the Vercel dashboard
   - Deploy!

3. **Environment Variables**: Set the following in your Vercel dashboard:
   ```
   TEAMS_WEBHOOK_URL=your-teams-webhook-url
   ```

### Other Deployment Options

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Digital Ocean App Platform
- AWS Amplify

## API Endpoints

### POST `/api/send-teams-message`

Sends a message to Teams webhook.

**Request Body:**
```json
{
  "webhookUrl": "https://outlook.office.com/webhook/...",
  "message": "Formatted message text",
  "messageType": "text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully to Teams"
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **CSV Parsing**: PapaParse
- **File Upload**: React Dropzone
- **Icons**: Lucide React
- **Notifications**: Sonner

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Notes

- Webhook URLs are stored in environment variables and not exposed to the client
- The application validates webhook URLs before sending requests
- CSV files are processed client-side for privacy

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, TypeScript, shadcn/ui, and Tailwind CSS**
