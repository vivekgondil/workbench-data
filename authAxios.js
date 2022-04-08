require(`dotenv`).config();
const axios = require(`axios`);
const workbench = axios.create({
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

const store = axios.create({
    baseURL: "https://store.import.io",
    headers: {
        'Content-Type': 'text/plain',
        Host: "store.import.io",
        Authorization: `UserToken ${process.env.USERTOKEN}`,
    },
    params: {
        _apikey: process.env.APIKEY,
    },
});

module.exports = { workbench, store };