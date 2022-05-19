const fs = require('fs');
require(`dotenv`).config();
const { workbench, store } = require('../authAxios.js')

const sources = require('./sources.js')
let errorsources = [];

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

const getInputs = async (source) => {
    //item contents list of latest snapshot info
    if (!source.snapshot) {
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
    } else {
        const inputs = await workbench.get(`/api/orgs/${source.org}/snapshots/${source.snapshot}/assets/inputs.json`);
        return inputs.data
    }


}

(async () => {
    let stringData = JSON.stringify({ errorsources }, null, 2);
    fs.writeFile('./RerunLastSnapshot/missedFeed.json', stringData, (err) => {
        if (err) throw err;
        console.log('Blank written to file');
    });
    await sources.forEach(async (source, i) => {
        try {

            source.org = source.url.match(/(\/orgs\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            source.project = source.url.match(/(\/projects\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            source.collection = source.url.match(/(\/collections\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            source.slug = source.url.match(/(\/sources\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            try {
                source.snapshot = source.url.match(/(\/snapshots\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
            } catch (error) {

            }


            if (!source.id) source.id = await getSourceIdFromURL(source);
            if (!source.inputs) source.inputs = await getInputs(source)
            if (!source.extractor) {
                const extractor = await workbench.get(`/api/orgs/${source.org}/sources/${source.id}/extractor`);
                source.extractor = extractor.data.guid
            }

            //put Inputs to extractor
            await store.put(`/store/extractor/${source.extractor}/_attachment/inputs`, source.inputs);

            //start the run 
            await workbench.post(`/api/orgs/${source.org}/sources/${source.id}/_start`);
            console.log(`Started the API rerun for source: ${source.org}/${source.project}/${source.collection}/${source.slug}`);

        } catch (error) {
            let message = typeof error.response !== "undefined" ? error.response.data.message : error.message;
            source.error = message;
            console.log(message, "=>", source.org, "/", source.project, "/", source.collection, "/", source.slug);
            errorsources.push(source);
            if ((i + 1) === sources.length) {
                stringData = JSON.stringify(errorsources, null, 2);
                fs.writeFile('./RerunLastSnapshot/missedFeed.json', stringData, (err) => {
                    if (err) throw err;
                    console.log('Data written to file');
                });
            }
        }
    });
})();