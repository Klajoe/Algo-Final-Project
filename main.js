// Importing the necessary modules
const fs = require('fs');
const Papa = require('papaparse');

// Function to read and parse CSV file
function readCSVFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return Papa.parse(fileContent, { header: true }).data;
}

// Function to check if the slot is available considering the new constraints
function isSlotAvailable(schedule, classInfo, slot, classroomCapacities) {
    // Check if the professor is already scheduled
    for (let key in schedule) {
        if (schedule[key].time === slot && schedule[key].professor === classInfo.ProfessorName) {
            return false; // Professor conflict
        }
    }

    // Check classroom capacity constraint
    let capacity = classroomCapacities.find(room => room.RoomID === classInfo.RoomID).Capacity;
    if (capacity / 2 < parseInt(classInfo.ExamDuration)) {
        return false; // Classroom capacity constraint not met
    }

    return true; // Slot is available
}

// Updated backtracking scheduler
function scheduleExams(classList, examSlots, classroomCapacities) {
    let schedule = {};
    if (findSchedule(classList, 0, schedule, examSlots, classroomCapacities)) {
        return schedule;
    } else {
        return "No feasible schedule found";
    }
}

// Recursive function to find a feasible schedule
function findSchedule(classList, index, schedule, examSlots, classroomCapacities) {
    if (index === classList.length) {
        return true;
    }

    for (let slot of examSlots) {
        if (isSlotAvailable(schedule, classList[index], slot, classroomCapacities)) {
            schedule[classList[index].CourseID] = { time: slot, professor: classList[index].ProfessorName };
            if (findSchedule(classList, index + 1, schedule, examSlots, classroomCapacities)) {
                return true;
            }
            delete schedule[classList[index].CourseID];
        }
    }

    return false;
}

// Main function to execute the scheduling
function main() {
    let classList = readCSVFile('path/to/Updated_Class_List.csv');
    let classroomCapacities = readCSVFile('path/to/Updated_Classroom_Capacities.csv');
    let examSlots = ['9:00-10:00', '10:00-11:00', '11:00-12:00']; // Simplified exam slots
    let examSchedule = scheduleExams(classList, examSlots, classroomCapacities);
    console.log("Exam Schedule:", examSchedule);
}

// Run the program
main();
