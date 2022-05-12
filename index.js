const inquirer = require("inquirer");
const pf = require('./src/program_functions')

main().catch((e) => {
    console.log(e)
})

async function main() {
    const userBYUID = await pf.login()
    let choice = await promptMenu()

    while (choice !== 3) {
        if (choice === 1) {
            let classes = await pf.searchCourses()
            let rmpClasses = await pf.addRMPDataToClasses(classes)
            console.table(rmpClasses)
            await pf.saveClasses(rmpClasses, userBYUID)
        }
        else if (choice === 2) {
            const savedClasses = await pf.viewSavedCourses(userBYUID)
            await pf.removeSavedCourses(userBYUID, savedClasses)
        }
        choice = await promptMenu()
    }

    console.log('End of program reached') // fixme for testing
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
            console.log('Thanks for using')
            process.exit()
    }
}