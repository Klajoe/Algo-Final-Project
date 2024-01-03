const fs = require('fs').promises
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
  
function askQuestion(query) { 
    return new Promise(resolve => rl.question(query, ans => resolve(ans)))
}

async function askCommonCourses() {
    let numberOfCourses = parseInt(await askQuestion("How many common courses would you like to add (ex. '4')? "))
    for (let i = 0; i < numberOfCourses; i++) {
        let courseName = await askQuestion("Enter the name of the common course (ex. 'CENG303'): ")
        let startTimeString = await askQuestion("Enter starting time of the common course (ex. '15:00'): ")
        let minuteAndSecond = startTimeString.split(':')
        let courseStartTime = new Time(parseInt(minuteAndSecond[0]), parseInt(minuteAndSecond[1]))
        let endTimeString = await askQuestion("Enter ending time of the common course (ex. '16:00'): ")
        minuteAndSecond = endTimeString.split(':')
        let courseEndTime = new Time(parseInt(minuteAndSecond[0]), parseInt(minuteAndSecond[1]))
        let day = await askQuestion("Enter the day of the common course (ex. 'Tuesday'): ")
      
        commonCourseExams.push(new Exam(courseName, undefined, courseStartTime, courseEndTime, day))
        console.log(`${i + 1}. common course has added.`);
        console.log(`Name - ${courseName}, Start Time - ${courseStartTime}, End Time - ${courseEndTime}, Day - ${day}\n`)
    }
    rl.close()
} 

var daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
var classList = [] // array of CSV data {StudentID,ProfessorName,CourseID,ExamDuration}
var classrooms = [] // array of CSV data {RoomID,Capacity}
var exams = [] // array of {ProfessorName,CourseID,ExamDuration}
var commonCourseExams = [] // array of common courses, Exam objects

async function CSVtoArray(fileName) {
    let list = []
    const data = await fs.readFile(fileName, 'utf8')
    let lines = data.trim().split('\n')

    const headers = lines[0].split(',')
    for (let i = 1; i < lines.length; i++) {
        let values = lines[i].split(',')
        let item = {}

        for (let j = 0; j < headers.length; j++) {
            item[headers[j].trim()] = values[j].trim()
        }
        list.push(item)
    }
    return list
}

async function createExams() {
    let uniqueExams = new Set()

    classList.forEach(function(item) {
        let examString = item.ProfessorName + item.CourseID + item.ExamDuration
        if (!uniqueExams.has(examString)) {
            uniqueExams.add(examString)
            exams.push(new Exam(item.CourseID, item.ExamDuration))
        }
    })
}

async function createClassrooms(classroomList) {
    list = []
    for (let i in classroomList) {
        list.push(new Classroom(classroomList[i]['RoomID'], classroomList[i]['Capacity']))
    }
    return list
}

const main = async function () {
    classList = await CSVtoArray('Class_List.csv')
    classrooms = await createClassrooms(await CSVtoArray('Classroom_Capacities.csv'))
    await askCommonCourses()
    await createExams()
    const schedule = new Schedule(classrooms)
    console.log(schedule.days[0])
}

main()

// CLASSES

class Time {
    constructor(hour, minute) {
        this.hour = hour
        this.minute = minute
    }
  
    toString() {
        return `${this.formatTime(this.hour)}:${this.formatTime(this.minute)}`
    }
  
    formatTime(value) {
        return value < 10 ? `0${value}` : `${value}`
    }
}
  
class Exam {
    constructor(CourseID, ExamDuration, startTime = undefined, endTime = undefined, day = undefined, commonCourse = false) {
        this.CourseID = CourseID
        this.ExamDuration = ExamDuration
        this.startTime = startTime
        this.endTime = endTime
        this.RoomID = undefined
        this.day = undefined
        this.commonCourse = commonCourse

        if (this.startTime != undefined && this.endTime == undefined) {
            let hour = Math.floor(ExamDuration / 60) + this.startTime.hour
            let minute = ExamDuration % 60 + this.startTime.minute
            if (minute >= 60) {
                hour++
                minute -= 60
            }
            this.endTime = new Time(hour, minute)
        }
    }
  
    toString() {
        return this.commonCourse
            ? this.startTime.toString() +  " - " + this.endTime.toString() + ": Common Course (" + this.CourseID + ")"
            : this.startTime.toString() +  " - " + this.endTime.toString() + ":" + this.CourseID + " - " + this.RoomID
    }
}

class Classroom {
    constructor(RoomID, Capacity) {
        this.RoomID = RoomID
        this.Capacity = Capacity
        this.Sessions = []
    }
}

class Schedule {
    constructor(classrooms) {
        this.classrooms = classrooms
        this.days = []
        for (let i = 0; i < 6; i++) {
            let item = []
            item[daysOfWeek[i]] = classrooms
            this.days.push(item)
        }
        this.initializeSchedule()
    }

    addExtraDay() {
        let item = {}
        let numberOfDays = this.days.length

        if (numberOfDays > 6) {
            item[daysOfWeek[numberOfDays % 7]] = this.classrooms  
        } else {
            item[daysOfWeek[6]] = this.classrooms
        }
        this.days.push(item)
    }

    findAvailableTime(day, exam) {
        // for (let exam in this.days[day].classrooms.Sessions) {}
    }

    initializeSchedule() {

    }

    // findAvailableSlot
    // swapSessions(exam1, exam2)
    // cost()
    // simulatedAnnealing() ?
    // ...
}


