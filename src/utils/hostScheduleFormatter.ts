import { HostSchedule, HostScheduleResult } from '@/types/hostSchedule';

// Format individual host schedule for Teams
export const formatHostScheduleForTeams = (hostSchedule: HostSchedule): string => {
  const guestText = hostSchedule.guests.length > 0 
    ? hostSchedule.guests.join(', ')
    : '[No external visitors]';
  
  let message = `👤 **Host Name:**\n${hostSchedule.formattedHostName}\n\n`;
  
  message += `📅 **Bookings:** (${hostSchedule.totalBookings})\n`;
  hostSchedule.bookings.forEach((booking, index) => {
    message += `${index + 1}. **Room:** ${booking.room}\n`;
    message += `   **Time:** ${booking.startTime} - ${booking.endTime}\n`;
    message += `   **Purpose:** ${booking.purpose}\n\n`;
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
  
  message += `Bookings:\n`;
  hostSchedule.bookings.forEach(booking => {
    message += `Room - ${booking.room}\n`;
    message += `Time - ${booking.startTime} - ${booking.endTime}\n`;
    message += `Purpose - ${booking.purpose}\n\n`;
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