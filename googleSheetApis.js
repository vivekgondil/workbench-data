// Google sheet npm package
require(`dotenv`).config();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const sheetDetails = {
  sheetId: "1q6-K9bkO8S__GwDZG4lF5__nmn2fQNTLDtNDdNd-7Cw",
  index: 1,
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
addRows(sheetDetails, [{ Customer: "ascential" }]);

const getRow = async (sheetDetails) => {
  // Index of the sheet
  let sheet = await getSheetWithIndex(sheetDetails);
  let rows = await sheet.getRows();
  console.log(rows);
};
// getRow(sheetDetails);

const updateRow = async (sheetDetails, keyValue, oldValue, newValue) => {
  let sheet = getSheetWithIndex(sheetDetails);
  let rows = await sheet.getRows();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row[keyValue] === oldValue) {
      rows[index][keyValue] = newValue;
      await rows[index].save();
      break;
    }
  }
};
// updateRow(sheetDetails, 'email', 'email@gmail.com', 'ramesh@ramesh.com')

const deleteRow = async (sheetDetails, keyValue, thisValue) => {
  let sheet = await getSheetWithIndex(sheetDetails);
  let rows = await sheet.getRows();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row[keyValue] === thisValue) {
      await rows[index].delete();
      break;
    }
  }
};
// deleteRow(sheetDetails, "Project", "digital_shelf");
