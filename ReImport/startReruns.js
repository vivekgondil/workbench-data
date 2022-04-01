require(`dotenv`).config();
const axios = require(`axios`);
const fs = require('fs');
const snapshots = require('./snapshots.js')

const authAxios = axios.create({
    baseURL: "https://workbench.import.io",
    headers: {
        Accept: "*/*",
        Host: "workbench.import.io",
        Authorization: `UserToken ${process.env.USERTOKEN}`,
    },
    params: {
        _apikey: process.env.APIKEY,
    },
});

let errorSnapshots = [];

(async () => {
    await snapshots.forEach(async (snapshot) => {
        try {

            let a = await authAxios.post(`/api/orgs/${snapshot.match(/(\/orgs\/)([^/]+)/g)[0].match(/[^/]+/g)[1]}/snapshots/${snapshot.match(/snapshots\/([^/]+)/g)[0].match(/[^/]+/g)[1]}/_retry`, {
                "options": {
                    "skipQaTests": false,
                    "rerunQueries": true,
                },
                "mustFinishBy": null,
            });
            console.log(a);
        } catch (error) {
            console.log("Can not rerun: " + snapshot.match(/(\/sources\/)([^/]+)/g)[0].match(/[^/]+/g)[1] + " Error: " + error);
            errorSnapshots.push(snapshot);
            let data = JSON.stringify({ errorSnapshots }, null, 2);
            fs.writeFile('./ReImport/missedFeed.json', data, (err) => {
                if (err) throw err;
                console.log('Data written to file');
            });
        }
    });
})();


