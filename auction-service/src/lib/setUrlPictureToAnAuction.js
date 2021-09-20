const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

export async function setUrlPictureToAnAuction(id, url) {
  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: "set pictureUrl = :pictureUrl",
    ExpressionAttributeValues: {
      ":pictureUrl": url,
    },
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamodb.update(params).promise();
  return result.Attributes;
}
