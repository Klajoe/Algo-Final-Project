const fs = require('fs');
const readline = require('readline');
const prompt = require('prompt-sync')({ sigint: true });

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const startHour = 9; // 9:00 AM
const endHour = 18; // 6:00 PM

function timeToMinutes(time) {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
}

function minutesToTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour < 10 ? '0' + hour : hour}:${minute === 0 ? '00' : minute}`;
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

async function assignCoursesToRooms(coursesFilePath, roomsFilePath) {
    const coursesLines = await readFileLines(coursesFilePath);
    const roomsLines = await readFileLines(roomsFilePath);

    const rooms = roomsLines.map(line => ({ roomId: line.split(',')[0], nextAvailableTime: startHour * 60, nextAvailableDay: 0 }));
    const courseDetails = coursesLines.map(line => ({
        studentId: line.split(',')[0],
        professorName: line.split(',')[1],
        courseId: line.split(',')[2],
        duration: parseInt(line.split(',')[3])
    }));

    let schedule = [];

    for (const { studentId, professorName, courseId, duration } of courseDetails) {
        let assigned = false;

        for (const room of rooms) {
            if (assigned) break;

            while (room.nextAvailableDay < days.length) {
                const endTime = room.nextAvailableTime + duration;

                if (endTime / 60 <= endHour) {
                    schedule.push(`${days[room.nextAvailableDay]},${minutesToTime(room.nextAvailableTime)} - ${minutesToTime(endTime)}: ${courseId} - Room ${room.roomId}`);
                    room.nextAvailableTime = endTime;
                    assigned = true;
                    break;
                } else {
                    room.nextAvailableDay++;
                    room.nextAvailableTime = startHour * 60;
                }
            }
        }

        if (!assigned) {
            console.log(`Uygun zaman dilimi bulunamadı: ${courseId}`);
        }
    }

    return schedule;
}

const coursesFilePath = 'Class_List.csv'; // Courses CSV file path
const roomsFilePath = 'Classroom_Capacities.csv'; // Rooms CSV file path

assignCoursesToRooms(coursesFilePath, roomsFilePath).then(schedule => {
    schedule.forEach(entry => console.log(entry));
});
