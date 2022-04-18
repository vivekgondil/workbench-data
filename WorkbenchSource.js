// require(`dotenv`).config();
const { workbench, store } = require('./authAxios.js')

class WorkbenchSource {

    constructor(url) {
        this.url = url
    }

    getInputs = async (source) => {
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

    getSourceIdFromURL = async (source) => {

        const orgId = await workbench(`/api/orgs/${source.org}`)
        const projectId = await workbench(`/api/orgs/${orgId.data.id}/projects/${source.project}`)
        const collectionId = await workbench(`/api/orgs/${source.org}/projects/${projectId.data.id}/collections/${source.collection}`)
        const sourceId = await workbench(`/api/orgs/${source.org}/collections/${collectionId.data.id}/sources/${source.slug}`)
        source.id = sourceId.data.id;

    };

    getSlugsFormUrl = async (source) => {
        source.org = source.url.match(/(\/orgs\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
        source.project = source.url.match(/(\/projects\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
        source.collection = source.url.match(/(\/collections\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
        source.slug = source.url.match(/(\/sources\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
        if (source.url.includes('snapshots')) source.snapshotId = source.url.match(/(\/snapshots\/)([^/]+)/g)[0].match(/[^/]+/g)[1]
    }

    getParmas = async (source) => {
        const extractor = await workbench.get(`/api/orgs/${source.org}/sources/${source.id}`);
        source.parameters = extractor.data.parameters
        source.input_name = extractor.data.parameters.input_name;
        source.country = extractor.data.parameters.country;
    }
}

module.exports = WorkbenchSource