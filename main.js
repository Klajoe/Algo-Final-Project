class Classroom {
    constructor(roomID, classroomCapacities) {
        this.roomID = roomID;
        this.classroomCapacities = classroomCapacities;
    }
}

class ClassList {
    constructor(studentID, professorName, courseID, examDuration) {
        this.studentID = studentID;
        this.professorName = professorName;
        this.courseID = courseID;
        this.examDuration = examDuration;
    }
}

// Function to read file
function readFile(path, callback) {
    const fs = require("fs");

    fs.readFile(path, "utf8", (err, data) => {
        if (err) {
            console.error("File is not found !!!", err);
            return;
        }

        const lines = data.split("\n");
        const output = [];

        lines.forEach((line) => {
            const fields = line.split(",");
            output.push(fields);
        });

        callback(output); // Invoke the callback with the output array
    });
}
function isSlotAvailable(schedule, classInfo, slot, classroomCapacities) {
    // Check professor and student conflicts
    for (let key in schedule) {
        if (schedule[key].time === slot && (schedule[key].professor === classInfo.professorName || schedule[key].student === classInfo.studentID)) {
            return false; // Conflict found
        }
    }

    // Check classroom capacity constraint
    let matchingRoom = classroomCapacities.find(room => room.roomID === classInfo.courseID);

    if (matchingRoom && matchingRoom.classroomCapacities / 2 < classInfo.examDuration) {
        return false; // Classroom capacity constraint not met
    }

    return true; // Slot is available
}



// Backtracking scheduler function
function scheduleExams(classList, examSlots, classroomCapacities) {
    let schedule = {};
    if (findSchedule(classList, 0, schedule, examSlots, classroomCapacities)) {
        return schedule;
    } else {
        return "No feasible schedule found";
    }
}

// Recursive function for finding a feasible schedule
function findSchedule(classList, index, schedule, examSlots, classroomCapacities) {
    if (index === classList.length) {
        return true;
    }

    for (let slot of examSlots) {
        if (isSlotAvailable(schedule, classList[index], slot, classroomCapacities)) {
            const courseId = classList[index].courseID;

            // Check if the courseID is already in the schedule
            if (!schedule[courseId]) {
                schedule[courseId] = {
                    time: slot,
                    professor: classList[index].professorName,
                    students: [classList[index].studentID] // Start with an array for students
                };
            } else {
                // If the courseID is already in the schedule, add the student ID
                schedule[courseId].students.push(classList[index].studentID);
            }

            if (findSchedule(classList, index + 1, schedule, examSlots, classroomCapacities)) {
                return true;
            }

            // If scheduling with the current slot is unsuccessful, remove the student ID
            schedule[courseId].students.pop();

            // If no more students for the course, remove the course from the schedule
            if (schedule[courseId].students.length === 0) {
                delete schedule[courseId];
            }
        }
    }

    return false;
}



// Main function to execute the scheduling
function main() {
    readFile("Class_List.csv", function (classListData) {
        const classList = classListData.map(fields => new ClassList(Number(fields[0]), fields[1], fields[2], Number(fields[3])));

        readFile("Classroom_Capacities.csv", function (classroomCapacitiesData) {
            const classroomCapacities = classroomCapacitiesData.map(fields => new Classroom(fields[0], Number(fields[1])));

            let examSlots = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'];
            let examSchedule = scheduleExams(classList, examSlots, classroomCapacities);
            console.log("Exam Schedule:", examSchedule);
        });

    });
}

main();
