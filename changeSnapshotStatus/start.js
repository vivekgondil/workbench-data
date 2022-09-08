const fs = require('fs');
const { workbench, store } = require('../authAxios.js')
const sources = require('./sources.js')
let errorsources = [];


const mainFunction = async () => {
    console.log("Starting the script... \n Please wait while the run gets finished. \n Thanks");
    // Clearing the error file.
    let stringData = JSON.stringify({ errorsources }, null, 2);
    fs.writeFile('./changeSnapshotStatus/missedFeed.json', stringData, (err) => {
        if (err) throw err;
    });
    await sources.forEach(async (source, i) => {
        try {
            await source.getSlugsFormUrl(source);

            await workbench.put(`/api/orgs/${source.org}/snapshots/${source.snapshotId}/status/PUSHED_IGNORE`);

            console.log(`Changed the status for source: ${source.org}/${source.project}/${source.collection}/${source.slug}`);

        } catch (error) {
            let message = typeof error.response !== "undefined" ? error.response.data.message : error.message;
            source.error = message;
            console.log(message, "=>", source.org, "/", source.project, "/", source.collection, "/", source.slug);
            errorsources.push(source);
        }
    });
}

const writeErrorFile = async () => {
    stringData = JSON.stringify(errorsources, null, 2);
    fs.writeFile('./changeSnapshotStatus/missedFeed.json', stringData, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });
}


(async () => {
    await mainFunction();
    await writeErrorFile();
})();