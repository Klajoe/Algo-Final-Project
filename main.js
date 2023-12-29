const fs = require('fs');
const readline = require('readline');

// Days and hours
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const startHour = 9;  // Start from 9 o'clock
const endHour = 18;  // To 18 o'clock

function timeToMinutes(time) {
    const [hour, part] = time.split(':');
    const baseTime = part.endsWith('AM') ? parseInt(hour) : parseInt(hour) + 12;
    return baseTime * 60;
}

function minutesToTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const newHour = hour > 12 ? hour - 12 : hour;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    return `${newHour}:${minute === 0 ? '00' : minute} ${suffix}`;
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

    return lines.slice(1); // Skip the first line
}

async function assignCoursesToRooms(coursesFilePath, roomsFilePath) {
    const coursesLines = await readFileLines(coursesFilePath);
    const roomsLines = await readFileLines(roomsFilePath);

    const rooms = roomsLines.map(line => ({ roomId: line.split(',')[0], nextAvailableTime: startHour * 60, nextAvailableDay: 0 }));
    const courseDetails = coursesLines.map(line => ({
        studentId: line.split(',')[0],
        courseId: line.split(',')[2],
        duration: parseInt(line.split(',')[3])
    }));

    let schedule = [];
    let studentSchedules = {};

    for (const { studentId, courseId, duration } of courseDetails) {
        const room = rooms.find(r => r.nextAvailableDay < days.length);

        if (!room) {
            console.log('Uygun oda kalmadı!');
            break;
        }

        const endTime = room.nextAvailableTime + duration;
        if (endTime / 60 > endHour) {
            room.nextAvailableTime = startHour * 60;
            room.nextAvailableDay++;
        }

        if (room.nextAvailableDay >= days.length) {
            console.log('Uygun zaman dilimi kalmadı!');
            break;
        }

        //Öğrenci çakışma
        const examTime = `${days[room.nextAvailableDay]} ${minutesToTime(room.nextAvailableTime)}`;
        if (studentSchedules[studentId] && studentSchedules[studentId].includes(examTime)) {
            console.log(`Hata: Öğrenci ${studentId} zaten ${examTime} zamanında bir sınavda.`);
            continue;
        }

        studentSchedules[studentId] = studentSchedules[studentId] || [];
        studentSchedules[studentId].push(examTime);

        schedule.push(`${courseId} ${examTime} in room ${room.roomId}`);
        room.nextAvailableTime += duration;
    }

    return schedule;
}

const coursesFilePath = 'Class_List.csv'; 
const roomsFilePath = 'Classroom_Capacities.csv'; 

assignCoursesToRooms(coursesFilePath, roomsFilePath).then(schedule => {
    schedule.forEach(entry => console.log(entry));
});

