const fs = require("fs");

const TIME_SLOTS = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

class Classroom {
    constructor(roomID, classroomCapacity) {
        this.roomID = roomID;
        this.classroomCapacity = classroomCapacity;
        this.schedule = {};
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

function isSlotAvailable(classroom, slot, examDay) {
    const schedule = classroom.schedule;

    if (schedule[examDay] && schedule[examDay][slot]) {
        return false;
    }

    return true;
}

function findSchedule(classList, index, classrooms, examSlots, examDays) {
    if (index === classList.length) {
        return true;
    }

    for (const slot of examSlots) {
        for (const classroom of classrooms) {
            if (isSlotAvailable(classroom, slot, examDays[index])) {
                const courseId = classList[index].courseID;
                const { professorName, studentID } = classList[index];

                if (!classroom.schedule[examDays[index]]) {
                    classroom.schedule[examDays[index]] = {};
                }

                if (!classroom.schedule[examDays[index]][slot]) {
                    classroom.schedule[examDays[index]][slot] = {
                        courseId,
                        professor: professorName,
                        students: [studentID]
                    };

                    if (findSchedule(classList, index + 1, classrooms, examSlots, examDays)) {
                        return true;
                    }

                    delete classroom.schedule[examDays[index]][slot];

                    if (Object.keys(classroom.schedule[examDays[index]]).length === 0) {
                        delete classroom.schedule[examDays[index]];
                    }
                }
            }
        }
    }

    return false;
}

function scheduleExams(classList, examSlots, examDays, classrooms) {
    for (const examDay of examDays) {
        let schedule = {};

        if (findSchedule(classList, 0, classrooms, examSlots, examDays)) {
            return classrooms.map(classroom => ({
                roomID: classroom.roomID,
                schedule: classroom.schedule
            }));
        }
    }

    return "No feasible schedule found";
}

function writeToFile(filename, data) {
    fs.writeFile(filename, data, (err) => {
        if (err) {
            console.error("Error writing to file:", err);
        } else {
            console.log(`Output written to ${filename}`);
        }
    });
}

function main() {
    readFile("Class_List.csv", function (classListData) {
        const classList = classListData.map(fields => new ClassList(Number(fields[0]), fields[1], fields[2], Number(fields[3])));

        readFile("Classroom_Capacities.csv", function (classroomCapacitiesData) {
            const classrooms = classroomCapacitiesData.map(fields => new Classroom(fields[0], Number(fields[1])));

            let examSchedule = scheduleExams(classList, TIME_SLOTS, DAYS, classrooms);

            // Convert the exam schedule to a CSV-formatted string
            let csvContent = "RoomID,Day,Time,ClassID,Professor,StudentID\n";
            examSchedule.forEach(classroom => {
                const roomID = classroom.roomID;
                for (const day in classroom.schedule) {
                    for (const time in classroom.schedule[day]) {
                        const { courseId, professor, students } = classroom.schedule[day][time];
                        const studentID = students.join(',');
                        csvContent += `${roomID},${day},${time},${courseId},${professor},${studentID}\n`;
                    }
                }
            });

            // Write the CSV data to a file
            writeToFile("Exam_Schedule.csv", csvContent);
        });
    });
}

main();
