import Papa from 'papaparse';
import { 
  FunctionRoomData, 
  FunctionSummaryData, 
  TrainingRoomData, 
  VisitorData,
  CateringRecord
} from '@/types/cabsData';

// CABS CSV Parsers
// ================
// Handles the specific CABS system CSV formats with metadata mixed in

// Helper function to clean CSV data and extract actual records
const cleanCABSData = (rawData: string[][], reportType: 'function-room' | 'function-summary' | 'training-room' | 'visitor-list' | 'catering'): string[][] => {
  // For CABS CSV files, ALL rows contain the header info mixed with data
  // We need to identify data rows by checking if they contain actual meaningful data
  const cleaned = rawData.filter((row, index) => {
    // Skip empty rows 
    if (!row || row.length < 15) {
      return false;
    }
    
    // For different report types, check for actual data in expected positions
    let hasValidData = false;
    
    if (reportType === 'visitor-list') {
      // For visitor list, check if position 10 has visitor name and position 11 has host
      const visitorName = row[10]?.trim();
      const hostName = row[11]?.trim();
             hasValidData = !!(visitorName && hostName && 
                      visitorName !== 'Visitor and Company' && 
                      hostName !== 'Host Name and Contact Details');
    } else if (reportType === 'function-room' || reportType === 'function-summary') {
      // For function reports, check if we have room info around position 15-18
      const roomInfo = row[15]?.trim();
      const timeInfo = row[16]?.trim();
             hasValidData = !!(roomInfo && timeInfo && 
                      !roomInfo.includes('Start at') && 
                      !roomInfo.includes('Room'));
    } else if (reportType === 'training-room') {
      // For training, check around position 12-15
      const bookingRef = row[12]?.trim();
      const timeInfo = row[13]?.trim();
             hasValidData = !!(bookingRef && timeInfo && 
                      !bookingRef.includes('Booking') &&
                      timeInfo.match(/\d{2}:\d{2}/)); // Time format
    } else if (reportType === 'catering') {
      // For catering, check column 16/17 for catering type and column 20 for room
      const cateringCode = row[16]?.trim();
      const cateringName = row[17]?.trim(); 
      const room = row[20]?.trim();
             hasValidData = !!(cateringCode && cateringName && room && 
                      !cateringCode.includes('Extras') &&
                      !room.includes('Room') &&
                      room.length > 3); // Room should have meaningful content
    }
    
    return hasValidData;
  });
  
  // console.log(`${reportType}: ${cleaned.length} records found (from ${rawData.length} raw rows)`);
  return cleaned;
};

// Parse Function Room Report CSV
// Based on actual structure: Room(15), Start(16), End(17), Covers(18), Contact(19), FuncNo(20), Status(21), RoomUse(22), Purpose(23)
export const parseFunctionRoomReport = (file: File): Promise<FunctionRoomData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const cleanData = cleanCABSData(results.data as string[][], 'function-room');
          
          const functionRooms = cleanData.map((row, index) => {
            const roomInfo = row[15] || '';
            // Extract room code for matching - prioritize main room numbers over parenthetical codes
            let roomCode = '';
            
            // Strategy 1: Look for room numbers at the start (e.g., "149/150" from "149/150 x34 (+8 ex)")
            const mainRoomMatch = roomInfo.match(/^(\d+(?:\/\d+)?)/);
            if (mainRoomMatch) {
              roomCode = mainRoomMatch[1];
            } 
            // Strategy 2: Look in parentheses for 4-digit codes: "(6149)" or "(6132/6133)" 
            else {
              const parenMatch = roomInfo.match(/\((\d{4}[\/\d]*)\)/);
              if (parenMatch) {
                roomCode = parenMatch[1];
              } 
              // Strategy 3: Any number sequence as fallback
              else {
                const numberMatch = roomInfo.match(/\d+/);
                roomCode = numberMatch ? numberMatch[0] : '';
              }
            }
            
            return {
              room: roomInfo,
              startTime: row[16] || '',
              endTime: row[17] || '',
              covers: parseInt(row[18]) || 0,
              contact: row[19] || '',
              funcNo: row[20] || '',
              status: row[21] || '',
              roomUse: row[22] || '',
              purpose: row[23] || '',
              roomCode: roomCode // Add room code for linking
            };
          }).filter((record, index) => {
            const isValid = record.funcNo && record.contact && record.purpose;
            return isValid;
          });
          
          resolve(functionRooms);
        } catch (error) {
          console.error('Function Room parsing error:', error);
          reject(new Error(`Function Room Report parsing error: ${error}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

// Parse Function Summary Report CSV
// Column positions: Date(16), Room(17), Start(18), End(19), Covers(20), Host(21), Purpose(22), FuncNo(23), Session(24), Use(25)
export const parseFunctionSummaryReport = (file: File): Promise<FunctionSummaryData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const cleanData = cleanCABSData(results.data as string[][], 'function-summary');
          
          const functionSummary = cleanData.map(row => ({
            date: row[16] || '',
            room: row[17] || '',
            startTime: row[18] || '',
            endTime: row[19] || '',
            covers: parseInt(row[20]) || 0,
            host: row[21] || '',
            purpose: row[22] || '',
            funcNo: row[23] || '',
            session: row[24] || '',
            use: row[25] || ''
          })).filter(record => 
            // Filter out invalid records
            record.funcNo && record.host && record.purpose
          );
          
          resolve(functionSummary);
        } catch (error) {
          reject(new Error(`Function Summary Report parsing error: ${error}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

// Parse Training Room Report CSV
// Column positions: Room(13), Start(14), End(15), Covers(16), Contact(17), Purpose(18)
export const parseTrainingRoomReport = (file: File): Promise<TrainingRoomData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const cleanData = cleanCABSData(results.data as string[][], 'training-room');
          
          const trainingRooms = cleanData.map((row, index) => ({
            bookingRef: `TR${Date.now()}-${index}`, // Generate a booking ref since not provided
            startTime: row[14] || '',
            endTime: row[15] || '',
            covers: parseInt(row[16]) || 0,
            contact: row[17] || '',
            purpose: row[18] || ''
          })).filter(record => 
            // Filter out invalid records
            record.contact && record.purpose && record.startTime
          );
          
          resolve(trainingRooms);
        } catch (error) {
          reject(new Error(`Training Room Report parsing error: ${error}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

// Parse Visitor Arrival List CSV
// Column positions: Time(9), Visitor(10), Host(11), ContactNo(12)
export const parseVisitorArrivalList = (file: File): Promise<VisitorData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const cleanData = cleanCABSData(results.data as string[][], 'visitor-list');
          
          const visitors = cleanData.map(row => ({
            arrivalTime: row[9] || '', // This is the visitor arrival time
            visitorName: row[10] || '',
            hostName: row[11] || '',
            contactNumber: row[12] || undefined
          })).filter(record => 
            // Filter out invalid records
            record.visitorName && record.hostName && record.arrivalTime
          );
          
          resolve(visitors);
        } catch (error) {
          reject(new Error(`Visitor Arrival List parsing error: ${error}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

// Detect CABS file type based on content
export const detectCABSFileType = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    // Read first few lines to detect file type
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const firstLines = content.split('\n').slice(0, 5).join('\n').toLowerCase();
      
      if (firstLines.includes('function summary report (by room)')) {
        resolve('function-room');
      } else if (firstLines.includes('function summary report')) {
        resolve('function-summary');
      } else if (firstLines.includes('training rooms report')) {
        resolve('training-room');
      } else if (firstLines.includes('visitors arrival list')) {
        resolve('visitor-list');
      } else if (firstLines.includes('for catering')) {
        resolve('catering');
      } else {
        resolve('unknown');
      }
    };
    
    // Read just the first 1KB to detect type
    reader.readAsText(file.slice(0, 1024));
  });
};

// Parse Catering Report CSV
export const parseCateringReport = (file: File): Promise<CateringRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawData = results.data as string[][];
          const cleanData = cleanCABSData(rawData, 'catering');
          
          const cateringRecords = cleanData.map((row, index) => {
            // CORRECTED column mapping based on actual CSV structure:
            // Col 16: Catering code (BA, BB, etc)  
            // Col 17: Catering name (Breakfast A, etc)
            // Col 20: Room number
            // Col 22: Meet start time  
            // Col 23: Meet end time
            // Col 25: Covers
            // Col 26: Notes
            const cateringCode = row[16] || ''; // Column 16 - Catering code (BA, BB)
            const cateringName = row[17] || ''; // Column 17 - Catering name (Breakfast A)
            const hostInfo = row[19] || ''; // Column 19 - Host information  
            const room = row[20] || ''; // Column 20 - Room number
            const bufferStart = row[21] || ''; // Column 21 - Buffer start
            const meetStart = row[22] || ''; // Column 22 - Meet start time
            const meetEnd = row[23] || ''; // Column 23 - Meet end time  
            const bufferEnd = row[24] || ''; // Column 24 - Buffer end
            const covers = parseInt(row[25]) || 0; // Column 25 - Covers
            const notes = row[26] || ''; // Column 26 - Notes (catering details)
            
            const record = {
              hostRaw: hostInfo,
              hostNormalized: hostInfo.toLowerCase().trim(),
              room: room,
              roomCode: extractRoomCode(room),
              meetStart: meetStart,
              meetEnd: meetEnd,
              covers: covers,
              cateringType: `${cateringCode} - ${cateringName}`.trim(),
              cateringDetails: notes,
              date: new Date().toISOString().split('T')[0], // Use current date
              bufferStart: bufferStart,
              bufferEnd: bufferEnd
            } as CateringRecord;
            
            return record;
          }).filter(record => {
            const isValid = record.room && record.cateringType && (record.meetStart || record.bufferStart);
            return isValid;
          });
          
          // Successfully parsed catering records
          console.log(`🍽️ CATERING: Found ${cateringRecords.length} records`);
          if (cateringRecords.length > 0) {
            console.log('🍽️ Sample catering records:', cateringRecords.slice(0, 3).map(r => ({
              room: r.room,
              roomCode: r.roomCode,
              type: r.cateringType,
              time: `${r.meetStart}-${r.meetEnd}`
            })));
          }
          
          resolve(cateringRecords);
        } catch (error) {
          reject(new Error(`Catering Report parsing error: ${error}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

// Helper function to extract room code from room string
const extractRoomCode = (roomString: string): string | undefined => {
  if (!roomString) return undefined;
  
  // Try different patterns to extract room codes
  const patterns = [
    /\((\d+)\)/, // "(6117)" or "(6132/6133)"
    /(\d+)\/(\d+)/, // "132/133" -> use first number
    /^(\d+)/, // "149" -> "149" 
    /(\d+)/, // Any number sequence
    /Room\s*(\d+)/i, // "Room 123"
    /^([A-Z]\d+)/, // "G10", "M2" etc
  ];
  
  for (const pattern of patterns) {
    const match = roomString.match(pattern);
    if (match) {
      // For patterns with multiple captures, use the first number
      return match[1];
    }
  }
  
  // If no number found, try to extract just the room identifier
  const cleanRoom = roomString.replace(/[^\w\d]/g, '').toUpperCase();
  return cleanRoom.length > 0 ? cleanRoom : undefined;
};

// Validate CSV file structure
export const validateCABSFile = (file: File, expectedType: string): Promise<boolean> => {
  return new Promise((resolve) => {
    detectCABSFileType(file).then(detectedType => {
      resolve(detectedType === expectedType);
    });
  });
}; 