const fs = require('fs');
require(`dotenv`).config();
const { workbench, store } = require('../authAxios.js')

const sources = require('./sources.js')
let errorsources = [];


const getInputs = async (source) => {
    //item contents list of latest snapshot info
    if (source.snapshotId) {
        const inputs = await workbench.get(`/api/orgs/${source.org}/snapshots/${source.snapshotId}/assets/inputs.json`);
        return inputs.data
    } else {
        const lastSnapshots = await workbench.get(`/api/orgs/${source.org}/sources/${source.id}/snapshots?limit=50&sort=addedAt&sortDirection=DESC&cursor=&include=Source.Collection.Project%2CimportStatus%2Ceditor%2CassignedUser%2Cparent&filter=parentId%7C%7Cnull`);
        try {
            try {
                const inputs = await workbench.get(`/api/orgs/${source.org}/snapshots/${lastSnapshots.data.items[0].id}/assets/inputs.json`);
                return inputs.data
            } catch (error) {
                const inputs = await workbench.get(`/api/orgs/${source.org}/snapshots/${lastSnapshots.data.items[1].id}/assets/inputs.json`);
                return inputs.data
            }
        } catch (error) {
            const inputs = await workbench.get(`/api/orgs/${source.org}/snapshots/${lastSnapshots.data.items[2].id}/assets/inputs.json`);
            return inputs.data
        }
    }

}

const getSourceIdFromURL = async (source) => {
    try {
        const orgId = await workbench(`/api/orgs/${source.org}`)
        const projectId = await workbench(`/api/orgs/${orgId.data.id}/projects/${source.project}`)
        const collectionId = await workbench(`/api/orgs/${source.org}/projects/${projectId.data.id}/collections/${source.collection}`)
        const sourceId = await workbench(`/api/orgs/${source.org}/collections/${collectionId.data.id}/sources/${source.slug}`)
        return sourceId.data.id;
    } catch (error) {
        console.log("Error for url: ", source.url);
    }
};


(async () => {
    let stringData = JSON.stringify({ errorsources }, null, 2);
    fs.writeFile('./GetInputs/missedFeed.json', stringData, (err) => {
        if (err) throw err;
        console.log('Blank written to file');
    });
    await sources.forEach(async (source, i) => {
        try {

            source.org = source.url.match(/(\/orgs\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            source.project = source.url.match(/(\/projects\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            source.collection = source.url.match(/(\/collections\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            source.slug = source.url.match(/(\/sources\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            source.snapshotId = source.url.match(/(\/snapshots\/)([^/]+)/g)[0].match(/[^/]+/g)[1]

            if (!source.id) source.id = await getSourceIdFromURL(source);
            const inputs = await getInputs(source)


            //put Inputs to extractor
            // await store.put(`/store/extractor/${source.extractor}/_attachment/inputs`, inputs);

            //start the run 
            // await workbench.post(`/api/orgs/${source.org}/sources/${source.id}/_start`);
            // console.log(`Started the API rerun for source: ${source.slug}`);

            //get params
            ///api/orgs/ascential/sources/cd6698a9-a95e-4822-abf7-3914d6585a0a?include=editor%2CassignedUser%2Cextractor%2CextractorVersion
            const extractor = await workbench.get(`/api/orgs/${source.org}/sources/${source.id}`);
            source.extractor = extractor.data.guid

            // console.log(extractor.data.parameters);
            source.input_name = extractor.data.parameters.input_name;
            source.country = extractor.data.parameters.country;


            const dir = `./GetInputs/sources/${source.country}`;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, {
                    recursive: true

                });
                console.log("created folder")
            }
            // stringData = JSON.stringify(inputs, null, 2);
            fs.writeFile(`./GetInputs/sources/${source.country}/${source.country}.${source.input_name}.json`, inputs, (err) => {
                if (err) throw err;
                // console.log('Data written to file');
            });




        } catch (error) {
            let message = typeof error.response !== "undefined" ? error.response.data.message : error.message;
            source.error = message;
            console.log(message, "=>", source.slug);
            errorsources.push(source);
            if ((i + 1) === sources.length) {
                stringData = JSON.stringify(errorsources, null, 2);
                fs.writeFile('./GetInputs/missedFeed.json', stringData, (err) => {
                    if (err) throw err;
                    console.log('Data written to file');
                });
            }
        }
    });
})();