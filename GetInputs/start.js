const fs = require('fs');

const sources = require('./sources.js')
let errorsources = [];


const mainFunction = async () => {
    console.log("Starting the script... \n Please wait while the run gets finished. \n Thanks");
    // Clearing the error file.
    let stringData = JSON.stringify({ errorsources }, null, 2);
    fs.writeFile('./GetInputs/missedFeed.json', stringData, (err) => {
        if (err) throw err;
    });
    await sources.forEach(async (source, i) => {
        try {
            await source.getSlugsFormUrl(source);
            await source.getSourceIdFromURL(source);
            await source.getParmas(source);
            const inputs = await source.getInputs(source)

            const dir = `./GetInputs/sources/${source.country}`;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, {
                    recursive: true
                });
            }

            fs.writeFile(`./GetInputs/sources/${source.country}/${source.parameters.country}.${source.parameters.input_name}.json`, inputs, (err) => {
                if (err) throw err;
            });

            if ((i + 1) === sources.length) {
                console.log(`Run finished with error for ${errorsources.length} sources. Files `);
            }

        } catch (error) {
            let message = typeof error.response !== "undefined" ? error.response.data.message : error.message;
            source.error = message;
            console.log(message, "=>", source.slug);
            errorsources.push(source);
            if ((i + 1) === sources.length) {
                stringData = JSON.stringify(errorsources, null, 2);
                fs.writeFile('./GetInputs/missedFeed.json', stringData, (err) => {
                    if (err) throw err;
                    console.log(`Got Error for ${errorsources.length} sources. Please check GetInputs/missedFeed.json`);
                });
            }
        }
    });
}

mainFunction();