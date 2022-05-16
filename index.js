const inquirer = require("inquirer");
const pf = require('./src/program_functions')
const df = require('./src/database_functions')


main().catch((e) => {
    console.log(e)
})

async function main() {
    // Test AWS connection and use to set Oracle credentials
    await df.getOracleCredentials(0)

    // Tests to make sure connected to database
    await df.testOracleConnectivity()

    // Login and save user's BYU-ID
    const userBYUID = await pf.login()

    // Open menu and loop until user exits
    let choice = await promptMenu()
    while (choice !== 3) {
        if (choice === 1) {
            // Search courses option
            let classes = await pf.searchCourses()
            let rmpClasses = await pf.addRMPDataToClasses(classes)
            console.clear()
            console.table(rmpClasses, ['className', 'classTitle', 'instructor', 'avgRating', 'avgDifficulty',
                'instruction_mode', 'days', 'classtime', 'building', 'availableSeats',
                'totalEnrolled', 'waitlisted', 'numRatings'])
            await pf.saveClasses(rmpClasses, userBYUID)
        }
        else if (choice === 2) {
            // View saved courses option
            const savedClasses = await pf.viewSavedCourses(userBYUID)
            await pf.removeSavedCourses(userBYUID, savedClasses)
        }
        console.clear()
        choice = await promptMenu()
    }
}


async function promptMenu() {
    const answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 3,
        message: 'What would you like to do?',
        choices: ['1) Search Courses', '2) View Saved Courses', '3) Exit Program']
    }])

    switch (answer.response) {
        case '1) Search Courses':
            return 1
        case '2) View Saved Courses':
            return 2
        case '3) Exit Program':
            console.clear()
            console.log('Thanks for using')
            process.exit()
    }
}
