require(`dotenv`).config();
const axios = require(`axios`);

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

(async()=>{
let a = await authAxios.get(
  `/api/orgs/ascential/snapshots/d8eae69a-1b1d-467a-ba2e-b46537d94cc1/pushes`
);
console.log(a.data.items[0]);
})();