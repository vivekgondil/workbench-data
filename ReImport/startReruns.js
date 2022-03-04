require(`dotenv`).config();
const axios = require(`axios`);
const fs = require('fs');

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

let snapshots = [
    {
        url: "https://workbench.import.io/orgs/ascential/projects/digital_shelf_beta/collections/search/sources/lidl_es/snapshots/138d27f5-cbfa-4c90-ad12-c954d1844aaf/home",
        orgSlug: "ascential",
        snapshotId: "138d27f5-cbfa-4c90-ad12-c954d1844aaf",
    }
]
let errorSnapshots = [];

(async () => {
    await snapshots.forEach(async snapshot => {
        try {
            let a = await authAxios.post(`/api/orgs/${snapshot.orgSlug}/snapshots/${snapshot.snapshotId}/_retry`, {
                "options": {
                    "skipQaTests": false,
                    "rerunQueries": true
                },
                "mustFinishBy": null,
            });
            console.log(a);
        } catch (error) {
            console.log("Can not rerun: " + snapshot.orgSlug + ":" + snapshot.snapshotId + " Error: " + error);
            errorSnapshots.push(snapshot);
            let data = JSON.stringify(errorSnapshots, null, 2);
            fs.writeFile('missedFeed.json', data, (err) => {
                if (err) throw err;
                console.log('Data written to file');
            });
        }
    });
})();