const TIME_SLOTS = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'];

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

function readFile(path, callback) {
    const fs = require("fs");

    fs.readFile(path, "utf8", (err, data) => {
        if (err) {
            console.error("File not found or could not be read:", err);
            return;
        }

        const lines = data.split("\n");
        const output = lines.map(line => line.split(","));

        callback(output);
    });
}

function isSlotAvailable(schedule, classInfo, slot, classroomCapacities) {
    for (const key in schedule) {
        if (schedule[key].time === slot && (schedule[key].professor === classInfo.professorName || schedule[key].student === classInfo.studentID)) {
            return false;
        }
    }

    const matchingRoom = classroomCapacities.find(room => room.roomID === classInfo.courseID);

    if (matchingRoom && matchingRoom.classroomCapacities / 2 < classInfo.examDuration) {
        return false;
    }

    return true;
}

function findSchedule(classList, index, schedule, examSlots, classroomCapacities) {
    if (index === classList.length) {
        return true;
    }

    for (const slot of examSlots) {
        if (isSlotAvailable(schedule, classList[index], slot, classroomCapacities)) {
            const courseId = classList[index].courseID;
            const { professorName, studentID } = classList[index];

            if (!schedule[courseId]) {
                schedule[courseId] = {
                    time: slot,
                    professor: professorName,
                    students: [studentID]
                };
            } else {
                schedule[courseId].students.push(studentID);
            }

            if (findSchedule(classList, index + 1, schedule, examSlots, classroomCapacities)) {
                return true;
            }

            schedule[courseId].students.pop();

            if (schedule[courseId].students.length === 0) {
                delete schedule[courseId];
            }
        }
    }

    return false;
}

function scheduleExams(classList, examSlots, classroomCapacities) {
    let schedule = {};
    if (findSchedule(classList, 0, schedule, examSlots, classroomCapacities)) {
        return schedule;
    } else {
        return "No feasible schedule found";
    }
}

function main() {
    readFile("Class_List.csv", function (classListData) {
        const classList = classListData.map(fields => new ClassList(Number(fields[0]), fields[1], fields[2], Number(fields[3])));

        readFile("Classroom_Capacities.csv", function (classroomCapacitiesData) {
            const classroomCapacities = classroomCapacitiesData.map(fields => new Classroom(fields[0], Number(fields[1])));

            let examSchedule = scheduleExams(classList, TIME_SLOTS, classroomCapacities);
            console.log("Exam Schedule:", examSchedule);
        });
    });
}

main();
