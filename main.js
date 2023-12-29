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


function scheduleExams(classList, capacities) {
  const schedule = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  const rooms = ['A301', 'A302', 'A303', 'A304', 'A305']; // Örnek sınıf listesi
  let roomIndex = 0;

  classList.forEach((entry, index) => {
    const day = Object.keys(schedule)[index % Object.keys(schedule).length];
    const time = '9:00 AM - 10:30 AM';
    const room = rooms[roomIndex]; // Sınıf seçimi
    const course = entry.CourseID;
    schedule[day].push(${time}: ${course} - ${room});

    // Sonraki sınıfa geç
    roomIndex = (roomIndex + 1) % rooms.length;
  });

  return schedule;
}


// Function to display the schedule and blocked hours
function displaySchedule(schedule ) {
  console.log('\nExam Schedule:');
  Object.keys(schedule).forEach(day => {
    console.log(day);
    schedule[day].forEach(entry => console.log(entry));
  });

  
  // Write schedule to CSV file
  const csvContent = Object.keys(schedule).map(day => {
    const dayEntries = schedule[day].map(entry => ${day},${entry});
    return dayEntries.join('\n');
  }).join('\n');

  const outputFilePath = 'Exam_Schedule.csv';
  fs.writeFileSync(outputFilePath, csvContent);
  console.log(\nExam schedule has been written to ${outputFilePath});
}

// Main program
const classListPath = 'Class_List.csv';
const capacitiesPath = 'Classroom_Capacities.csv';

const classList = readCSV(classListPath);
const capacities = readCSV(capacitiesPath);


const examSchedule = scheduleExams(classList, capacities, );
displaySchedule(examSchedule, );
