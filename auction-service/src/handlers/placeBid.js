import commonMiddleware from "../lib/commonMiddleware";
import { getAuctionById } from "./getAuction";
import placeBidSchema from "../lib/schemas/placeBidSchema";
/////////
const AWS = require("aws-sdk");
const createError = require("http-errors");
const validator = require("@middy/validator");
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);

  if (auction.status !== "OPEN") {
    throw new createError.Forbidden(`You cannot bid on closed auctions!`);
  }

  if (amount <= auction.highestBid.amount) {
    throw new createError.Forbidden(
      `Your bid must be higher than ${auction.highestBid.amount}`
    );
  }

  if (auction.highestBid.bidder === email) {
    throw new createError.Forbidden(
      `You can't bid again if you are the last bidder!`
    );
  }

  if (auction.seller === email) {
    throw new createError.Forbidden(`The seller cannot bid in his own auction`);
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression:
      "set highestBid.amount = :amount, highestBid.bidder = :bidder",
    ExpressionAttributeValues: {
      ":amount": amount,
      ":bidder": email,
    },
    ReturnValues: "ALL_NEW",
  };

  let updatedAuction;

  try {
    const result = await dynamodb.update(params).promise();
    updatedAuction = result.Attributes;
  } catch (err) {
    console.log(err);
    throw new createError.InternalServerError(err);
  }

  return {
    statusCode: 201,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = commonMiddleware(placeBid).use(
  validator({
    inputSchema: placeBidSchema,
    ajvOptions: {
      strict: false,
    },
  })
);
