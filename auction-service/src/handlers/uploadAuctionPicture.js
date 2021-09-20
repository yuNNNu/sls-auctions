import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import createError from "http-errors";
import validator from "@middy/validator";
import { getAuctionById } from "./getAuction";
import { uploadPictureToS3 } from "../lib/uploadPictureToS3";
import { setUrlPictureToAnAuction } from "../lib/setUrlPictureToAnAuction";
import uploadAuctionPictureSchema from "../lib/schemas/uploadAuctionPictureSchema";

const cors = require("@middy/http-cors");

export async function uploadAuctionPicture(event) {
  const { id } = event.pathParameters;
  const { email } = event.requestContext.authorizer;
  const auction = await getAuctionById(id);

  if (auction.seller !== email) {
    throw new createError.Forbidden(`You're not the seller of this auction!`);
  }
  const base64 = event.body.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  let updatedAuction;
  try {
    const pictureUrl = await uploadPictureToS3(auction.id + ".jpg", buffer);
    updatedAuction = await setUrlPictureToAnAuction(id, pictureUrl);
  } catch (err) {
    throw new createError.InternalServerError(err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = middy(uploadAuctionPicture)
  .use(httpErrorHandler())
  .use(
    validator({
      inputSchema: uploadAuctionPictureSchema,
      ajvOptions: {
        strict: false,
      },
    })
  )
  .use(cors());
