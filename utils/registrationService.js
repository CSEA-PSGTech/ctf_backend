const XLSX = require('xlsx');
const path = require('path');

// In-memory cache for registration data
let registrationCache = null;

const getFilePath = () => path.join(__dirname, '..', 'data', 'Registration.xlsx');

/**
 * Load and process Excel file - Called once on server startup
 * Stores raw rows for iteration-based lookup
 */
const loadRegistrationData = () => {
  try {
    const filePath = getFilePath();
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0] || 'Form Responses 1';
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON - keep all columns as-is
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    
    registrationCache = jsonData || [];
    
    console.log(`📊 Loaded ${registrationCache.length} registration rows from Excel`);
    return registrationCache;
    
  } catch (error) {
    console.error('❌ Error loading registration data:', error.message);
    registrationCache = [];
    return [];
  }
};

/**
 * Get difficulty for a roll number by checking Excel data
 * @param {string} email - Email like 23n239@psgtech.ac.in
 * @returns {string|null} - 'intermediate', 'beginner', or null if not found
 */
const getDifficultyFromExcel = (email) => {
  try {
    if (!email) return null;
    const rollNo = email.split('@')[0].trim().toUpperCase();
    
    console.log(`🔍 Looking for roll number: ${rollNo}`);
    
    if (!registrationCache) {
      loadRegistrationData();
    }
    
    if (!registrationCache || registrationCache.length === 0) {
      return null;
    }

    // Iterate through each row
    for (let i = 0; i < registrationCache.length; i++) {
      const row = registrationCache[i];
      const rollNoColumns = Object.keys(row).filter(key => key.startsWith('Roll No'));
      
      for (const column of rollNoColumns) {
        const cellValue = row[column]?.toString().trim().toUpperCase();
        
        if (cellValue === rollNo) {
          const ctfExperience = row['Do You have previous experience in CTF']?.trim() || '';
          
          if (ctfExperience.includes('Yes') && ctfExperience.includes('attented')) {
            return 'intermediate';
          } else {
            return 'beginner';
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in getDifficultyFromExcel:', error.message);
    return null;
  }
};

/**
 * Append a newly registered user to Registration.xlsx
 */
const appendRegistrationToExcel = (registration) => {
  try {
    const filePath = getFilePath();
    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (e) {
      workbook = XLSX.utils.book_new();
    }

    const sheetName = workbook.SheetNames[0] || 'Form Responses 1';
    const worksheet = workbook.Sheets[sheetName];
    
    const rollNo = (registration.email || '').split('@')[0].trim().toUpperCase();
    const experienceText = registration.difficulty === 'intermediate'
      ? 'Yes , I have attented CTF events'
      : 'No, This is my first CTF';
    
    const newRow = {
      'Timestamp': new Date().toLocaleString(),
      'Name (Team Member 1)': registration.team_name || '',
      'Roll No': rollNo,
      'Year': registration.year || '',
      'Department': registration.department || 'CSE',
      'Name (Team Member 2)': '',
      'Roll No_1': '',
      'Year_1': '',
      'Department_1': '',
      'Name (Team Member 3)': '',
      'Roll No_2': '',
      'Year_2': '',
      'Department_2': '',
      'Do You have previous experience in CTF': experienceText
    };

    let existingData = [];
    if (worksheet) {
      existingData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    }
    existingData.push(newRow);

    const headers = [
      'Timestamp',
      'Name (Team Member 1)',
      'Roll No',
      'Year',
      'Department',
      'Name (Team Member 2)',
      'Roll No_1',
      'Year_1',
      'Department_1',
      'Name (Team Member 3)',
      'Roll No_2',
      'Year_2',
      'Department_2',
      'Do You have previous experience in CTF'
    ];

    const newWorksheet = XLSX.utils.json_to_sheet(existingData, { header: headers });
    workbook.Sheets[sheetName] = newWorksheet;
    if (!workbook.SheetNames.includes(sheetName)) {
      XLSX.utils.book_append_sheet(workbook, newWorksheet, sheetName);
    }

    XLSX.writeFile(workbook, filePath);
    registrationCache = existingData;
    console.log(`✅ Appended registration for team "${registration.team_name}" (${rollNo}) to Registration.xlsx`);
  } catch (error) {
    console.error('❌ Failed to append registration to Excel:', error.message);
  }
};

module.exports = {
  loadRegistrationData,
  getDifficultyFromExcel,
  appendRegistrationToExcel
};
