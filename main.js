class Classroom {
    constructor(roomID, classroomCapacities) {
        this.roomID = roomID;
        this.classroomCapacities = classroomCapacities;
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
        if (schedule[key].time === slot && (schedule[key].professor === classInfo.ProfessorName || schedule[key].student === classInfo.StudentID)) {
            return false; // Conflict found
        }
    }

    // Check classroom capacity constraint
    let matchingRoom = classroomCapacities.find(room => room.RoomID === classInfo.CourseID);

    if (matchingRoom && matchingRoom.Capacity / 2 < classInfo.ExamDuration) {
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
            schedule[classList[index].CourseID] = { time: slot, professor: classList[index].ProfessorName, student: classList[index].StudentID };
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
    readFile("Class_List.csv", function (classListData) {
        const classList = classListData.map(fields => ({
            StudentID:Number([0]),
            ProfessorName: fields[1],
            CourseID: fields[2],
            ExamDuration: Number(fields[3]) // Assuming ExamDuration is a number
        }));

        readFile("Classroom_Capacities.csv", function (classroomCapacitiesData) {
            const classroomCapacities = classroomCapacitiesData.map(fields => new Classroom(fields[0], Number(fields[1])));

            let examSlots = ['9:00-10:00', '10:00-11:00', '11:00-12:00'];
            let examSchedule = scheduleExams(classList, examSlots, classroomCapacities);
            console.log("Exam Schedule:", examSchedule);
        });
    });
}

main();
