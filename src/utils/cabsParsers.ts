import Papa from 'papaparse';
import { 
  FunctionRoomData, 
  FunctionSummaryData, 
  TrainingRoomData, 
  VisitorData 
} from '@/types/cabsData';

// CABS CSV Parsers
// ================
// Handles the specific CABS system CSV formats with metadata mixed in

// Helper function to clean CSV data and extract actual records
const cleanCABSData = (rawData: string[][], reportType: 'function-room' | 'function-summary' | 'training-room' | 'visitor-list'): string[][] => {
  console.log(`Processing ${reportType} - Raw data rows:`, rawData.length);
  
  // For CABS CSV files, ALL rows contain the header info mixed with data
  // We need to identify data rows by checking if they contain actual meaningful data
  const cleaned = rawData.filter((row, index) => {
    console.log(`Row ${index} (${row.length} cols):`, row);
    
    // Skip empty rows 
    if (!row || row.length < 15) {
      console.log(`Row ${index} skipped: too few columns (${row?.length})`);
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
      console.log(`Visitor check - Name: "${visitorName}", Host: "${hostName}", Valid: ${hasValidData}`);
    } else if (reportType === 'function-room' || reportType === 'function-summary') {
      // For function reports, check if we have room info around position 15-18
      const roomInfo = row[15]?.trim();
      const timeInfo = row[16]?.trim();
             hasValidData = !!(roomInfo && timeInfo && 
                      !roomInfo.includes('Start at') && 
                      !roomInfo.includes('Room'));
      console.log(`Function check - Room: "${roomInfo}", Time: "${timeInfo}", Valid: ${hasValidData}`);
    } else if (reportType === 'training-room') {
      // For training, check around position 12-15
      const bookingRef = row[12]?.trim();
      const timeInfo = row[13]?.trim();
             hasValidData = !!(bookingRef && timeInfo && 
                      !bookingRef.includes('Booking') &&
                      timeInfo.match(/\d{2}:\d{2}/)); // Time format
      console.log(`Training check - Ref: "${bookingRef}", Time: "${timeInfo}", Valid: ${hasValidData}`);
    }
    
    if (hasValidData) {
      console.log(`Row ${index} kept - contains valid ${reportType} data`);
    } else {
      console.log(`Row ${index} skipped - no valid ${reportType} data`);
    }
    
    return hasValidData;
  });
  
  console.log(`${reportType} cleaned data rows:`, cleaned.length);
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
          console.log('Function Room Raw Data:', results.data.slice(0, 3));
          
          const cleanData = cleanCABSData(results.data as string[][], 'function-room');
          console.log('Function Room Clean Data:', cleanData.slice(0, 3));
          
          const functionRooms = cleanData.map((row, index) => {
            console.log(`Row ${index} length: ${row.length}, first 25 columns:`, row.slice(0, 25));
            
            const roomInfo = row[15] || '';
            const roomCode = roomInfo.match(/\((\d+)\)/)?.[1] || ''; // Extract code like "6117" from "(6117)"
            
            if (index < 5) {
              console.log(`Row ${index} room: "${roomInfo}" -> code: "${roomCode}"`);
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
            console.log(`Record ${index} valid: ${isValid}`, record);
            return isValid;
          });
          
          console.log('Final Function Room Records:', functionRooms);
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
// Column positions: BookingRef(12), Start(13), End(14), Covers(15), Contact(16), Purpose(17)
export const parseTrainingRoomReport = (file: File): Promise<TrainingRoomData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const cleanData = cleanCABSData(results.data as string[][], 'training-room');
          
          const trainingRooms = cleanData.map(row => ({
            bookingRef: row[12] || '',
            startTime: row[13] || '',
            endTime: row[14] || '',
            covers: parseInt(row[15]) || 0,
            contact: row[16] || '',
            purpose: row[17] || ''
          })).filter(record => 
            // Filter out invalid records
            record.bookingRef && record.contact && record.purpose
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
      } else {
        resolve('unknown');
      }
    };
    
    // Read just the first 1KB to detect type
    reader.readAsText(file.slice(0, 1024));
  });
};

// Validate CSV file structure
export const validateCABSFile = (file: File, expectedType: string): Promise<boolean> => {
  return new Promise((resolve) => {
    detectCABSFileType(file).then(detectedType => {
      resolve(detectedType === expectedType);
    });
  });
}; 