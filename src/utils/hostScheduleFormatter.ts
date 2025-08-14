import { HostSchedule, HostScheduleResult } from '@/types/hostSchedule';

// Format individual host schedule for copy/paste
export const formatHostScheduleForCopy = (hostSchedule: HostSchedule): string => {
  const guestText = hostSchedule.guests.length > 0 
    ? hostSchedule.guests.join(', ')
    : '[No external visitors]';
  
  let message = `HOST NAME:\n${hostSchedule.formattedHostName}\n\n`;
  
  message += `BOOKINGS FOR TODAY\n\n`;
  hostSchedule.bookings.forEach((booking, index) => {
    message += `${index + 1}. ${booking.purpose.toUpperCase()}\n\n`;
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
  
  message += `GUESTS:\n${guestText}\n`;
  
  return message;
};

// Format all host schedules for copy/paste (combined)
export const formatHostSchedulesForCopy = (result: HostScheduleResult): string => {
  if (result.hostSchedules.length === 0) {
    return "Daily Host Summary\n\nNo host schedules found in the uploaded files.";
  }
  
  return result.hostSchedules.map((hostSchedule) => 
    formatHostScheduleForCopy(hostSchedule)
  ).join('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
}; 