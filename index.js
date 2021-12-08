require(`dotenv`).config();
const axios = require(`axios`);
const parser = require("cron-parser");
const fs = require("fs");

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

const getData = async (flowId) => {
  let data = [];
  const flowData = await authAxios.get(
    `/api/orgs/ascential/flows/${flowId}?include=project%2Ceditor`
  );
  // console.log(flowData.data.definition.collectionId, flowData.data.closeHours);
  const cronExpression = flowData.data.cron;
  const interval = parser.parseExpression(cronExpression);
  const cronTime = interval
    .next()
    .toString()
    .match(/\d\d:\d\d:\d/g)[0];
  const deliveries = await authAxios.get(
    `/api/orgs/ascential/flows/${flowId}/deliveries?limit=10&sortDirection=DESC&include=flow%2C%20flowdelivery`
  );
  let requiredDelivery = deliveries.data.items.filter(
    (element) =>
      element.status === "CLOSED" && element.addedAt.includes(`T${cronTime}`)
  );
  // console.log(requiredDelivery[0].id);
  let snapshotsData = await authAxios.get(
    `/api/orgs/ascential/deliveries/${requiredDelivery[0].id}/snapshots?limit=1000&sort=addedAt&sortDirection=DESC&include=Source.Collection.Project%2CimportStatus%2Ceditor%2CassignedUser%2Cparent&filter=parentId%7C%7Cnull`
  );
  const pushObj = (snapshotsData) => {
    snapshotsData.data.items.forEach((ele) => {
      data.push({
        source: ele.source.parameters.input_name,
        country: ele.source.parameters.country,
        startTime: ele.addedAt,
        inputsCount: ele.inputs,
        collection: ele.source.collection.slug,
        collectionWindow: flowData.data.closeHours,
        deliveryTime: ele.stoppedAt,
      });
    });
  };
  pushObj(snapshotsData);

  while (snapshotsData.data.metadata.cursor) {
    snapshotsData = await authAxios.get(
      `/api/orgs/ascential/deliveries/${requiredDelivery[0].id}/snapshots?limit=1000&sort=addedAt&sortDirection=DESC&include=Source.Collection.Project%2CimportStatus%2Ceditor%2CassignedUser%2Cparent&filter=parentId%7C%7Cnull&cursor=${snapshotsData.data.metadata.cursor}`
    );
    pushObj(snapshotsData);
  }

  return data;
};

const main = async () => {

    console.log("Pls wait while we extract data");
  //----------get data-----------
  const records = await getData("3e12e84f-db07-4b66-8991-5e5cf93be996");
  // console.log(records);
  // getData('e93afc81-c506-459f-a6f8-c37c85376582');

  //---------Write Data to JSON ---------------
  let data = JSON.stringify({ records }, null, 2);

  fs.writeFile("feed_data.json", data, (err) => {
    if (err) throw err;

    console.log("Data written to file");
  });
};
main();
