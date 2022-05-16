/**
 * @file used for testing and dev
 * @author Hunter Madsen
 * last modified: 5/16/2022
 */

const df = require('../src/database_functions')
const uuid = require('uuid')
const { exec } = require("child_process");

df.clearAndRebuildDatabase().catch((e)=> {
    console.log(e)
})

//exec("mkdir testoftest")
//console.log(saved)

// let saved = exec("taskkill /im node.exe /F", (error, stdout, stderr) => {
//     if (error) {
//         console.log(`error: ${error.message}`);
//         return;
//     }
//     if (stderr) {
//         console.log(`stderr: ${stderr}`);
//         return;
//     }
//     console.log(`stdout: ${stdout}`);
// });

//console.log(uuid.v4())

// df.addRmpClassToDatabase(null).catch((e)=> {
//     console.log(e)
// })
