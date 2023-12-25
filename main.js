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
        const output = lines.map(line => line.split(",").map(field => (field.trim() === 'undefined' ? undefined : field.trim())));

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
    // Base case: If all classes are scheduled, return true
    if (index === classList.length) {
        return true;
    }

    // Iterate through available slots and classrooms
    for (const slot of examSlots) {
        for (const classroom of classrooms) {
            if (isSlotAvailable(classroom, slot, examDays[index])) {
                const courseId = classList[index].courseID;
                const { professorName, studentID } = classList[index];

                // Create schedule entry for the class
                if (!classroom.schedule[examDays[index]]) {
                    classroom.schedule[examDays[index]] = {};
                }

                if (!classroom.schedule[examDays[index]][slot]) {
                    classroom.schedule[examDays[index]][slot] = {
                        courseId,
                        professor: professorName,
                        students: [studentID]
                    };

                    // Recursively try to schedule the next class
                    if (findSchedule(classList, index + 1, classrooms, examSlots, examDays)) {
                        return true; // If successful, return true
                    }

                    // Backtrack if scheduling fails
                    delete classroom.schedule[examDays[index]][slot];

                    if (Object.keys(classroom.schedule[examDays[index]]).length === 0) {
                        delete classroom.schedule[examDays[index]];
                    }
                }
            }
        }
    }

    return false; // No feasible schedule found
}

function scheduleExams(classList, examSlots, examDays, classrooms) {
    // Iterate through exam days
    for (const examDay of examDays) {
        // Create a new schedule for each exam day
        let schedule = {};

        // Try to find a schedule starting from the first class
        if (findSchedule(classList, 0, classrooms, examSlots, examDays)) {
            // If a feasible schedule is found, return the schedule
            return classrooms.map(classroom => ({
                roomID: classroom.roomID,
                schedule: classroom.schedule
            }));
        }
    }

    // If no feasible schedule is found for any exam day, return an error message
    return "No feasible schedule found";
}

function formatExamSchedule(classrooms) {
    let formattedSchedule = "Exam Schedule:\n";

    for (const day in classrooms[0].schedule) {
        formattedSchedule += `${day}\n`;

        for (const time in classrooms[0].schedule[day]) {
            const { courseId, professor, students } = classrooms[0].schedule[day][time];
            const studentID = students.join(',');

            const formattedTime = time.replace('-', ' - ');

            formattedSchedule += `${formattedTime}: ${courseId} - ${professor} - Room ${classrooms[0].roomID}\n`;
        }
    }

    return formattedSchedule;
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

            // Convert the exam schedule to a formatted string
            let formattedSchedule = formatExamSchedule(examSchedule);

            // Write the formatted schedule to a file
            writeToFile("Exam_Schedule.txt", formattedSchedule);
        });
    });
}

main();
