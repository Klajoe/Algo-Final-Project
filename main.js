const fs = require('fs');
const readlineSync = require('readline-sync');

// Function to read CSV file and return data as an array of objects
function readCSV(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const entry = {};
    headers.forEach((header, i) => {
      entry[header.trim()] = values[i].trim();
    });
    return entry;
  });
}

// Function to get user input for blocked hours
function getBlockedHours() {
  const blockedHours = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Ask if there are blocked hours at the beginning
  const hasBlockedHours = readlineSync.keyInYNStrict('Do you have blocked hours?');
  if (!hasBlockedHours) {
    return blockedHours;
  }

  // Ask for blocked hours for a specific day
  const day = readlineSync.keyInSelect(days, 'Select the day for blocked hours:');
  if (day === -1) {
    // User pressed cancel, return empty blocked hours
    return blockedHours;
  }

  // Ask for the specific hours on the selected day
  const hours = readlineSync.question(`Enter blocked hours for ${days[day]} (e.g., 9:00 AM - 12:00 PM): `);
  if (hours.trim() !== '') {
    blockedHours[days[day]] = hours.trim();
  }

  return blockedHours;
}

// Function to schedule exams using backtracking
function scheduleExams(classList, capacities, blockedHours) {
  // Implementation of the scheduling algorithm goes here
  // You may use backtracking, greedy algorithms, or other strategies

  // Placeholder for demonstration purposes
  const schedule = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  // Placeholder schedule output
  classList.forEach((entry, index) => {
    const day = Object.keys(schedule)[index % Object.keys(schedule).length];
    const time = '9:00 AM - 10:30 AM';
    const room = 'Room A301'; // Placeholder room assignment
    const course = entry.CourseID;
    schedule[day].push(`${time}: ${course} - ${room}`);
  });

  return schedule;
}

// Function to display the schedule and blocked hours
function displaySchedule(schedule, blockedHours) {
  console.log('\nExam Schedule:');
  Object.keys(schedule).forEach(day => {
    console.log(day);
    schedule[day].forEach(entry => console.log(entry));
  });

  console.log('\nBlocked Hours:');
  Object.keys(blockedHours).forEach(day => {
    console.log(day);
    console.log(`${blockedHours[day]}: Common Course`);
  });

  // Write schedule to CSV file
  const csvContent = Object.keys(schedule).map(day => {
    const dayEntries = schedule[day].map(entry => `${day},${entry}`);
    return dayEntries.join('\n');
  }).join('\n');

  const outputFilePath = 'Exam_Schedule.csv';
  fs.writeFileSync(outputFilePath, csvContent);
  console.log(`\nExam schedule has been written to ${outputFilePath}`);
}

// Main program
const classListPath = 'Class_List.csv';
const capacitiesPath = 'Classroom_Capacities.csv';

const classList = readCSV(classListPath);
const capacities = readCSV(capacitiesPath);
const blockedHours = getBlockedHours();

const examSchedule = scheduleExams(classList, capacities, blockedHours);
displaySchedule(examSchedule, blockedHours);
