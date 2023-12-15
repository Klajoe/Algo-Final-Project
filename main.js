// Hardcoded data simulating the contents of the CSV files
const classList = [
    { StudentID: 1001, ProfessorName: 'John Smith', CourseID: 'CENG201', ExamDuration: 60 },
    { StudentID: 1002, ProfessorName: 'Jane Doe', CourseID: 'MATH202', ExamDuration: 120 },
    { StudentID: 1003, ProfessorName: 'John Smith', CourseID: 'CENG203', ExamDuration: 60 },
    // ... add more entries as needed
];

const classroomCapacities = [
    { RoomID: 'CENG201', Capacity: 40 },
    { RoomID: 'MATH202', Capacity: 30 },
    { RoomID: 'CENG203', Capacity: 50 },
    // ... add more entries as needed
];

// Function to check if the slot is available
function isSlotAvailable(schedule, classInfo, slot) {
    // Check professor and student conflicts
    for (let key in schedule) {
        if (schedule[key].time === slot && (schedule[key].professor === classInfo.ProfessorName || schedule[key].student === classInfo.StudentID)) {
            return false; // Conflict found
        }
    }

    // Check classroom capacity constraint
    let capacity = classroomCapacities.find(room => room.RoomID === classInfo.CourseID).Capacity;
    if (capacity / 2 < classInfo.ExamDuration) {
        return false; // Classroom capacity constraint not met
    }

    return true; // Slot is available
}

// Backtracking scheduler function
function scheduleExams(classList, examSlots) {
    let schedule = {};
    if (findSchedule(classList, 0, schedule, examSlots)) {
        return schedule;
    } else {
        return "No feasible schedule found";
    }
}

// Recursive function for finding a feasible schedule
function findSchedule(classList, index, schedule, examSlots) {
    if (index === classList.length) {
        return true;
    }

    for (let slot of examSlots) {
        if (isSlotAvailable(schedule, classList[index], slot)) {
            schedule[classList[index].CourseID] = { time: slot, professor: classList[index].ProfessorName, student: classList[index].StudentID };
            if (findSchedule(classList, index + 1, schedule, examSlots)) {
                return true;
            }
            delete schedule[classList[index].CourseID];
        }
    }

    return false;
}

// Main function to execute the scheduling
function main() {
    let examSlots = ['9:00-10:00', '10:00-11:00', '11:00-12:00']; // Simplified exam slots
    let examSchedule = scheduleExams(classList, examSlots);
    console.log("Exam Schedule:", examSchedule);
}

main();
    