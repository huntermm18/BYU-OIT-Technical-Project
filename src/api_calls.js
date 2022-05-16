const axios = require('axios')

const personOptions = {
    url: '',
    method: 'GET',
    headers: {
        Authorization: '', // gets set in testAPIs when user logs in
    }
}

const classScheduleOptions = {
    url: '',
    method: 'GET',
    headers: {
        Authorization: '', // gets set in testAPIsw hen user logs in
    }
}

/**
 * Tests if the user is subscribed to the APIs
 * @param byuID BYU-ID of user
 * @param token WSO2 token
 * @return userFirstName
 */
async function testAPIs(byuID, token) {
    console.log('Testing API connections...')
    let userFirstName = ''

    // Tests Persons API
    personOptions.url = `https://api.byu.edu:443/byuapi/persons/v3/${byuID}`
    personOptions.headers.Authorization = `Bearer ${token}`
    try {
        const response = await axios(personOptions)
        userFirstName = response.data.basic.preferred_first_name.value
    } catch (e) {
        console.log('Please make sure you are subscribed to both' +
            ' the AcademicClassScheduleClassSchedule - v1 API and the Persons - v3 API and try again')
        process.exit();
    }

    // Tests AcademicClassScheduleClassSchedule API
    classScheduleOptions.url = 'https://api.byu.edu:443/domains/legacy/academic/classschedule/classschedule/v1/20225/C%20S/ALL'
    classScheduleOptions.headers.Authorization = `Bearer ${token}`
    try {
        await axios(classScheduleOptions)
    } catch (e) {
        console.log('Please make sure you are subscribed to both' +
            ' the AcademicClassScheduleClassSchedule - v1 API and the Persons - v3 API and try again')
        process.exit();
    }

    return userFirstName
}


/**
 * Calls the AcademicClassScheduleClassSchedule API to get the classes which correspond to the course number provided
 * @param yearTerm
 * @param teachingArea
 * @param courseNumber
 * @returns A list of relevant classes
 */
async function getClasses(yearTerm, teachingArea, courseNumber) {
    classScheduleOptions.url = `https://api.byu.edu:443/domains/legacy/academic/classschedule/classschedule/v1/${yearTerm}/${teachingArea}/ALL`
    let response = await axios(classScheduleOptions)

    // return list of courses
    const allClasses = response.data.CourseSchedProofService.response.Course_List
    let classes = []
    for (let i = 0; i < allClasses.length; ++i) {
        if (allClasses[i].className && allClasses[i].className.includes(String(courseNumber))) {
            classes.push(allClasses[i])
        }
    }
    return classes
}


module.exports = {testAPIs, getClasses}