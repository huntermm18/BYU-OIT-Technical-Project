const inquirer = require('inquirer');
const ratings = require('@mtucourses/rate-my-professors').default;
const api_calls = require('./api_calls')
const database_functions = require('./database_functions')
const UUID = require("uuid");
const { exec } = require("child_process");


class rmpCourse {
    constructor(className, classTitle, instructor, instructionMode, days, classtime, building, availableSeats, totalEnrolled, waitlisted) {
        this.uuid = UUID.v4()
        this.className = className
        this.classTitle = classTitle
        this.instructor = instructor
        this.instruction_mode = instructionMode
        this.days = days
        this.classtime = classtime
        this.building = building
        this.availableSeats = availableSeats
        this.totalEnrolled = totalEnrolled
        this.waitlisted = waitlisted
        this.avgDifficulty = null
        this.avgRating = null
        this.numRatings = null

        if (this.days === null) {
            this.days = 'N/A'
        }
        if (this.classtime === null) {
            this.classtime = 'N/A'
        }
        if (this.building === null) {
            this.building = 'N/A'
        }

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
    console.clear()
    printWelcome()

    // Get BYU ID and WSO2
    let byuID = await prompt('Enter your BYU-ID (ex. 123456789):')
    if (!byuID) {byuID = '083814923'} // fixme for testing
    let token = await prompt('Enter your WSO2 token:')
    if (!token) {token = 'b995ce8ba755b18724b812af0785c41'} // fixme for testing

    // Test if user is subscribed to the proper APIs
    await api_calls.testAPIs(byuID, token)

    return byuID
}

function printWelcome() {
    console.log('Welcome to the BYU course searcher with Rate-My-Professor data')
}


async function searchCourses() {
    let yearTerm = ''
    let year = await prompt('Enter a year:')
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

    let teachingArea = await prompt('Enter a teaching area (ex. C S, HIST, etc.) Don\'t forget a space if it is needed:')
    teachingArea = teachingArea.toUpperCase() // set the user input to upper case
    if (teachingArea === 'CS') {teachingArea = 'C S'} // in case the space was forgotten in C S
    else if (teachingArea === '') {teachingArea = 'C S'} // todo for testing. note: a blank will cause an error
    let courseNumber = await prompt('Enter a course number (ex. 252, 101, etc.):')
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

    for (let i = 0; i < classes.length; i++) {
        try{
            let c = classes[i]
            let rmpClass = new rmpCourse(c.className, c.classTitle, c.instructor, c.instruction_mode,
                c.days, c.classtime, c.building, c.availableSeats, c.totalEnrolled, c.waitlisted)

            // take the first two words (omitting the middle name if there is one). This format is better for the search
            const instructorSearchName = c.instructor.split(' ').slice(0,2).join(' ')
            const teachers = await ratings.searchTeacher(instructorSearchName, byuRMPID);
            if (teachers[0]) {
                const teacher = await ratings.getTeacher(teachers[0].id);
                rmpClass.avgDifficulty = teacher.avgDifficulty
                rmpClass.avgRating = teacher.avgRating
                rmpClass.numRatings = teacher.numRatings
            }
            rmpClasses.push(rmpClass)
        } catch (e) {
            if (e.message.includes('EADDRINUSE')) {
                console.log('EADDRINUSE error caught. Running command \'taskkill /im node.exe /F\' to attempt to work around.')
                exec("taskkill /im node.exe /F") // command to hopefully fix the EADDRINUSE error
                return addRMPDataToClasses(classes) // attempt to restart the function
            }
        }
    }
    return rmpClasses
}


async function saveClasses(rmpClasses, userBYUID) {
    const promptMessage = 'Enter the index of a class you would like to save or leave blank to return to the menu'
    let index = await prompt(promptMessage)
    while (index === 0 || index) {
        index = parseInt(index)
        if (!(index >= 0 && index < rmpClasses.length)) {
            console.log('Not a valid index')
            index = await prompt(promptMessage)
            continue
        }
        await database_functions.addRmpClassToDatabase(rmpClasses[index], userBYUID)
        index = await prompt(promptMessage)
    }
}


async function viewSavedCourses(userBYUID) {
    const savedClasses = await database_functions.getSavedRmpClasses(userBYUID)
    console.table(savedClasses.rows, ['CLASS_NAME', 'CLASS_TITLE', 'INSTRUCTOR', 'INSTRUCTION_MODE',
        'DAYS', 'CLASSTIME', 'BUILDING', 'AVAILABLE_SEATS', 'TOTAL_ENROLLED', 'WAITLIST', 'AVG_DIFFICULTY',
        'AVG_RATING', 'NUM_RATINGS'])
    return savedClasses.rows

}


async function removeSavedCourses(userBYUID, savedClasses) {
    const promptMessage = 'Enter the index of a class you would like to remove or leave blank to return to the menu'
    let index = await prompt(promptMessage)
    while (index === 0 || index) {
        index = parseInt(index)
        if (!(index >= 0 && index < savedClasses.length)) {
            console.log('Not a valid index')
            index = await prompt(promptMessage)
            continue
        }
        const removed = await database_functions.removeRmpClassFromDatabase(savedClasses[index].SAVED_ID)
        if (removed) {
            console.clear()
            console.log(`Removed class '${savedClasses[index].CLASS_TITLE}' from the database`)

            // print the new table and start the function over again
            const newSavedClasses = await viewSavedCourses(userBYUID)
            return removeSavedCourses(userBYUID, newSavedClasses)
        }
        else {
            console.log(`error removing class from database`)
        }
        index = await prompt(promptMessage)
    }
}


module.exports = {login, searchCourses, viewSavedCourses, addRMPDataToClasses, saveClasses, removeSavedCourses}