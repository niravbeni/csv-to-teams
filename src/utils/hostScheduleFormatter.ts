import { HostSchedule, HostScheduleResult } from '@/types/hostSchedule';

// Format individual host schedule for Teams
export const formatHostScheduleForTeams = (hostSchedule: HostSchedule): string => {
  const guestText = hostSchedule.guests.length > 0 
    ? hostSchedule.guests.join(', ')
    : '[No external visitors]';
  
  let message = `👤 **Host Name:**\n${hostSchedule.formattedHostName}\n\n`;
  
  message += `📅 **Bookings for today**\n\n`;
  hostSchedule.bookings.forEach((booking, index) => {
    message += `${index + 1}. **${booking.purpose}**\n\n`;
    message += `   Room: ${booking.room}\n\n`;
    message += `   Time: ${booking.startTime} - ${booking.endTime}\n\n`;
    
    // Add catering information if available
    if (booking.catering) {
      // Extract just the meal name (after the dash)
      const mealName = booking.catering.type.includes(' - ') 
        ? booking.catering.type.split(' - ')[1] 
        : booking.catering.type;
      
      message += `   🍽️ Catering: ${mealName}\n`;
      if (booking.catering.details) {
        // Clean up details by removing cryptic codes at the end (like "12.08 td")
        let cleanDetails = booking.catering.details
          .replace(/\d+\.\d+\s+td$/i, '') // Remove "XX.XX td" at end
          .replace(/\r?\n+$/, '') // Remove trailing newlines
          .trim();
        
        // Replace any remaining \r\n or \n with proper line breaks and indent
        cleanDetails = cleanDetails
          .replace(/\r?\n/g, '\n   ') // Replace line breaks with indented line breaks
          .trim();
        
        if (cleanDetails) {
          message += `   ${cleanDetails}\n`;
        }
      }
      message += '\n';
    }
  });
  
  message += `👥 **Guests:** (${hostSchedule.totalGuests})\n${guestText}\n\n`;
  
  return message;
};

// Format all host schedules for Teams (individual messages)
export const formatHostSchedulesForTeams = (result: HostScheduleResult): string[] => {
  if (result.hostSchedules.length === 0) {
    return ["📅 **Daily Host Summary**\n\nNo host schedules found in the uploaded files."];
  }
  
  return result.hostSchedules.map(hostSchedule => formatHostScheduleForTeams(hostSchedule));
};

// Format individual host schedule for copy-paste
export const formatHostScheduleForCopy = (hostSchedule: HostSchedule): string => {
  const guestText = hostSchedule.guests.length > 0 
    ? hostSchedule.guests.join(', ')
    : '[No external visitors]';
  
  let message = `Host Name:\n${hostSchedule.formattedHostName}\n\n`;
  
  message += `Bookings for today\n\n`;
  hostSchedule.bookings.forEach((booking, index) => {
    message += `${index + 1}. ${booking.purpose}\n\n`;
    message += `   Room: ${booking.room}\n\n`;
    message += `   Time: ${booking.startTime} - ${booking.endTime}\n\n`;
    
    // Add catering information if available
    if (booking.catering) {
      message += `   Catering: ${booking.catering.type} (${booking.catering.covers} covers)\n\n`;
      if (booking.catering.details) {
        message += `   Details: ${booking.catering.details.substring(0, 100)}${booking.catering.details.length > 100 ? '...' : ''}\n\n`;
      }
    }
  });
  
  message += `Guests:\n${guestText}\n`;
  
  return message;
};

// Format all host schedules for copy-paste
export const formatHostSchedulesForCopy = (result: HostScheduleResult): string => {
  if (result.hostSchedules.length === 0) {
    return "Daily Host Summary\n\nNo host schedules found in the uploaded files.";
  }
  
  return result.hostSchedules.map((hostSchedule, index) => 
    formatHostScheduleForCopy(hostSchedule)
  ).join('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
};

// Format statistics summary
export const formatHostStatisticsForTeams = (result: HostScheduleResult): string => {
  const { statistics } = result;
  
  let message = `📊 **Daily Host Summary**\n\n`;
  
  message += `**Statistics:**\n`;
  message += `• Total Hosts: ${statistics.totalHosts}\n`;
  message += `• Total Bookings: ${statistics.totalBookings}\n`;
  message += `• Total Guests: ${statistics.totalGuests}\n\n`;
  
  if (statistics.busiestHost) {
    message += `🏆 **Busiest Host:**\n`;
    message += `${statistics.busiestHost} (${statistics.mostBookings} bookings)\n\n`;
  }
  
  return message;
}; 