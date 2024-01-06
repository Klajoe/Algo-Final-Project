const fs = require('fs');
const readline = require('readline');
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
    return `${hour}:${minute === 0 ? '00' : minute}`;
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

    while (dayIndex < 5) {
        const endTime = startTime + duration;

        if (startTime >= startHour * 60 && endTime <= endHour*60) {
            return { dayIndex, startTime, endTime };
        }

        dayIndex++;
        startTime = startHour * 60; // Reset start time for the next day
    }

    return null; // If no suitable slot is found
}

async function assignCoursesToRooms(coursesFilePath, roomsFilePath) {
    const coursesLines = await readFileLines(coursesFilePath);
    const roomsLines = await readFileLines(roomsFilePath);

    const rooms = roomsLines.map(line => ({ roomId: line.split(',')[0], nextAvailableTime: startHour * 60, nextAvailableDay: 0, blockedTime: Infinity}));
    const courseDetails = coursesLines.map(line => ({
        studentId: line.split(',')[0],
        professorName: line.split(',')[1],
        courseId: line.split(',')[2],
        duration: parseInt(line.split(',')[3])
    }));

    let schedule = [];

    let blockedDayIndex = -1;
    let blockedStartTime

    // Block a specific hour
    const blockHour = prompt('Do you want to block a specific hour? (y/n): ').toLowerCase() === 'y';
    let blockedDay, blockedTime;
    if (blockHour) {
        blockedDay = prompt('Which day? (Example: Tuesday): ');
        blockedTime = prompt('Which hour? (Example: 10:00): ');

        blockedDayIndex = days.indexOf(blockedDay.charAt(0).toUpperCase() + blockedDay.slice(1).toLowerCase());
        blockedStartTime = timeToMinutes(blockedTime);

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

        let assigned = false;

        for (const room of rooms) {
            if (assigned) break;

            const slot = findNextAvailableSlot(duration, room);

            if (slot) {
                const { dayIndex, startTime, endTime } = slot;
                if(dayIndex == blockedDayIndex){
                    if(blockHour){
                        if((startTime<=blockedStartTime && blockedStartTime + 60 <= endHour*60) || (startTime>=blockedStartTime)){
                            schedule.push(`${days[dayIndex]},${minutesToTime(startTime)} - ${minutesToTime(endTime)}: ${courseId} - Room ${room.roomId}`);
                            if(startTime + 60 < blockedStartTime)
                                room.nextAvailableTime = blockedStartTime+60;
                            else
                                room.nextAvailableTime = startTime+duration;
                            
                            room.nextAvailableDay = dayIndex;
                            room.blockedTime = Math.max(room.blockedTime, endTime);
                            assigned = true;
                        }
                    }
                    else{
                        schedule.push(`${days[dayIndex]},${minutesToTime(startTime)} - ${minutesToTime(endTime)}: ${courseId} - Room ${room.roomId}`);
                        room.nextAvailableTime = endTime;
                        room.nextAvailableDay = dayIndex;
                        room.blockedTime = Math.max(room.blockedTime, endTime);
                        assigned = true;
                    }
                }
                else{
                    schedule.push(`${days[dayIndex]},${minutesToTime(startTime)} - ${minutesToTime(endTime)}: ${courseId} - Room ${room.roomId}`);
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

    return schedule;
}

const coursesFilePath = 'Class_List.csv'; // Courses CSV file path
const roomsFilePath = 'Classroom_Capacities.csv'; // Rooms CSV file path

assignCoursesToRooms(coursesFilePath, roomsFilePath).then(schedule => {
    schedule.forEach(entry => console.log(entry));
});
