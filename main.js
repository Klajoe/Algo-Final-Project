const fs = require('fs');
const readline = require('readline');
const prompt = require('prompt-sync')({ sigint: true });

// Günler ve saatler için sabitler
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const startHour = 9; // Sabah 9:00 başlangıç saati (09:00 olarak 24 saatlik formatta)
const endHour = 18; // Akşam 6:00 bitiş saati (18:00 olarak 24 saatlik formatta)

function timeToMinutes(time) {
    const [hour, part] = time.split(':');
    const baseTime = part.endsWith('AM') ? parseInt(hour) : parseInt(hour) + 12;
    return baseTime * 60;
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

    return lines.slice(1); // İlk satırı (başlık satırını) atla
}

async function assignCoursesToRooms(coursesFilePath, roomsFilePath) {
    const coursesLines = await readFileLines(coursesFilePath);
    const roomsLines = await readFileLines(roomsFilePath);

    const rooms = roomsLines.map(line => ({ roomId: line.split(',')[0], nextAvailableTime: startHour * 60, nextAvailableDay: 0 }));
    const courseDetails = coursesLines.map(line => ({
        courseId: line.split(',')[2],
        duration: parseInt(line.split(',')[3])
    }));

    let schedule = [];

    // Kullanıcıdan blocked hour bilgisi al
    const hasBlockedHour = prompt('Blocked hour var mı? (y/n): ').toLowerCase() === 'y';
    let blockedCourseId;
    if (hasBlockedHour) {
        blockedCourseId = prompt('Hangi dersi bloke etmek istiyorsunuz? (Örnek: CENG201): ');
    }

    // Blocked hour varsa, Pazartesi ilk sıraya yerleştir
    if (blockedCourseId) {
        const blockedCourse = courseDetails.find(course => course.courseId === blockedCourseId);
        if (blockedCourse) {
            const startTime = startHour * 60; // 09:00
            const endTime = startTime + blockedCourse.duration;
            schedule.push(`${blockedCourse.courseId} Monday ${minutesToTime(startTime)} - ${minutesToTime(endTime)} in room ${rooms[0].roomId}`);
            rooms[0].nextAvailableTime = endTime;
            courseDetails.splice(courseDetails.indexOf(blockedCourse), 1);
        } else {
            console.log('Belirtilen ders bulunamadı.');
        }
    }

    for (const { courseId, duration } of courseDetails) {
        let assigned = false;
        for (const room of rooms) {
            if (assigned) break;

            while (room.nextAvailableDay < days.length) {
                const endTime = room.nextAvailableTime + duration;
                if (endTime / 60 <= endHour) {
                    schedule.push(`${courseId} ${days[room.nextAvailableDay]} ${minutesToTime(room.nextAvailableTime)} - ${minutesToTime(endTime)} in room ${room.roomId}`);
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

const coursesFilePath = 'Class_List.csv'; // Dersler CSV dosya yolu
const roomsFilePath = 'Classroom_Capacities.csv'; // Sınıf odaları CSV dosya yolu

assignCoursesToRooms(coursesFilePath, roomsFilePath).then(schedule => {
    schedule.forEach(entry => console.log(entry));
});
