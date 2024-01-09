const fs = require('fs');
const readline = require('readline');
const { scheduler } = require('timers/promises');
const prompt = require('prompt-sync')({ sigint: true });

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const startHour = 9; // 9:00 AM
const endHour = 18; // 6:00 PM

function timeToMinutes(time) {
    const [hour, minute] = time.match(/(\d+):(\d+)/).slice(1, 3);
    return parseInt(hour) * 60 + parseInt(minute);
}

function minutesToTime(minutes) {
    const hour = Math.floor(minutes / 60) % 24;
    const minute = minutes % 60;
    return `${hour<10 ? '0'+hour : hour}:${minute === 0 ? '00' : minute}`;
}

async function readFileLines(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const lines = [];

    for await (const line of rl) {
        lines.push(line);
    }

    return lines.slice(1); // Skip the header line
}


function findNextAvailableSlot(duration, room) {
    let dayIndex = room.nextAvailableDay;
    let startTime = room.nextAvailableTime;

    while (dayIndex < 5 % 6) {
        const endTime = startTime + duration;

        if (startTime >= startHour * 60 && endTime <= endHour*60) {
            return { dayIndex, startTime, endTime };
        }

        dayIndex++;
        startTime = startHour * 60; // Reset start time for the next day
    }

    return null; // If no suitable slot is found
}

function objectiveFunction(schedule, courses) {
    let error = 0;
    // Check for lecturer conflicts
    for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
            const [day1, time1, course1] = schedule[i].split(',').map(str => str.trim());
            const [start1, end1] = time1.split(' - ').map(str => str.trim());

            const [day2, time2, course2] = schedule[j].split(',').map(str => str.trim());
            const [start2, end2] = time2.split(' - ').map(str => str.trim());

            // Convert start and end times to minutes for easier comparison
            const start1Minutes = timeToMinutes(start1);
            const end1Minutes = timeToMinutes(end1);
            const start2Minutes = timeToMinutes(start2);
            const end2Minutes = timeToMinutes(end2);

            // Check for overlapping intervals
            if (day1 == day2 && course1 !== course2 && ((start1Minutes < end2Minutes && end1Minutes > start2Minutes) || (start2Minutes < end1Minutes && end2Minutes > start1Minutes))) {
                error -= 100; // Lecturer conflict penalty
            }
        }
    }

    // Check for student conflicts
    for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
            const [day1, time1, course1] = schedule[i].split(',').map(str => str.trim());
            const [coursename1, room1] = course1.split(' - ').map(str => str.trim());
            const [start1, end1] = time1.split(' - ').map(str => str.trim());

            const [day2, time2, course2] = schedule[j].split(',').map(str => str.trim());
            const [coursename2, room2] = course2.split(' - ').map(str => str.trim());
            const [start2, end2] = time2.split(' - ').map(str => str.trim());
           
            if (coursename1 !== coursename2) {
                // Check if there's a common student in both courses
                const commonStudents = courses.find(course => course.name === coursename1).std.filter(student => courses.find(course => course.name === coursename2).std.includes(student));
                
                // Check for time overlap for common students
                for (const student of commonStudents) {
                    if (time1.includes(student) && time2.includes(student) &&
                        ((start1 >= start2 && start1 < end2) || (end1 > start2 && end1 <= end2) || (start1 <= start2 && end1 >= end2))) {
                        error -= 10; // Student conflict penalty
                    }
                }
            }
        }
    }

    return error;
}

function roundNearest5(num) {
    return Math.round(num / 5) * 5;
}

async function hillClimbingScheduler(initialSchedule, courses, maxIterations) {
    let currentSchedule = [...initialSchedule];
    let currentError = objectiveFunction(currentSchedule, courses);

    if(currentError == 0)
        return initialSchedule;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let newSchedule = [...currentSchedule];
        const randomIndex = Math.floor(Math.random() * newSchedule.length);

        // Randomly move one course to a new time slot
        const [day, time, course] = newSchedule[randomIndex].split(',').map(str => str.trim());
        const [start, end] = time.split(' - ').map(str => str.trim());

        const newDayIndex = (days.indexOf(day) + Math.floor(Math.random() * 4) + 1) % 5; // Move to a different day
        const newStartTime = roundNearest5(startHour * 60 + Math.floor(Math.random() * ((endHour - startHour) * 60 - timeToMinutes(end) + timeToMinutes(start))));

        newSchedule[randomIndex] = `${days[newDayIndex]},${minutesToTime(newStartTime)} - ${minutesToTime(newStartTime + timeToMinutes(end) - timeToMinutes(start))},${course}`;

        const newError = objectiveFunction(newSchedule, courses);

        // Move to the new schedule if it reduces the error
        if (newError > currentError) {
            currentSchedule = newSchedule;
            currentError = newError;
        }

        if(newError == 0)
            return currentSchedule;
    }

    return currentSchedule;
}

async function assignCoursesToRooms(coursesFilePath, roomsFilePath,courses) {
    const coursesLines = await readFileLines(coursesFilePath);
    const roomsLines = await readFileLines(roomsFilePath);

    let rooms = roomsLines.map(line => ({ roomId: line.split(',')[0],roomSize: line.split(',')[1], nextAvailableTime: startHour * 60, nextAvailableDay: 0, blockedTime: Infinity}));
    rooms.sort((a, b) => a.roomSize - b.roomSize);

    const courseDetails = coursesLines.map(line => ({
        studentId: line.split(',')[0],
        professorName: line.split(',')[1], 
        courseId: line.split(',')[2],
        duration: parseInt(line.split(',')[3])
    }));

    let schedule = [];

    let blockedDayIndex = -1;
    let blockedStartTime
    let flagBlocked

    // Block a specific hour
    const blockHour = prompt('Do you want to block a specific hour? (y/n): ').toLowerCase() === 'y';
    let blockedDay, blockedTime, blockedMin = 0, blockedName;
    if (blockHour) {

        flagBlocked = true;

        blockedDay = prompt('Which day? (Example: Tuesday): ');
        blockedTime = prompt('Which hour? (Example: 10:00): ');
        blockedMin = prompt('How many minutes will it take? (Example: 60): ');
        blockedName = prompt('Name of the event? (Example: TIT101): ');

        blockedDayIndex = days.indexOf(blockedDay.charAt(0).toUpperCase() + blockedDay.slice(1).toLowerCase());
        blockedStartTime = timeToMinutes(blockedTime);
        blockedMin = parseInt(blockedMin);

        if (blockedDayIndex !== -1 && blockedStartTime >= startHour * 60) {
            // Update rooms to block the specified hour
            rooms.forEach(room => {
                room.blockedTime = blockedStartTime;
            });
        } else {
            console.log('Invalid day or hour input. Blocking skipped.');
        }
    }

    for (const { studentId, professorName, courseId, duration } of courseDetails) {
        let course = courses.find(c => c.name === courseId);
        
        if (!course) {
            course = { name: courseId, count: 1, std: [], prof: professorName };
            courses.push(course);
        }

        course.count++;
        course.std.push(studentId);
    }

    backup = JSON.parse(JSON.stringify(courses));

    for (const { studentId, professorName, courseId, duration } of courseDetails) {
        
        let tempInx,tempSize;

        if(courses.findIndex(course => course.name === courseId) != -1){
            tempInx = courses.findIndex(course => course.name === courseId);
            tempSize = courses[tempInx].count;

            if(tempInx == 0){
                courses.splice(0,1);
            }
            else{
                courses.splice(tempInx,tempInx);
                return;
            }
            let assigned = false;

            for (const room of rooms) {
                if (assigned) break;

                if(room.roomSize/2<tempSize){
                    continue;
                }
    
                const slot = await findNextAvailableSlot(duration, room);
    
                if (slot) {
                    const { dayIndex, startTime, endTime } = slot;
                    
                    if(dayIndex == blockedDayIndex){
                        if(blockHour){
                            if((startTime<=blockedStartTime && blockedStartTime + blockedMin <= endHour*60) || (startTime>=blockedStartTime)){
                                schedule.push(`${days[dayIndex]},${minutesToTime(startTime)} - ${minutesToTime(endTime)}, ${courseId} - Room ${room.roomId}`);
                                if(startTime + 60 < blockedStartTime){
                                    room.nextAvailableTime = blockedStartTime+blockedMin;
                                    schedule.push(`${days[dayIndex]},${minutesToTime(blockedStartTime)} - ${minutesToTime(blockedStartTime+blockedMin)}, ${blockedName} - Room ${room.roomId}`);
                                    flagBlocked = false;
                                }
                                else
                                    room.nextAvailableTime = startTime+duration;
                                
                                room.nextAvailableDay = dayIndex;
                                room.blockedTime = Math.max(room.blockedTime, endTime);
                                assigned = true;
                            }
                        }
                        else{
                            schedule.push(`${days[dayIndex]},${minutesToTime(startTime)} - ${minutesToTime(endTime)}, ${courseId} - Room ${room.roomId}`);
                            room.nextAvailableTime = endTime;
                            room.nextAvailableDay = dayIndex;
                            room.blockedTime = Math.max(room.blockedTime, endTime);
                            assigned = true;
                        }
                    }
                    else{
                        schedule.push(`${days[dayIndex]},${minutesToTime(startTime)} - ${minutesToTime(endTime)}, ${courseId} - Room ${room.roomId}`);
                        
                        room.nextAvailableTime = endTime;
                        room.nextAvailableDay = dayIndex;
                        room.blockedTime = Math.max(room.blockedTime, endTime);
                        assigned = true;
                    }
                }
    
            }
    
            if (!assigned) {
                console.log(`No available time slot found for: ${courseId}`);
            }

        }   
    }

    if(blockHour && flagBlocked){
        for (const room of rooms) {
            schedule.push(`${days[blockedDayIndex]},${minutesToTime(blockedStartTime)} - ${minutesToTime(blockedStartTime+blockedMin)}, ${blockedName} - Room ${room.roomId}`);
        }
    }
    
    return schedule;
}

const coursesFilePath = 'Class_List.csv'; // Courses CSV file path
const roomsFilePath = 'Classroom_Capacities.csv'; // Rooms CSV file path
var courses = [];
var backup;


(async () => {
    const initialSchedule = await assignCoursesToRooms(coursesFilePath, roomsFilePath, courses);
    const optimizedSchedule = await hillClimbingScheduler(initialSchedule, backup, 1000);
    optimizedSchedule.sort(
        (a, b) => {
            const nameA = a.split(',')[1].split(' - ')[0] // ignore upper and lowercase
            const nameB = b.split(',')[1].split(' - ')[0] // ignore upper and lowercase
            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
          
            // names must be equal
            return 0;
          }
    )
    .sort(
        (a, b) => {
            const nameA = a.split(',')[2].split(' - ')[1] // ignore upper and lowercase
            const nameB = b.split(',')[2].split(' - ')[1] // ignore upper and lowercase
            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
          
            // names must be equal
            return 0;
          }
    )
    .sort(
        (a, b) => {
            const nameA = a.split(',')[0] // ignore upper and lowercase
            const nameB = b.split(',')[0] // ignore upper and lowercase
            if (days.indexOf(nameA) < days.indexOf(nameB)) {
              return -1;
            }
            if (days.indexOf(nameA) > days.indexOf(nameB)) {
              return 1;
            }
          
            // names must be equal
            return 0;
          }
    )
    .forEach(entry => console.log(entry));
})();

