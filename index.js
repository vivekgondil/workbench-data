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

const getData = async ({ flowId, name, project, customer }) => {
  try {
    let data = [];
    const flowData = await authAxios.get(
      `/api/orgs/ascential/flows/${flowId}?include=project%2Ceditor`
    );
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
    const pushObj = (snapshotsData) => {
      snapshotsData.data.items.forEach((ele) => {
        data.push({
          customer,
          project,
          flow: name,
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

    let curs = "";
    do {
      snapshotsData = await authAxios.get(
        `/api/orgs/ascential/deliveries/${requiredDelivery[0].id}/snapshots?limit=1000&sort=addedAt&sortDirection=DESC&include=Source.Collection.Project%2CimportStatus%2Ceditor%2CassignedUser%2Cparent&filter=parentId%7C%7Cnull&cursor=${curs}`
      );
      curs = snapshotsData.data.metadata.cursor;
      pushObj(snapshotsData);
    } while (curs);
    // console.log("Done for flow: ", name);
    return data;
  } catch (error) {
    console.log("Error for flow: ", name);
    return [];
  }
};

const main = async (projectId) => {
  console.log("Pls wait while we extract data");

  //----------Get FlowIds---------

  let flows = await authAxios.get(
    `/api/orgs/ascential/projects/${projectId}/flows?sort=name&sortDirection=ASC&limit=1000&include=editor`
  );
  flows = flows.data.items.filter(
    (ele) =>
      !(
        ele.name.includes("erun") ||
        ele.name.includes("AdHoc") ||
        ele.name.includes("ReRun") ||
        ele.name.includes("eprecated")
      ) && ele.name.includes("roduction")
  );

  //----------get data-----------
  let records = [];
  let promises = [];
  for (let value of flows) {
    promises.push(
      getData({
        flowId: value.id,
        name: value.name,
        project: `digital_shelf`,
        customer: `ascential`,
      })
    );
  }

  let response = await Promise.all(promises);

  for (row of response) for (e of row) records.push(e);

  //---------Write Data to JSON ---------------
  let data = JSON.stringify({ records }, null, 2);

  fs.writeFile("feed_data.json", data, (err) => {
    if (err) throw err;

    console.log("Data written to file");
  });

  //   let records = await getData("e93afc81-c506-459f-a6f8-c37c85376582");
  //   let records = await getData("3e12e84f-db07-4b66-8991-5e5cf93be996");
  // getData('e93afc81-c506-459f-a6f8-c37c85376582');
};
main("4b6a1cee-f110-4245-8201-f00b7c084577");
