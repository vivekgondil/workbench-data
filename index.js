require(`dotenv`).config();
const axios = require(`axios`);
const parser = require("cron-parser");
const fs = require("fs");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const sheetDetails = {
  sheetId: "1q6-K9bkO8S__GwDZG4lF5__nmn2fQNTLDtNDdNd-7Cw",
  index: 0,
};
const getSheetWithIndex = async ({ sheetId, index }) => {
  const creds = {
    client_email: process.env.client_email,
    private_key: process.env.private_key,
  };
  const doc = new GoogleSpreadsheet(sheetId);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return doc.sheetsByIndex[index];
};
const addRows = async (sheetDetails, objArray) => {
  let sheet = await getSheetWithIndex(sheetDetails);
  await sheet.addRows(objArray);
};
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
          Customer: customer,
          Workbench_Link: `https://workbench.import.io/orgs/${customer}/projects/${ele.source.collection.project.slug}/collections/${ele.source.collection.slug}/sources/${ele.source.slug}/snapshots/${ele.id}`,
          Project: project,
          Flow: name,
          Collection: ele.source.collection.slug,
          Source:
            ele.source.parameters.output_name ||
            ele.source.parameters.input_name,
          Country: ele.source.parameters.country,
          Inputs: ele.inputs,
          Start_time: ele.addedAt
            ? ele.addedAt
                .replaceAll("T", " ")
                .replaceAll("-", "/")
                .replaceAll("Z", "")
            : null,
          Collection_Window: flowData.data.dataHours,
          Usual_Delivery_time: null,
          Stopped_At: ele.stoppedAt
            ? ele.stoppedAt
                .replaceAll("T", " ")
                .replaceAll("-", "/")
                .replaceAll("Z", "")
            : null,
          Chunked: ele.chunked,
          Status: ele.status,
          SnapshotId: ele.id,
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

    // Add delivery time

    try {
      let promises = [];
      data.forEach((snapshot) => {
        // console.log(snapshot.SnapshotId);
        promises.push(
          authAxios.get(
            `/api/orgs/ascential/snapshots/${snapshot.SnapshotId}/pushes`
          )
        );
      });
      let responses = await axios.all(promises);

      try {
        // console.log(responses[0].data);
        responses.forEach((pushes) => {
          if (pushes.data.items[0]) {
            const index = data.findIndex(
              (item) => item.SnapshotId == pushes.data.items[0].snapshotId
            );
            data[index].Usual_Delivery_time = pushes.data.items[0].addedAt
              ? pushes.data.items[0].addedAt
                  .replaceAll("T", " ")
                  .replaceAll("-", "/")
                  .replaceAll("Z", "")
              : null;
            // console.log("Added the delivery time");
          }
        });
      } catch (e) {
        console.log("Error in the delivery time. Error: ", e.message);
      }
    } catch (error) {
      console.error(
        "Error in the getting the snapshot pushes. Error: ",
        error.message
      );
    }

    // console.log("Done for flow: ", name);
    return data;
  } catch (error) {
    console.log("Error for flow: ", name, error.message);
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
  //   let records = await getData("e93afc81-c506-459f-a6f8-c37c85376582");
  //   let records = await getData("3e12e84f-db07-4b66-8991-5e5cf93be996");
  // getData('e93afc81-c506-459f-a6f8-c37c85376582');
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
  // let data = JSON.stringify(records, null, 2);
  // fs.writeFile("feed_data.json", data, (err) => {
  //   if (err) throw err;
  // });
  //-------------END------------------

  //-----------------G-Sheet APIs--------------
  await addRows(sheetDetails, records);
  console.log("Data written to file");
};
main("4b6a1cee-f110-4245-8201-f00b7c084577");
