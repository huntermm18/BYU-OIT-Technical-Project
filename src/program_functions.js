const inquirer = require('inquirer');
const ratings = require('@mtucourses/rate-my-professors').default;
const api_calls = require('./api_calls')
const database_functions = require('./database_functions')


class rmpCourse {
    constructor(classTitle, instructor, instructionMode, days, classtime, building, availableSeats, totalEnrolled, waitList) {
        this.classTitle = classTitle
        this.instructor = instructor
        this.instruction_mode = instructionMode
        this.days = days
        this.classtime = classtime
        this.building = building
        this.availableSeats = availableSeats
        this.totalEnrolled = totalEnrolled
        this.waitList = waitList
        this.avgDifficulty = null
        this.avgRating = null
        this.numRatings = null
    }
}


async function prompt(message) {
    // Prompts the user with 'message' and returns their response
    const answer = await inquirer.prompt([{
        name: 'userInput',
        type: 'input',
        message: message,
    }])
    return answer.userInput
}

async function login() {
    // Get BYU ID and WSO2
    let byuID = await prompt('Enter your BYU-ID (ex. 123456789)')
    if (!byuID) { // fixme for testing
        byuID = '083814923'
        console.log('using test byuID')
    }
    let token = await prompt('Enter your WSO2 token')
    if (!token) { // fixme for testing
        token = 'b995ce8ba755b18724b812af0785c41'
        console.log('using test wso2 token')
    }
    const passedTests = await api_calls.testAPIs(byuID, token)
    if (!passedTests) {
        // API testing failed
        console.log('Please make sure you are subscribed to both' +
            ' the AcademicClassScheduleClassSchedule - v1 API and the Persons - v3 API and try again')
        process.exit();
    }
    return byuID
}

async function searchCourses() {
    let yearTerm = ''
    let year = await prompt('Enter a year')
    if (year === '') {year = 2022} // todo for testing. Blank will throw an error
    const answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 4,
        message: 'Select a semester',
        choices: ['Winter', 'Spring', 'Summer', 'Fall']
    }])
    // Use responses to set the yearTerm variable needed for the api call
    switch (answer.response) {
        case 'Winter':
            yearTerm = year + '1'
            break
        case 'Spring':
            yearTerm = year + '3'
            break
        case 'Summer':
            yearTerm = year + '4'
            break
        case 'Fall':
            yearTerm = year + '5'
            break
    }
    console.log('yearTerm = ' + yearTerm) // todo remove me

    let teachingArea = await prompt('Enter a teaching area (ex. C S, HIST, etc.) Don\'t forget a space if it is needed')
    teachingArea = teachingArea.toUpperCase() // set the user input to upper case
    if (teachingArea === 'CS') {teachingArea = 'C S'} // in case the space was forgotten in C S
    else if (teachingArea === '') {teachingArea = 'C S'} // todo for testing. note: a blank will cause an error
    let courseNumber = await prompt('Enter a course number (ex. 252, 101, etc.)')
    if (courseNumber === '') {courseNumber = '235'} // todo for testing. Blank will cause an error

    let classes = await api_calls.getClasses(yearTerm, teachingArea, courseNumber)
    if (!classes.length) {
        console.log('No classes found. Check to make sure you entered a valid teaching area and course number')
        return searchCourses()
    }

    return classes // return all classes found from the search
}

async function addRMPDataToClasses(classes) {
    const byuRMPID = 'U2Nob29sLTEzNQ=='// Rate My Professor  university ID for BYU (As of 5/11/2022)
    let rmpClasses = []
    let rmpClass

    for (let i = 0; i < classes.length; i++) {
        let c = classes[i]
        rmpClass = new rmpCourse(c.classTitle, c.instructor, c.instruction_mode, c.days, c.classtime, c.building, c.availableSeats, c.totalEnrolled, c.waitList)
        const teachers = await ratings.searchTeacher(c.instructor, byuRMPID);
        if (teachers[0]) {
            const teacher = await ratings.getTeacher(teachers[0].id);
            rmpClass.avgDifficulty = teacher.avgDifficulty
            rmpClass.avgRating = teacher.avgRating
            rmpClass.numRatings = teacher.numRatings
        }
        rmpClasses.push(rmpClass)
    }

    return rmpClasses
}

async function saveClasses(rmpClasses, userBYUID) {
    const promptMessage = 'Enter the index of a class you would like to save or leave blank to continue'
    let index = await prompt(promptMessage)
    while (index === 0 || index) {
        index = parseInt(index)
        if (!(index >= 0 && index < rmpClasses.length)) {
            console.log('Not a valid index')
            index = await prompt(promptMessage)
            continue
        }
        const added = await database_functions.addRmpClassToDatabase(rmpClasses[index], userBYUID)
        if (added) {
            console.log(`Added class at index ${index} to the database`)
        }
        else {
            console.log(`error adding class to database`)
        }
        index = await prompt(promptMessage)
    }
}

async function viewSavedCourses(userBYUID) {
    let savedClasses = await database_functions.getSavedRmpClasses(userBYUID)
    console.table(savedClasses.rows)

    let savedClassesFormatted = []
    for (let i = 0; i < savedClasses.rows.length; i++) {
        let c = savedClasses.rows[i]
        const rmpClass = new rmpCourse(c.classTitle, c.instructor, c.instruction_mode, c.days, c.classtime, c.building, c.availableSeats, c.totalEnrolled, c.waitList)
        rmpClass.avgDifficulty = c.avgDifficulty
        rmpClass.avgRating = c.avgRating
        rmpClass.numRatings = c.numRatings
        savedClassesFormatted.push(rmpClass)
    }
    console.table(savedClassesFormatted)
}




module.exports = {login, searchCourses, viewSavedCourses, addRMPDataToClasses, saveClasses}