const fs = require('fs').promises;
const readline = require('readline');

class Time {
    constructor(hour, minute, day) {
        this.hour = hour;
        this.minute = minute;
        this.day = day;
    }

    toString() {
        return `${this.formatTime(this.hour)}:${this.formatTime(this.minute)}`;
    }

    formatTime(value) {
        return value < 10 ? `0${value}` : `${value}`;
    }
}

class Exam {
    constructor(courseID, examDuration, startTime, endTime, roomID) {
        this.courseID = courseID;
        this.examDuration = examDuration;
        this.startTime = startTime;
        this.endTime = endTime;
        this.roomID = roomID;
    }

    toString() {
        return `${this.startTime.toString()} - ${this.endTime.toString()}: ${this.courseID} - Room ${this.roomID}`;
    }
}

class Classroom {
    constructor(roomID, capacity) {
        this.roomID = roomID;
        this.capacity = capacity;
        this.schedule = [];
    }
}

class Schedule {
    constructor(classrooms) {
        this.classrooms = classrooms;
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        this.blockedHours = {};
    }

    async readCSV(fileName) {
        try {
            const data = await fs.readFile(fileName, 'utf8');
            const lines = data.trim().split('\n');
            const headers = lines[0].split(',');
            const list = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const item = {};

                for (let j = 0; j < headers.length; j++) {
                    item[headers[j].trim()] = values[j].trim();
                }
                list.push(item);
            }
            return list;
        } catch (error) {
            console.error(`Error reading CSV file ${fileName}: ${error.message}`);
            throw error;
        }
    }

    async readClassList() {
        return await this.readCSV('Class_List.csv');
    }

    async readClassroomCapacities() {
        return await this.readCSV('Classroom_Capacities.csv');
    }

    async askBlockedHours() {
        try {
            let numberOfBlockedHours = parseInt(await this.askQuestion("How many blocked hours would you like to add? "));
            for (let i = 0; i < numberOfBlockedHours; i++) {
                let day = await this.askQuestion("Enter the day of blocked hours (e.g., 'Wednesday'): ");
                let startTimeString = await this.askQuestion("Enter starting time (e.g., '14:00'): ");
                let minuteAndSecond = startTimeString.split(':');
                let startTime = new Time(parseInt(minuteAndSecond[0]), parseInt(minuteAndSecond[1]), day);
                let endTimeString = await this.askQuestion("Enter ending time (e.g., '16:00'): ");
                minuteAndSecond = endTimeString.split(':');
                let endTime = new Time(parseInt(minuteAndSecond[0]), parseInt(minuteAndSecond[1]), day);
                let description = await this.askQuestion("Enter description (e.g., 'Common Course (TİT102)'): ");

                if (!this.blockedHours[day]) {
                    this.blockedHours[day] = [];
                }

                this.blockedHours[day].push({ startTime, endTime, description });
                console.log(`${i + 1}. Blocked hours have been added.`);
                console.log(`Day - ${day}, Start Time - ${startTime}, End Time - ${endTime}, Description - ${description}\n`);
            }
        } catch (error) {
            console.error(`Error while adding blocked hours: ${error.message}`);
            throw error;
        }
    }

    async generateSchedule() {
        try {
            const classList = await this.readClassList();
            const classroomCapacities = await this.readClassroomCapacities();

            this.classrooms = classroomCapacities.map(({ RoomID, Capacity }) => new Classroom(RoomID, parseInt(Capacity)));

            await this.askBlockedHours();

            for (let day of this.days) {
                console.log(`${day} Schedule:`);

                const sortedCourses = this.sortCoursesByExamDuration(classList);
                const scheduledCourses = new Set();

                for (let currentCourse of sortedCourses) {
                    const courseID = currentCourse['CourseID'];
                    const examDuration = parseInt(currentCourse['ExamDuration']);

                    // Check if the course is already scheduled for the day
                    if (scheduledCourses.has(courseID)) {
                        console.log(`Course ${courseID} is already scheduled for ${day}. Skipping.`);
                        continue;
                    }

                    // Use the backtracking scheduling algorithm
                    if (!this.scheduleExamBacktrack(courseID, examDuration, day)) {
                        console.log(`Unable to schedule exam for ${courseID}. Skipping.`);
                        continue;
                    }

                    // Mark the course as scheduled for the day
                    scheduledCourses.add(courseID);
                }

                console.log();
            }
        } catch (error) {
            console.error(`Error while generating schedule: ${error.message}`);
        }
    }

    sortCoursesByExamDuration(classList) {
        // Sort courses by exam duration in descending order
        return classList.sort((a, b) => parseInt(b['ExamDuration']) - parseInt(a['ExamDuration']));
    }

    scheduleExamBacktrack(courseID, examDuration, day) {
        const existingExams = this.getAllScheduledExamsForDay(day);

        const startTime = new Time(9, 0, day);
        const endTime = new Time(17, 30, day);

        const availableTime = this.findTimeWithoutConflict(existingExams, examDuration, startTime, endTime);

        if (availableTime) {
            const endOfExam = new Time(availableTime.hour + Math.floor(examDuration / 60), availableTime.minute + (examDuration % 60), day);
            const exam = new Exam(courseID, examDuration, availableTime, endOfExam, null);
            this.assignClassroom(exam);
            return true;
        }

        return false; // Unable to schedule the exam
    }

    assignClassroom(exam) {
        const availableClassrooms = this.classrooms.filter(classroom => classroom.capacity >= exam.examDuration / 2);

        if (availableClassrooms.length === 0) {
            console.log(`No available classrooms for ${exam.courseID}.`);
            return null;
        }

        availableClassrooms.sort((a, b) => a.schedule.length - b.schedule.length);

        const chosenClassroom = availableClassrooms[0]; // Choose the classroom with the fewest scheduled exams
        exam.roomID = chosenClassroom.roomID;
        chosenClassroom.schedule.push(exam);

        return exam;
    }

    getAllScheduledExamsForDay(day) {
        const exams = [];

        for (let classroom of this.classrooms) {
            const examsForDay = classroom.schedule.filter(exam => exam.startTime.day === day);
            exams.push(...examsForDay);
        }

        return exams;
    }

    findTimeWithoutConflict(existingExams, duration, startTime, endTime) {
        let currentTime = new Time(startTime.hour, startTime.minute, startTime.day);

        while (currentTime.hour < endTime.hour || (currentTime.hour === endTime.hour && currentTime.minute < endTime.minute)) {
            let conflictingExam = existingExams.find(exam => this.isTimeConflict(currentTime, duration, exam.startTime, exam.endTime));

            if (!conflictingExam) {
                return new Time(currentTime.hour, currentTime.minute, currentTime.day);
            }

            currentTime = this.addTime(currentTime, 30); // Move to the next half-hour slot
        }

        return null;
    }

    isTimeConflict(time1, duration, startTime2, endTime2) {
        const endTime1 = this.addTime(time1, duration);

        if (time1.day !== startTime2.day) {
            return false; // Different days, no conflict
        }

        return !(endTime1.hour < startTime2.hour || (endTime1.hour === startTime2.hour && endTime1.minute <= startTime2.minute) ||
                 (time1.hour >= endTime2.hour || (time1.hour === endTime2.hour && time1.minute >= endTime2.minute)));
    }

    addTime(time, minutes) {
        const totalMinutes = time.hour * 60 + time.minute + minutes;
        const newHour = Math.floor(totalMinutes / 60);
        const newMinute = totalMinutes % 60;

        return new Time(newHour, newMinute, time.day);
    }

    printSchedule() {
        console.log('Exam Schedule:');

        for (let day of this.days) {
            console.log(`${day}`);
            for (let classroom of this.classrooms) {
                const examsForDay = classroom.schedule.filter(exam => exam.startTime.day === day);
                examsForDay.forEach(exam => {
                    console.log(`${exam.startTime.toString()} - ${exam.endTime.toString()}: ${exam.courseID} - Room ${exam.roomID}`);
                });
            }
        }

        console.log('\nBlocked Hours:');

        for (let day of this.days) {
            console.log(`${day}`);
            const blockedHours = this.blockedHours[day] || [];
            blockedHours.forEach(blockedHour => {
                console.log(`${blockedHour.startTime.toString()} - ${blockedHour.endTime.toString()}: ${blockedHour.description}`);
            });
            console.log(); // Add an empty line for better separation
        }
    }

    async askQuestion(query) {
        return new Promise(resolve => rl.question(query, ans => resolve(ans)));
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    try {
        const schedule = new Schedule([]);

        // Read classroom capacities and initialize classrooms
        const classroomsData = await schedule.readClassroomCapacities();
        schedule.classrooms = classroomsData.map(({ RoomID, Capacity }) => new Classroom(RoomID, parseInt(Capacity)));

        // Generate the schedule
        await schedule.generateSchedule();
        schedule.printSchedule();
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
    } finally {
        rl.close();
    }
}

main();
